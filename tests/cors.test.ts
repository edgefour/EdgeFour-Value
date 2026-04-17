import { describe, expect, test } from 'bun:test'
import { handleCors, jsonResponse, noContentResponse } from '../api/_lib/cors'
import { optionsRequest } from './helpers'

describe('handleCors', () => {
  test('returns 204 for OPTIONS request', () => {
    const res = handleCors(optionsRequest())
    expect(res).not.toBeNull()
    expect(res!.status).toBe(204)
    expect(res!.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:8888',
    )
    expect(res!.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  test('returns null for non-OPTIONS request', () => {
    const req = new Request('http://localhost:8888/test', { method: 'POST' })
    expect(handleCors(req)).toBeNull()
  })
})

describe('jsonResponse', () => {
  test('returns JSON with CORS headers', async () => {
    const res = jsonResponse({ ok: true })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:8888',
    )
    expect(await res.json()).toEqual({ ok: true })
  })

  test('supports custom status code', () => {
    const res = jsonResponse({ error: 'bad' }, 400)
    expect(res.status).toBe(400)
  })
})

describe('noContentResponse', () => {
  test('returns 204 with CORS headers', () => {
    const res = noContentResponse()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:8888',
    )
  })
})
