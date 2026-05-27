import { createHmac } from 'node:crypto'
import { Webhook } from 'svix'
import { app } from '../api/index.js'

/**
 * POST JSON to the Hono app and return the Response.
 *
 * Pass an already-stringified body as `rawBody` to keep the bytes byte-identical
 * for webhook signature verification (avoids re-serialization drift).
 */
export function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  rawBody?: string,
): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:8888',
      ...headers,
    },
    body: rawBody ?? JSON.stringify(body),
  })
}

/** Build a `Calendly-Webhook-Signature` header for the given raw body. */
export function signCalendlyBody(
  rawBody: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex')
  return `t=${timestamp},v1=${digest}`
}

/**
 * Build the svix headers Resend uses to sign webhook deliveries.
 * Resend's webhook secret is the raw value from Vercel — svix expects a
 * `whsec_`-prefixed base64 string, which is the on-disk format we use in tests.
 */
export function signResendBody(
  rawBody: string,
  secret: string,
): { 'svix-id': string; 'svix-timestamp': string; 'svix-signature': string } {
  const id = `msg_${crypto.randomUUID()}`
  const timestamp = new Date()
  const signature = new Webhook(secret).sign(id, timestamp, rawBody)
  return {
    'svix-id': id,
    'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
    'svix-signature': signature,
  }
}

/**
 * Temporarily mutate `process.env` for the duration of an async callback.
 * Setting a key to `undefined` deletes it; restoration correctly distinguishes
 * "was unset" from "was set to the string 'undefined'".
 */
export async function withEnv<T>(
  patch: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const prev: Record<string, string | undefined> = {}
  for (const key of Object.keys(patch)) {
    prev[key] = process.env[key]
    if (patch[key] === undefined) delete process.env[key]
    else process.env[key] = patch[key]
  }
  try {
    return await fn()
  } finally {
    for (const key of Object.keys(patch)) {
      if (prev[key] === undefined) delete process.env[key]
      else process.env[key] = prev[key]
    }
  }
}

/** Build a POST Request with JSON body (for direct handler testing). */
export function postRequest(body: unknown): Request {
  return new Request('http://localhost:8888/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Parse JSON body from a Response. */
export async function json(res: Response): Promise<unknown> {
  return res.json()
}

/** Create a session in the DB and return the session_id. */
export async function createTestSession(): Promise<string> {
  const sessionId = crypto.randomUUID()
  await post('/api/save-session', { session_id: sessionId })
  return sessionId
}

/** Create a session + valuation and return both IDs. */
export async function createTestValuation(): Promise<{ session_id: string; valuation_id: string }> {
  const session_id = await createTestSession()
  const res = await post('/api/save-step1', {
    session_id,
    business_name: 'Test Corp',
    industry: 'other',
  })
  const body = await res.json() as { valuation_id: string }
  return { session_id, valuation_id: body.valuation_id }
}
