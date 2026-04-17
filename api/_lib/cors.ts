const allowedOrigin = () =>
  process.env.ALLOWED_ORIGIN ?? 'http://localhost:8888'

export const corsHeaders = (): Record<string, string> => ({
  'Access-Control-Allow-Origin': allowedOrigin(),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
})

/** Return a 204 preflight response, or null if this isn't an OPTIONS request. */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return null
}

/** Wrap a body + status into a JSON Response with CORS headers. */
export function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

/** 204 No Content with CORS headers. */
export function noContentResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() })
}
