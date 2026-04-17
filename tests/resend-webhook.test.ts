import { describe, expect, test } from 'vitest'
import { post, json } from './helpers.js'

describe('resend-webhook', () => {
  test('handles email.delivered event', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.delivered', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('handles email.opened event', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.opened', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
  })

  test('handles email.bounced event', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.bounced', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
  })

  test('returns 400 when email_id is missing', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.delivered', data: {} })
    expect(res.status).toBe(400)
  })

  test('handles unknown event type gracefully', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.unknown', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
  })
})
