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
