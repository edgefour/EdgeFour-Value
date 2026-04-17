import { handleCors, jsonResponse } from './_lib/cors.ts'
import { updateEmailRecord, logError } from './_lib/db.ts'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // TODO: Verify Svix-Signature header against RESEND_WEBHOOK_SECRET
    // Skipped for stub — will implement when Resend is wired up

    const body = (await req.json()) as {
      type: string
      data: { email_id: string }
    }

    const resend_id = body.data?.email_id
    if (!resend_id) {
      return jsonResponse({ error: 'Missing email_id in payload' }, 400)
    }

    const now = new Date().toISOString()

    switch (body.type) {
      case 'email.delivered':
        await updateEmailRecord(resend_id, { delivered_at: now })
        break
      case 'email.opened':
        await updateEmailRecord(resend_id, { opened_at: now })
        break
      case 'email.bounced':
        await updateEmailRecord(resend_id, { bounced_at: now })
        break
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    await logError(null, 'resend-webhook', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
