import { describe, expect, test } from 'bun:test'
import { post, json } from './helpers.ts'

const validBody = {
  session_id: crypto.randomUUID(),
  valuation_id: crypto.randomUUID(),
  lead_email: 'test@example.com',
  quiz_timeline: '6-12 months',
  quiz_advisory_source: 'Referral',
  email_content: {
    business_name: 'Acme Corp',
    valuation_low: 1_240_000,
    valuation_base: 1_551_250,
    valuation_high: 1_862_500,
    value_score: 68,
    trajectory_top_factors: [{ name: 'Owner Dependency', delta: 155_000 }],
    vip_recommendations: [{ title: 'Reduce Owner Dependency', body: 'Delegate more.' }],
  },
}

describe('submit-quiz', () => {
  test('returns ok for valid input', async () => {
    const res = await post('/api/submit-quiz', validBody)
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('returns 400 for invalid email', async () => {
    const res = await post('/api/submit-quiz', { ...validBody, lead_email: 'not-an-email' })
    expect(res.status).toBe(400)
    const body = (await json(res)) as { error: string }
    expect(body.error).toContain('email')
  })

  test('returns 400 when lead_email is missing', async () => {
    const { lead_email, ...rest } = validBody
    const res = await post('/api/submit-quiz', rest)
    expect(res.status).toBe(400)
  })

  test('returns 400 when session_id is missing', async () => {
    const { session_id, ...rest } = validBody
    const res = await post('/api/submit-quiz', rest)
    expect(res.status).toBe(400)
  })
})
