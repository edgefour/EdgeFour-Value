import { handleCors, jsonResponse } from './_lib/cors.ts'
import { updateValuation, updateSession, logError } from './_lib/db.ts'
import { validateEmail } from './_lib/validate.ts'
import { sendReport } from './send-email.ts'
import type { SubmitQuizRequest } from '../shared/types.ts'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as SubmitQuizRequest

    if (!body.session_id || !body.valuation_id || !body.lead_email) {
      return jsonResponse(
        { error: 'session_id, valuation_id, and lead_email are required' },
        400,
      )
    }

    const emailCheck = validateEmail(body.lead_email)
    if (!emailCheck.valid) {
      return jsonResponse({ error: emailCheck.error }, 400)
    }

    // Save quiz answers
    await updateValuation(body.valuation_id, {
      lead_email: body.lead_email,
      quiz_timeline: body.quiz_timeline,
      quiz_advisory_source: body.quiz_advisory_source,
    })

    await updateSession(body.session_id, {
      furthest_step: 'quiz',
      completed: true,
    })

    // Send email (silent fail — don't block the user)
    try {
      // TODO: Build real HTML template from email_content
      const html = `<p>Stub email for ${body.email_content.business_name}</p>`

      await sendReport({
        session_id: body.session_id,
        valuation_id: body.valuation_id,
        recipient_email: body.lead_email,
        business_name: body.email_content.business_name,
        html,
      })

      await updateValuation(body.valuation_id, {
        report_sent_at: new Date().toISOString(),
      })
    } catch (err) {
      await logError(body.session_id, 'submit-quiz:email', String(err))
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    await logError(null, 'submit-quiz', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
