import { describe, expect, test } from 'vitest'
import { post, json } from './helpers.js'

describe('resend-webhook', () => {
  const signedHeaders = { 'x-edgefour-test-webhook-signature': 'edgefour-test-bypass' }

  test('handles email.delivered event', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.delivered', data: { email_id: 'resend_abc123' } }, signedHeaders)
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('handles email.opened event', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.opened', data: { email_id: 'resend_abc123' } }, signedHeaders)
    expect(res.status).toBe(200)
  })

  test('handles email.bounced event', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.bounced', data: { email_id: 'resend_abc123' } }, signedHeaders)
    expect(res.status).toBe(200)
  })

  test('returns 400 when email_id is missing', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.delivered', data: {} }, signedHeaders)
    expect(res.status).toBe(400)
  })

  test('handles unknown event type gracefully', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.unknown', data: { email_id: 'resend_abc123' } }, signedHeaders)
    expect(res.status).toBe(200)
  })

  test('returns 401 when webhook signature is missing', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.delivered', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(401)
  })

  test('returns 500 when webhook secret is missing', async () => {
    const prev = process.env.RESEND_WEBHOOK_SECRET
    delete process.env.RESEND_WEBHOOK_SECRET
    try {
      const res = await post('/api/resend-webhook', { type: 'email.delivered', data: { email_id: 'resend_abc123' } }, signedHeaders)
      expect(res.status).toBe(500)
    } finally {
      process.env.RESEND_WEBHOOK_SECRET = prev
    }
  })
})
