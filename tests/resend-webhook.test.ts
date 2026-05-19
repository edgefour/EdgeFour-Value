import { describe, expect, test } from 'vitest'
import { post, json, signResendBody, withEnv } from './helpers.js'

/** POST a JSON body to /api/resend-webhook signed with the env secret. */
async function postSigned(
  body: unknown,
  { secret }: { secret?: string } = {},
): Promise<Response> {
  const rawBody = JSON.stringify(body)
  const signingSecret = secret ?? process.env.RESEND_WEBHOOK_SECRET ?? 'test'
  const headers = signResendBody(rawBody, signingSecret)
  return post('/api/resend-webhook', body, headers, rawBody)
}

describe('resend-webhook', () => {
  test('handles email.delivered event', async () => {
    const res = await postSigned({ type: 'email.delivered', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('handles email.opened event', async () => {
    const res = await postSigned({ type: 'email.opened', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
  })

  test('handles email.bounced event', async () => {
    const res = await postSigned({ type: 'email.bounced', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
  })

  test('returns 400 when email_id is missing', async () => {
    const res = await postSigned({ type: 'email.delivered', data: {} })
    expect(res.status).toBe(400)
  })

  test('handles unknown event type gracefully', async () => {
    const res = await postSigned({ type: 'email.unknown', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(200)
  })

  test('returns 401 when webhook signature is missing', async () => {
    const res = await post('/api/resend-webhook', { type: 'email.delivered', data: { email_id: 'resend_abc123' } })
    expect(res.status).toBe(401)
  })

  test('returns 401 when signature is generated with the wrong secret', async () => {
    // svix decodes the secret as base64, so use a valid base64 string that
    // differs from the env value ('test').
    const res = await postSigned(
      { type: 'email.delivered', data: { email_id: 'resend_abc123' } },
      { secret: 'd3Jvbmc=' },
    )
    expect(res.status).toBe(401)
  })

  test('returns 401 when the body is tampered with after signing', async () => {
    const body = { type: 'email.delivered', data: { email_id: 'resend_abc123' } }
    const rawBody = JSON.stringify(body)
    const headers = signResendBody(rawBody, process.env.RESEND_WEBHOOK_SECRET ?? 'test')
    const tamperedBody = rawBody.replace('resend_abc123', 'resend_xyz999')
    const res = await post('/api/resend-webhook', undefined, headers, tamperedBody)
    expect(res.status).toBe(401)
  })

  test('returns 500 when webhook secret is missing', async () => {
    await withEnv({ RESEND_WEBHOOK_SECRET: undefined }, async () => {
      const res = await postSigned({ type: 'email.delivered', data: { email_id: 'resend_abc123' } })
      expect(res.status).toBe(500)
    })
  })
})
