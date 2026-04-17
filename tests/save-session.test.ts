import { describe, expect, test } from 'bun:test'
import { post, json } from './helpers.ts'

describe('save-session', () => {
  test('returns ok for valid session', async () => {
    const res = await post('/api/save-session', {
      session_id: crypto.randomUUID(),
      referrer: 'https://google.com',
      utm_source: 'twitter',
    })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('returns 400 when session_id is missing', async () => {
    const res = await post('/api/save-session', { referrer: 'test' })
    expect(res.status).toBe(400)
  })

  test('has CORS headers', async () => {
    const res = await post('/api/save-session', {
      session_id: crypto.randomUUID(),
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })
})
