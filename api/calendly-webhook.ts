import { handleCors, jsonResponse } from './_lib/cors'
import { insertBooking, lookupValuationByEmail, logError } from './_lib/db'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // TODO: Verify Calendly-Webhook-Signature against CALENDLY_WEBHOOK_SECRET
    // Skipped for stub — will implement when Calendly is wired up

    const body = (await req.json()) as {
      event: string
      payload: {
        email: string
        name?: string
        event_type: { uuid: string }
        scheduled_event: {
          start_time: string
          end_time: string
        }
      }
    }

    if (body.event !== 'invitee.created') {
      return jsonResponse({ ok: true })
    }

    const { email, name } = body.payload
    const calendly_event_id = body.payload.event_type.uuid

    // Attempt to match to an existing valuation
    const valuation = await lookupValuationByEmail(email)

    await insertBooking({
      session_id: valuation?.session_id ?? null,
      valuation_id: valuation?.valuation_id ?? null,
      lead_email: email,
      invitee_name: name ?? null,
      scheduled_start_at: body.payload.scheduled_event.start_time,
      scheduled_end_at: body.payload.scheduled_event.end_time,
      calendly_event_id,
    })

    return jsonResponse({ ok: true })
  } catch (err) {
    await logError(null, 'calendly-webhook', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
