/** Build a POST Request with JSON body, like the dev server would pass to handlers. */
export function postRequest(body: unknown): Request {
  return new Request('http://localhost:8888/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Build an OPTIONS Request for CORS preflight testing. */
export function optionsRequest(): Request {
  return new Request('http://localhost:8888/test', { method: 'OPTIONS' })
}

/** Parse JSON body from a Response. */
export async function json(res: Response): Promise<unknown> {
  return res.json()
}

/** Create a session in the DB and return the session_id. */
export async function createTestSession(): Promise<string> {
  const { POST } = await import('../api/save-session.ts')
  const sessionId = crypto.randomUUID()
  await POST(postRequest({ session_id: sessionId }))
  return sessionId
}

/** Create a session + valuation and return both IDs. */
export async function createTestValuation(): Promise<{ session_id: string; valuation_id: string }> {
  const session_id = await createTestSession()
  const { POST } = await import('../api/save-step1.ts')
  const res = await POST(postRequest({
    session_id,
    business_name: 'Test Corp',
    industry: 'other',
  }))
  const body = await res.json() as { valuation_id: string }
  return { session_id, valuation_id: body.valuation_id }
}
