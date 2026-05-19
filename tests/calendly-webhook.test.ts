import { describe, expect, test } from 'vitest'
import { createHmac } from 'node:crypto'
import { post, json } from './helpers.js'
import { db } from '../src/db/index.js'
import { bookings } from '../src/db/schema/index.js'
import { eq } from 'drizzle-orm'

function calendlySignature(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex')
  return `t=${timestamp},v1=${digest}`
}

describe('calendly-webhook', () => {
  const bypassHeaders = { 'x-edgefour-test-webhook-signature': 'edgefour-test-bypass' }

  test('handles invitee.created event', async () => {
    const res = await post('/api/calendly-webhook', {
      event: 'invitee.created',
      payload: {
        email: 'test@example.com',
        name: 'Jane Smith',
        event_type: { uuid: `calendly-event-${crypto.randomUUID()}` },
        scheduled_event: { start_time: '2026-05-01T14:00:00Z', end_time: '2026-05-01T14:30:00Z' },
      },
    }, bypassHeaders)
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('ignores non-invitee.created events', async () => {
    const res = await post('/api/calendly-webhook', { event: 'invitee.canceled', payload: {} }, bypassHeaders)
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('links booking to most recent valuation for duplicate lead emails', async () => {
    const leadEmail = `lead-${crypto.randomUUID()}@example.com`

    const sessionOne = crypto.randomUUID()
    await post('/api/save-session', { session_id: sessionOne })
    const stepOneRes = await post('/api/save-step1', {
      session_id: sessionOne,
      business_name: 'Alpha Co',
      industry: 'other',
      years_in_business: 3,
      employees: 5,
    })
    const stepOneBody = (await json(stepOneRes)) as { valuation_id: string }
    await post('/api/submit-quiz', {
      session_id: sessionOne,
      valuation_id: stepOneBody.valuation_id,
      lead_email: leadEmail,
      quiz_timeline: '1to3',
      quiz_advisory_source: 'solo',
    })

    const sessionTwo = crypto.randomUUID()
    await post('/api/save-session', { session_id: sessionTwo })
    const stepTwoRes = await post('/api/save-step1', {
      session_id: sessionTwo,
      business_name: 'Beta Co',
      industry: 'other',
      years_in_business: 4,
      employees: 8,
    })
    const stepTwoBody = (await json(stepTwoRes)) as { valuation_id: string }
    await post('/api/submit-quiz', {
      session_id: sessionTwo,
      valuation_id: stepTwoBody.valuation_id,
      lead_email: leadEmail,
      quiz_timeline: '3to5',
      quiz_advisory_source: 'consultant',
    })

    const calendlyEventId = `calendly-event-${crypto.randomUUID()}`
    const webhookRes = await post('/api/calendly-webhook', {
      event: 'invitee.created',
      payload: {
        email: leadEmail,
        name: 'Latest Lead',
        event_type: { uuid: calendlyEventId },
        scheduled_event: { start_time: '2026-05-01T14:00:00Z', end_time: '2026-05-01T14:30:00Z' },
      },
    }, bypassHeaders)
    expect(webhookRes.status).toBe(200)

    const booking = (await db.select().from(bookings).where(eq(bookings.calendlyEventId, calendlyEventId)).limit(1))[0]
    expect(booking).toBeDefined()
    expect(booking?.valuationId).toBe(stepTwoBody.valuation_id)
    expect(booking?.sessionId).toBe(sessionTwo)
  })

  test('returns 401 when webhook signature is missing', async () => {
    const res = await post('/api/calendly-webhook', {
      event: 'invitee.created',
      payload: {
        email: 'test@example.com',
        event_type: { uuid: `calendly-event-${crypto.randomUUID()}` },
        scheduled_event: { start_time: '2026-05-01T14:00:00Z', end_time: '2026-05-01T14:30:00Z' },
      },
    })
    expect(res.status).toBe(401)
  })

  test('accepts a valid Calendly signed payload', async () => {
    const body = {
      event: 'invitee.created',
      payload: {
        email: 'test@example.com',
        event_type: { uuid: `calendly-event-${crypto.randomUUID()}` },
        scheduled_event: { start_time: '2026-05-01T14:00:00Z', end_time: '2026-05-01T14:30:00Z' },
      },
    }
    const rawBody = JSON.stringify(body)
    const signature = calendlySignature(rawBody, process.env.CALENDLY_WEBHOOK_SECRET ?? 'test')
    const res = await post('/api/calendly-webhook', body, { 'calendly-webhook-signature': signature })
    expect(res.status).toBe(200)
  })

  test('rejects stale Calendly signatures', async () => {
    const body = {
      event: 'invitee.created',
      payload: {
        email: 'test@example.com',
        event_type: { uuid: `calendly-event-${crypto.randomUUID()}` },
        scheduled_event: { start_time: '2026-05-01T14:00:00Z', end_time: '2026-05-01T14:30:00Z' },
      },
    }
    const staleTimestamp = Math.floor(Date.now() / 1000) - 1200
    const rawBody = JSON.stringify(body)
    const signature = calendlySignature(rawBody, process.env.CALENDLY_WEBHOOK_SECRET ?? 'test', staleTimestamp)
    const res = await post('/api/calendly-webhook', body, { 'calendly-webhook-signature': signature })
    expect(res.status).toBe(401)
  })

  test('returns 500 when webhook secret is missing', async () => {
    const prev = process.env.CALENDLY_WEBHOOK_SECRET
    delete process.env.CALENDLY_WEBHOOK_SECRET
    try {
      const res = await post('/api/calendly-webhook', { event: 'invitee.canceled', payload: {} }, bypassHeaders)
      expect(res.status).toBe(500)
    } finally {
      process.env.CALENDLY_WEBHOOK_SECRET = prev
    }
  })
})
