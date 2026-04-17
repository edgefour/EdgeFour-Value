import { Resend } from 'resend'

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  reply_to?: string
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: 'Edge Four <reports@edgefourllc.com>',
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.reply_to,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return { resend_id: data!.id }
}
