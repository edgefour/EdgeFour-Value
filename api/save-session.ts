import { handleCors, jsonResponse } from './_lib/cors.ts'
import { insertSession, logError } from './_lib/db.ts'
import type { SaveSessionRequest } from '../shared/types.ts'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as SaveSessionRequest

    if (!body.session_id) {
      return jsonResponse({ error: 'session_id is required' }, 400)
    }

    await insertSession({
      session_id: body.session_id,
      referrer: body.referrer ?? null,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      user_agent: body.user_agent ?? null,
    })

    return jsonResponse({ ok: true })
  } catch (err) {
    await logError(null, 'save-session', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
