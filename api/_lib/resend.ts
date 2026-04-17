/**
 * Stubbed Resend email client.
 * Logs the email payload and returns a fake resend_id.
 * Replace with real Resend SDK calls when ready.
 */

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  reply_to?: string
}

export async function sendEmail(params: SendEmailParams) {
  const resend_id = `resend_mock_${crypto.randomUUID().slice(0, 8)}`
  console.log('[resend:sendEmail]', {
    resend_id,
    to: params.to,
    subject: params.subject,
    html_length: params.html.length,
  })
  return { resend_id }
}
