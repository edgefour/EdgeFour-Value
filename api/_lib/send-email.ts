/**
 * Email sending module — not a route.
 * Imported by submit-quiz.ts.
 */

import { sendEmail as resendSend } from './resend.ts'
import { insertEmailRecord } from './db.ts'

export type SendReportParams = {
  session_id: string
  valuation_id: string
  recipient_email: string
  business_name: string
  html: string
}

export async function sendReport(params: SendReportParams) {
  const subject = `Your EdgeFour Business Valuation — ${params.business_name}`

  try {
    const { resend_id } = await resendSend({
      to: params.recipient_email,
      subject,
      html: params.html,
      reply_to: 'info@edgefourllc.com',
    })

    await insertEmailRecord({
      session_id: params.session_id,
      valuation_id: params.valuation_id,
      recipient_email: params.recipient_email,
      subject,
      resend_id,
      status: 'sent',
    })

    return { resend_id }
  } catch (err) {
    await insertEmailRecord({
      session_id: params.session_id,
      valuation_id: params.valuation_id,
      recipient_email: params.recipient_email,
      subject,
      resend_id: null,
      status: 'failed',
      error_message: String(err),
    })
    throw err
  }
}
