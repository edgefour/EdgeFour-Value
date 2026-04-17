import { handleCors, noContentResponse, jsonResponse } from './_lib/cors.ts'
import { insertFormEvent, updateSession, logError } from './_lib/db.ts'
import type { TrackEventRequest } from '../shared/types.ts'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as TrackEventRequest

    if (!body.session_id || !body.event_type || !body.step) {
      return jsonResponse(
        { error: 'session_id, event_type, and step are required' },
        400,
      )
    }

    await insertFormEvent({
      session_id: body.session_id,
      event_type: body.event_type,
      field_name: body.field_name ?? null,
      old_value: body.old_value ?? null,
      new_value: body.new_value ?? null,
      step: body.step,
      duration_seconds: body.duration_seconds ?? null,
    })

    await updateSession(body.session_id, { last_seen_at: new Date().toISOString() })

    return noContentResponse()
  } catch (err) {
    await logError(null, 'track-event', String(err))
    // Fire-and-forget: still return 204
    return noContentResponse()
  }
}
