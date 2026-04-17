import { describe, expect, test } from 'bun:test'
import { POST } from '../api/resend-webhook.ts'
import { postRequest, json } from './helpers.ts'

describe('resend-webhook', () => {
  test('handles email.delivered event', async () => {
    const res = await POST(
      postRequest({
        type: 'email.delivered',
        data: { email_id: 'resend_abc123' },
      }),
    )
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('handles email.opened event', async () => {
    const res = await POST(
      postRequest({
        type: 'email.opened',
        data: { email_id: 'resend_abc123' },
      }),
    )
    expect(res.status).toBe(200)
  })

  test('handles email.bounced event', async () => {
    const res = await POST(
      postRequest({
        type: 'email.bounced',
        data: { email_id: 'resend_abc123' },
      }),
    )
    expect(res.status).toBe(200)
  })

  test('returns 400 when email_id is missing', async () => {
    const res = await POST(
      postRequest({ type: 'email.delivered', data: {} }),
    )
    expect(res.status).toBe(400)
  })

  test('handles unknown event type gracefully', async () => {
    const res = await POST(
      postRequest({
        type: 'email.unknown',
        data: { email_id: 'resend_abc123' },
      }),
    )
    expect(res.status).toBe(200)
  })
})
