/**
 * Database client using Drizzle ORM connected to Supabase/PostgreSQL.
 */

import { db } from '../../src/db/index.ts'
import {
  sessions,
  valuations,
  formEvents,
  emailsSent,
  bookings,
  functionErrors,
} from '../../src/db/schema/index.ts'
import { eq } from 'drizzle-orm'

export async function insertSession(data: Record<string, unknown>) {
  await db.insert(sessions).values({
    sessionId: data.session_id as string,
    referrer: (data.referrer as string) ?? null,
    utmSource: (data.utm_source as string) ?? null,
    utmMedium: (data.utm_medium as string) ?? null,
    utmCampaign: (data.utm_campaign as string) ?? null,
    // user_agent is sent by the API but the schema has deviceType/browser —
    // leave null for now; UA parsing can be added later
  }).onConflictDoNothing()
  return { ok: true }
}

export async function insertValuation(data: Record<string, unknown>) {
  const result = await db.insert(valuations).values({
    sessionId: data.session_id as string,
    recalculationNumber: 1,
    businessName: (data.business_name as string) ?? null,
    industry: (data.industry as string) ?? null,
    city: (data.city as string) ?? null,
    state: (data.state as string) ?? null,
    yearsInBusiness: data.years_in_business != null ? Number(data.years_in_business) : null,
    employees: data.employees != null ? Number(data.employees) : null,
  }).returning({ id: valuations.id })

  return { valuation_id: result[0].id }
}

export async function updateValuation(
  valuation_id: string,
  data: Record<string, unknown>,
) {
  const setValues: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  // Map snake_case API fields to camelCase schema columns
  const fieldMap: Record<string, string> = {
    input_mode: 'inputMode',
    revenue: 'revenue',
    ebitda: 'ebitda',
    earnings: 'earnings',
    interest_expense: 'interestExpense',
    taxes_paid: 'taxesPaid',
    depreciation_amort: 'depreciationAmort',
    owner_salary: 'ownerSalary',
    market_salary: 'marketSalary',
    addbacks: 'addbacks',
    adj_ebitda: 'adjEbitda',
    base_multiple: 'baseMultiple',
    estimated_multiple: 'estimatedMultiple',
    years_bonus: 'yearsBonus',
    revenue_scale_bonus: 'revenueScaleBonus',
    valuation_low: 'valuationLow',
    valuation_base: 'valuationBase',
    valuation_high: 'valuationHigh',
    value_score: 'valueScore',
    lead_email: 'leadEmail',
    quiz_timeline: 'quizTimeline',
    quiz_advisory_source: 'quizAdvisorySource',
    business_name: 'businessName',
    industry: 'industry',
  }

  // Numeric columns that use the `numeric` type (stored as strings in Drizzle)
  const numericColumns = new Set([
    'revenue', 'ebitda', 'earnings', 'interestExpense', 'taxesPaid',
    'depreciationAmort', 'ownerSalary', 'marketSalary', 'addbacks',
    'adjEbitda', 'baseMultiple', 'estimatedMultiple', 'yearsBonus',
    'revenueScaleBonus', 'valuationLow', 'valuationBase', 'valuationHigh',
  ])

  for (const [apiKey, schemaKey] of Object.entries(fieldMap)) {
    if (apiKey in data) {
      const val = data[apiKey]
      if (val != null && numericColumns.has(schemaKey)) {
        setValues[schemaKey] = String(val)
      } else {
        setValues[schemaKey] = val
      }
    }
  }

  // Handle integer columns
  if ('value_score' in data) {
    setValues.valueScore = data.value_score != null ? Number(data.value_score) : null
  }

  // Handle timestamp columns
  if ('calculated_at' in data) {
    setValues.calculatedAt = data.calculated_at ? new Date(data.calculated_at as string) : null
  }
  if ('report_sent_at' in data) {
    setValues.reportSentAt = data.report_sent_at ? new Date(data.report_sent_at as string) : null
  }

  // Handle sliders — destructure into individual columns
  if (data.sliders && typeof data.sliders === 'object') {
    const s = data.sliders as Record<string, number>
    if (s.growth != null) setValues.growthSlider = s.growth
    if (s.owner_dep != null) setValues.ownerDepSlider = s.owner_dep
    if (s.recurring != null) setValues.recurringSlider = s.recurring
    if (s.cust_conc != null) setValues.custConcSlider = s.cust_conc
    if (s.systems != null) setValues.systemsSlider = s.systems
    if (s.fin_records != null) setValues.finRecordsSlider = s.fin_records
  }

  await db.update(valuations).set(setValues).where(eq(valuations.id, valuation_id))
  return { ok: true }
}

export async function updateSession(
  session_id: string,
  data: Record<string, unknown>,
) {
  const setValues: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if ('furthest_step' in data) setValues.furthestStep = data.furthest_step
  if ('completed' in data) setValues.completed = data.completed
  if ('last_seen_at' in data) setValues.lastSeenAt = new Date(data.last_seen_at as string)

  await db.update(sessions).set(setValues).where(eq(sessions.sessionId, session_id))
  return { ok: true }
}

export async function insertFormEvent(data: Record<string, unknown>) {
  await db.insert(formEvents).values({
    sessionId: data.session_id as string,
    eventType: data.event_type as string,
    fieldName: (data.field_name as string) ?? null,
    oldValue: (data.old_value as string) ?? null,
    newValue: (data.new_value as string) ?? null,
    step: data.step as string,
    durationSeconds: data.duration_seconds != null ? Number(data.duration_seconds) : null,
  })
}

export async function insertEmailRecord(data: Record<string, unknown>) {
  await db.insert(emailsSent).values({
    sessionId: data.session_id as string,
    valuationId: data.valuation_id as string,
    recipientEmail: data.recipient_email as string,
    subject: data.subject as string,
    resendId: (data.resend_id as string) ?? null,
    status: data.status as string,
    errorMessage: (data.error_message as string) ?? null,
  })
}

export async function updateEmailRecord(
  resend_id: string,
  data: Record<string, unknown>,
) {
  const setValues: Record<string, unknown> = {}
  if ('delivered_at' in data) setValues.deliveredAt = new Date(data.delivered_at as string)
  if ('opened_at' in data) setValues.openedAt = new Date(data.opened_at as string)
  if ('bounced_at' in data) setValues.bouncedAt = new Date(data.bounced_at as string)
  if ('status' in data) setValues.status = data.status

  await db.update(emailsSent).set(setValues).where(eq(emailsSent.resendId, resend_id))
}

export async function insertBooking(data: Record<string, unknown>) {
  await db.insert(bookings).values({
    sessionId: (data.session_id as string) ?? null,
    valuationId: (data.valuation_id as string) ?? null,
    leadEmail: data.lead_email as string,
    inviteeName: (data.invitee_name as string) ?? null,
    scheduledStartAt: new Date(data.scheduled_start_at as string),
    scheduledEndAt: new Date(data.scheduled_end_at as string),
    calendlyEventId: data.calendly_event_id as string,
  })
}

export async function lookupValuationByEmail(
  email: string,
): Promise<{ session_id: string; valuation_id: string } | null> {
  const result = await db
    .select({ sessionId: valuations.sessionId, id: valuations.id })
    .from(valuations)
    .where(eq(valuations.leadEmail, email))
    .limit(1)

  if (result.length === 0) return null
  return { session_id: result[0].sessionId, valuation_id: result[0].id }
}

export async function logError(
  session_id: string | null,
  function_name: string,
  error_message: string,
  payload?: unknown,
) {
  try {
    await db.insert(functionErrors).values({
      sessionId: session_id,
      functionName: function_name,
      errorMessage: error_message,
      payload: payload ?? null,
    })
  } catch (err) {
    // Fallback to console if DB itself is down
    console.error(`[error:${function_name}]`, {
      session_id,
      error_message,
      payload,
      db_error: String(err),
    })
  }
}
