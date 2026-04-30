import { describe, expect, test } from 'vitest'
import { post, json, createTestSession, createTestValuation } from './helpers.js'
import { db } from '../src/db/index.js'
import { valuations } from '../src/db/schema/index.js'
import { eq } from 'drizzle-orm'

const sliders = { growth: 4, owner_dep: 2, recurring: 3, cust_conc: 3, systems: 2, fin_records: 4 }

const inputBody = (ids: { session_id: string; valuation_id: string }) => ({
  ...ids,
  industry: 'mgmt_consulting',
  years_in_business: 8,
  input_mode: 'know',
  revenue: 2_000_000,
  ebitda: 400_000,
  owner_salary: 150_000,
  market_salary: 120_000,
  addbacks: 50_000,
  sliders,
})

describe('save-valuation', () => {
  test('returns valuation_id and persists every server-derived field', async () => {
    const ids = await createTestValuation()
    const res = await post('/api/save-valuation', inputBody(ids))
    expect(res.status).toBe(200)
    const body = (await json(res)) as { valuation_id: string }
    expect(body.valuation_id).toBe(ids.valuation_id)

    // Read the row back: every derived column the email/analytics depend on
    // must be populated. This guards against a future refactor that drops
    // server-side calculation back onto the client.
    const row = (await db.select().from(valuations).where(eq(valuations.id, ids.valuation_id)).limit(1))[0]!
    expect(row.adjEbitda).not.toBeNull()
    expect(row.estimatedMultiple).not.toBeNull()
    expect(row.valuationBase).not.toBeNull()
    expect(row.valueScore).not.toBeNull()
    expect(row.scoreBand).toBeTypeOf('string')
    expect(Array.isArray(row.goodFactors)).toBe(true)
    expect(Array.isArray(row.badFactors)).toBe(true)
    expect(Array.isArray(row.vipRecommendations)).toBe(true)
    expect(Array.isArray(row.trajectoryTopFactors)).toBe(true)
    expect(row.trajectoryUpliftAmount).not.toBeNull()
    expect(row.trajectoryNewValuationBase).not.toBeNull()
  })

  test('ignores client-supplied derived values (server is authoritative)', async () => {
    const ids = await createTestValuation()
    // A malicious client tries to inject a $999M valuation. Server should
    // recompute from the inputs and discard the spoofed value.
    const res = await post('/api/save-valuation', {
      ...inputBody(ids),
      adj_ebitda: 999_999_999,
      valuation_base: 999_999_999,
      value_score: 100,
    })
    expect(res.status).toBe(200)

    const row = (await db.select().from(valuations).where(eq(valuations.id, ids.valuation_id)).limit(1))[0]!
    expect(Number(row.valuationBase)).toBeLessThan(10_000_000)
    expect(Number(row.adjEbitda)).toBeLessThan(10_000_000)
    expect(row.valueScore).toBeLessThan(100)
  })

  test('returns 400 when session_id is missing', async () => {
    const ids = await createTestValuation()
    const { session_id, ...rest } = inputBody(ids)
    const res = await post('/api/save-valuation', rest)
    expect(res.status).toBe(400)
  })

  test('returns 400 when valuation_id is missing', async () => {
    const ids = await createTestValuation()
    const { valuation_id, ...rest } = inputBody(ids)
    const res = await post('/api/save-valuation', rest)
    expect(res.status).toBe(400)
  })

  test('returns 400 for invalid slider', async () => {
    const ids = await createTestValuation()
    const res = await post('/api/save-valuation', {
      ...inputBody(ids),
      sliders: { ...sliders, growth: 9 },
    })
    expect(res.status).toBe(400)
  })

  test('returns 404 when valuation_id has no row (skipped /save-step1)', async () => {
    // Session exists, but no save-step1 was called, so the valuation row is
    // absent. Previously the UPDATE would silently affect 0 rows and the
    // handler would return 200, which made send-report fail much later
    // with a 404. Now the failure surfaces immediately.
    const session_id = await createTestSession()
    const valuation_id = crypto.randomUUID()
    const res = await post('/api/save-valuation', inputBody({ session_id, valuation_id }))
    expect(res.status).toBe(404)
  })
})
