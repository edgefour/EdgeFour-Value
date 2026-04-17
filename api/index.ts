import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'
import { validateCalculateInput, validateEmail } from './_lib/validate.ts'
import { calculate } from './_lib/calculator.ts'
import {
  insertSession,
  insertValuation,
  updateValuation,
  updateSession,
  insertFormEvent,
  updateEmailRecord,
  insertBooking,
  lookupValuationByEmail,
  logError,
} from './_lib/db.ts'
import { sendReport } from './_lib/send-email.ts'
import type {
  CalculateInput,
  SaveSessionRequest,
  SaveStep1Request,
  SaveValuationRequest,
  SubmitQuizRequest,
  TrackEventRequest,
} from '../shared/types.ts'

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
app.post('/save-valuation', async (c) => {
  try {
    const body = (await c.req.json()) as SaveValuationRequest

    if (!body.session_id || !body.valuation_id) {
      return c.json(
        { error: 'session_id and valuation_id are required' },
        400,
      )
    }

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
      adj_ebitda: body.adj_ebitda,
      base_multiple: body.base_multiple,
      estimated_multiple: body.estimated_multiple,
      years_bonus: body.years_bonus,
      revenue_scale_bonus: body.revenue_scale_bonus,
      valuation_low: body.valuation_low,
      valuation_base: body.valuation_base,
      valuation_high: body.valuation_high,
      value_score: body.value_score,
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

    // Send email (silent fail — don't block the user)
    try {
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

    return c.json({ ok: true })
  } catch (err) {
    await logError(null, 'submit-quiz', String(err))
    return c.json({ error: 'Internal server error' }, 500)
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
    const body = (await c.req.json()) as {
      type: string
      data: { email_id: string }
    }

    const resend_id = body.data?.email_id
    if (!resend_id) {
      return c.json({ error: 'Missing email_id in payload' }, 400)
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

// Vercel adapter
export default handle(app)

// Also export the app for local Bun dev server
export { app }
