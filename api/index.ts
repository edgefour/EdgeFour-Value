import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateCalculateInput, validateEmail } from './_lib/validate.js'
import { calculate } from './_lib/calculator.js'
import {
  insertSession,
  insertValuation,
  updateValuation,
  updateSession,
  insertFormEvent,
  updateEmailRecord,
  insertBooking,
  getValuationById,
  lookupValuationByEmail,
  logError,
} from './_lib/db.js'
import { sendReport } from './_lib/send-email.js'
import { buildReportEmail } from './_lib/email-template.js'
import type {
  CalculateInput,
  SaveSessionRequest,
  SaveStep1Request,
  SaveValuationRequest,
  SendReportRequest,
  SubmitQuizRequest,
  TrackEventRequest,
} from '../shared/types.js'

const app = new Hono().basePath('/api')

app.use(
  '*',
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:8888',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

// ── save-session ────────────────────────────────────────────────────────────
app.post('/save-session', async (c) => {
  try {
    const body = (await c.req.json()) as SaveSessionRequest

    if (!body.session_id) {
      return c.json({ error: 'session_id is required' }, 400)
    }

    await insertSession({
      session_id: body.session_id,
      referrer: body.referrer ?? null,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      user_agent: body.user_agent ?? null,
    })

    return c.json({ ok: true })
  } catch (err) {
    await logError(null, 'save-session', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ── save-step1 ──────────────────────────────────────────────────────────────
app.post('/save-step1', async (c) => {
  try {
    const body = (await c.req.json()) as SaveStep1Request

    if (!body.session_id || !body.business_name || !body.industry) {
      return c.json(
        { error: 'session_id, business_name, and industry are required' },
        400,
      )
    }

    const { valuation_id } = await insertValuation({
      session_id: body.session_id,
      business_name: body.business_name,
      industry: body.industry,
      city: body.city ?? null,
      state: body.state ?? null,
      years_in_business: body.years_in_business,
      employees: body.employees ?? null,
    })

    await updateSession(body.session_id, { furthest_step: 'financials' })

    return c.json({ valuation_id })
  } catch (err) {
    await logError(null, 'save-step1', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ── calculate ───────────────────────────────────────────────────────────────
app.post('/calculate', async (c) => {
  try {
    const body = (await c.req.json()) as CalculateInput

    const validation = validateCalculateInput(body)
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400)
    }

    const result = calculate(body)
    return c.json(result)
  } catch (err) {
    await logError(null, 'calculate', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ── save-valuation ──────────────────────────────────────────────────────────
// Accepts only the raw inputs (sliders + financials) and re-runs the calculator
// server-side. Persists every derived field so the email and analytics queries
// can read from a single source of truth.
app.post('/save-valuation', async (c) => {
  try {
    const body = (await c.req.json()) as SaveValuationRequest

    if (!body.session_id || !body.valuation_id) {
      return c.json(
        { error: 'session_id and valuation_id are required' },
        400,
      )
    }

    const calcInput: CalculateInput = {
      industry: body.industry,
      years_in_business: body.years_in_business,
      revenue: body.revenue,
      ebitda: body.ebitda,
      earnings: body.earnings,
      interest_expense: body.interest_expense,
      taxes_paid: body.taxes_paid,
      depreciation_amort: body.depreciation_amort,
      input_mode: body.input_mode,
      owner_salary: body.owner_salary,
      market_salary: body.market_salary,
      addbacks: body.addbacks,
      sliders: body.sliders,
    }

    const validation = validateCalculateInput(calcInput)
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400)
    }

    const result = calculate(calcInput)

    await updateValuation(body.valuation_id, {
      input_mode: body.input_mode,
      revenue: body.revenue,
      ebitda: body.ebitda,
      earnings: body.earnings ?? null,
      interest_expense: body.interest_expense ?? null,
      taxes_paid: body.taxes_paid ?? null,
      depreciation_amort: body.depreciation_amort ?? null,
      owner_salary: body.owner_salary,
      market_salary: body.market_salary,
      addbacks: body.addbacks,
      adj_ebitda: result.adj_ebitda,
      base_multiple: result.base_multiple,
      estimated_multiple: result.estimated_multiple,
      years_bonus: result.years_bonus,
      revenue_scale_bonus: result.revenue_scale_bonus,
      valuation_low: result.valuation_low,
      valuation_base: result.valuation_base,
      valuation_high: result.valuation_high,
      value_score: result.value_score,
      score_band: result.score_band,
      trajectory_uplift_amount: result.trajectory.uplift_amount,
      trajectory_new_valuation_low: result.trajectory.new_valuation_low,
      trajectory_new_valuation_base: result.trajectory.new_valuation_base,
      trajectory_new_valuation_high: result.trajectory.new_valuation_high,
      trajectory_top_factors: result.trajectory.top_factors,
      good_factors: result.good_factors,
      bad_factors: result.bad_factors,
      vip_recommendations: result.vip_recommendations,
      sliders: body.sliders,
      calculated_at: new Date().toISOString(),
    })

    await updateSession(body.session_id, { furthest_step: 'results' })

    return c.json({ valuation_id: body.valuation_id })
  } catch (err) {
    await logError(null, 'save-valuation', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ── submit-quiz ─────────────────────────────────────────────────────────────
app.post('/submit-quiz', async (c) => {
  try {
    const body = (await c.req.json()) as SubmitQuizRequest

    if (!body.session_id || !body.valuation_id || !body.lead_email) {
      return c.json(
        { error: 'session_id, valuation_id, and lead_email are required' },
        400,
      )
    }

    const emailCheck = validateEmail(body.lead_email)
    if (!emailCheck.valid) {
      return c.json({ error: emailCheck.error }, 400)
    }

    await updateValuation(body.valuation_id, {
      lead_email: body.lead_email,
      quiz_timeline: body.quiz_timeline,
      quiz_advisory_source: body.quiz_advisory_source,
    })

    await updateSession(body.session_id, {
      furthest_step: 'quiz',
      completed: true,
    })

    return c.json({ ok: true })
  } catch (err) {
    await logError(null, 'submit-quiz', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ── send-report ────────────────────────────────────────────────────────────
// Builds the email entirely from the persisted valuation row. The client only
// supplies identifiers + recipient — every dollar amount and bullet is derived
// from the saved calculator result, so the email cannot be tampered with by a
// malicious client and stays consistent with what's queryable for analytics.
app.post('/send-report', async (c) => {
  try {
    const body = (await c.req.json()) as SendReportRequest

    if (!body.session_id || !body.valuation_id || !body.recipient_email) {
      return c.json(
        { error: 'session_id, valuation_id, and recipient_email are required' },
        400,
      )
    }

    const emailCheck = validateEmail(body.recipient_email)
    if (!emailCheck.valid) {
      return c.json({ error: emailCheck.error }, 400)
    }

    const v = await getValuationById(body.valuation_id)
    if (!v) {
      return c.json({ error: 'valuation not found' }, 404)
    }

    // Every field below must be populated before we can build the email.
    // We refuse to render with placeholders so the recipient never sees
    // "Your Business" or a zeroed-out valuation slipping through silently.
    const required = {
      businessName: v.businessName,
      industry: v.industry,
      valuationLow: v.valuationLow,
      valuationBase: v.valuationBase,
      valuationHigh: v.valuationHigh,
      valueScore: v.valueScore,
      scoreBand: v.scoreBand,
      adjEbitda: v.adjEbitda,
      estimatedMultiple: v.estimatedMultiple,
      goodFactors: v.goodFactors,
      badFactors: v.badFactors,
      vipRecommendations: v.vipRecommendations,
      trajectoryTopFactors: v.trajectoryTopFactors,
      trajectoryUpliftAmount: v.trajectoryUpliftAmount,
      trajectoryNewValuationBase: v.trajectoryNewValuationBase,
    }
    const missing = Object.entries(required).filter(([, val]) => val == null).map(([k]) => k)
    if (missing.length > 0) {
      await logError(body.session_id, 'send-report', `valuation ${body.valuation_id} missing fields: ${missing.join(', ')}`)
      return c.json({ error: `valuation is incomplete; missing: ${missing.join(', ')}` }, 422)
    }

    const trajectoryTopFactors = v.trajectoryTopFactors as Array<{ name: string; delta: number }>

    const html = buildReportEmail({
      business_name: v.businessName!,
      industry: v.industry!,
      valuation_low: Number(v.valuationLow),
      valuation_base: Number(v.valuationBase),
      valuation_high: Number(v.valuationHigh),
      value_score: v.valueScore!,
      score_band: v.scoreBand!,
      adj_ebitda: Number(v.adjEbitda),
      estimated_multiple: Number(v.estimatedMultiple),
      good_factors: v.goodFactors as Array<{ name: string; description: string }>,
      bad_factors: v.badFactors as Array<{ name: string; description: string }>,
      trajectory_top_factors: trajectoryTopFactors,
      trajectory_uplift: trajectoryTopFactors.length > 0
        ? {
            uplift_amount: Number(v.trajectoryUpliftAmount),
            new_valuation_base: Number(v.trajectoryNewValuationBase),
          }
        : undefined,
      vip_recommendations: v.vipRecommendations as Array<{ title: string; body: string }>,
    })

    await sendReport({
      session_id: body.session_id,
      valuation_id: body.valuation_id,
      recipient_email: body.recipient_email,
      business_name: v.businessName!,
      html,
    })

    await updateValuation(body.valuation_id, {
      report_sent_at: new Date().toISOString(),
    })

    return c.json({ ok: true })
  } catch (err) {
    await logError(null, 'send-report', String(err))
    return c.json({ error: 'Failed to send report' }, 500)
  }
})

// ── track-event ─────────────────────────────────────────────────────────────
app.post('/track-event', async (c) => {
  try {
    const body = (await c.req.json()) as TrackEventRequest

    if (!body.session_id || !body.event_type || !body.step) {
      return c.json(
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

    return c.body(null, 204)
  } catch (err) {
    await logError(null, 'track-event', String(err))
    // Fire-and-forget: still return 204
    return c.body(null, 204)
  }
})

// ── resend-webhook ──────────────────────────────────────────────────────────
app.post('/resend-webhook', async (c) => {
  try {
    const rawBody = await c.req.text()

    // Verify webhook signature
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      try {
        resend.webhooks.verify({
          payload: rawBody,
          headers: {
            id: c.req.header('svix-id') ?? '',
            timestamp: c.req.header('svix-timestamp') ?? '',
            signature: c.req.header('svix-signature') ?? '',
          },
          webhookSecret,
        })
      } catch {
        return c.json({ error: 'Invalid webhook signature' }, 401)
      }
    }

    const body = JSON.parse(rawBody) as {
      type: string
      data: { email_id: string }
    }

    const resend_id = body.data?.email_id
    if (!resend_id) {
      console.warn('[resend-webhook] Missing email_id in payload', { type: body.type, data: body.data })
      return c.json({ error: 'Missing email_id in payload' }, 400)
    }

    console.log(`[resend-webhook] event=${body.type} email_id=${resend_id}`)

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
      default:
        console.log(`[resend-webhook] unhandled event type: ${body.type}`)
    }

    return c.json({ ok: true })
  } catch (err) {
    await logError(null, 'resend-webhook', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ── calendly-webhook ────────────────────────────────────────────────────────
app.post('/calendly-webhook', async (c) => {
  try {
    const body = (await c.req.json()) as {
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
      return c.json({ ok: true })
    }

    const { email, name } = body.payload
    const calendly_event_id = body.payload.event_type.uuid

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

    return c.json({ ok: true })
  } catch (err) {
    await logError(null, 'calendly-webhook', String(err))
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Vercel Node.js adapter — converts IncomingMessage to Web Request
// so Hono can handle it. Vercel pre-reads the body into req.body/rawBody,
// so we must reconstruct it rather than streaming from the consumed socket.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const url = `${proto}://${host}${req.url}`

  const headers = new Headers()
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    headers.append(req.rawHeaders[i], req.rawHeaders[i + 1])
  }

  let body: BodyInit | null = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Vercel helpers put pre-read body on req; fall back to collecting chunks
    const raw = (req as any).rawBody ?? (req as any).body
    if (raw instanceof Buffer) {
      body = raw
    } else if (typeof raw === 'string') {
      body = raw
    } else if (raw && typeof raw === 'object') {
      body = JSON.stringify(raw)
    } else {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(Buffer.from(chunk))
      body = Buffer.concat(chunks)
    }
  }

  const request = new Request(url, { method: req.method, headers, body })
  const response = await app.fetch(request)

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
  if (response.body) {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  }
  res.end()
}

// Also export the app for local Bun dev server
export { app }
