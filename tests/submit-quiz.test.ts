import { describe, expect, test } from 'vitest'
import { post, json, createTestValuation } from './helpers.js'

const validBody = async () => {
  const ids = await createTestValuation()
  return {
    ...ids,
    lead_email: 'test@example.com',
    quiz_timeline: '6-12 months',
    quiz_advisory_source: 'Referral',
  }
}

describe('submit-quiz', () => {
  test('returns ok for valid input (no email_content payload required)', async () => {
    const res = await post('/api/submit-quiz', await validBody())
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('returns 400 for invalid email', async () => {
    const body = { ...(await validBody()), lead_email: 'not-an-email' }
    const res = await post('/api/submit-quiz', body)
    expect(res.status).toBe(400)
    const out = (await json(res)) as { error: string }
    expect(out.error).toContain('email')
  })

  test('returns 400 when lead_email is missing', async () => {
    const { lead_email, ...rest } = await validBody()
    const res = await post('/api/submit-quiz', rest)
    expect(res.status).toBe(400)
  })

  test('returns 400 when session_id is missing', async () => {
    const { session_id, ...rest } = await validBody()
    const res = await post('/api/submit-quiz', rest)
    expect(res.status).toBe(400)
  })
})
