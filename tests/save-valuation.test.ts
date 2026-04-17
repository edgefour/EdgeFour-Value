import { describe, expect, test } from 'bun:test'
import { post, json } from './helpers.ts'

const validBody = {
  session_id: crypto.randomUUID(),
  valuation_id: crypto.randomUUID(),
  input_mode: 'know',
  revenue: 2_000_000,
  ebitda: 400_000,
  owner_salary: 150_000,
  market_salary: 120_000,
  addbacks: 50_000,
  adj_ebitda: 425_000,
  base_multiple: 3.2,
  estimated_multiple: 3.65,
  years_bonus: 0.15,
  revenue_scale_bonus: 0.3,
  valuation_low: 1_240_000,
  valuation_base: 1_551_250,
  valuation_high: 1_862_500,
  value_score: 68,
  sliders: { growth: 4, owner_dep: 2, recurring: 3, cust_conc: 3, systems: 2, fin_records: 4 },
}

describe('save-valuation', () => {
  test('returns valuation_id for valid input', async () => {
    const res = await post('/api/save-valuation', validBody)
    expect(res.status).toBe(200)
    const body = (await json(res)) as { valuation_id: string }
    expect(body.valuation_id).toBe(validBody.valuation_id)
  })

  test('returns 400 when session_id is missing', async () => {
    const { session_id, ...rest } = validBody
    const res = await post('/api/save-valuation', rest)
    expect(res.status).toBe(400)
  })

  test('returns 400 when valuation_id is missing', async () => {
    const { valuation_id, ...rest } = validBody
    const res = await post('/api/save-valuation', rest)
    expect(res.status).toBe(400)
  })
})
