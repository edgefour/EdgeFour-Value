import { app } from '../api/index.js'

/** POST JSON to the Hono app and return the Response. */
export function post(path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:8888',
    },
    body: JSON.stringify(body),
  })
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
