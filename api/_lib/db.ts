/**
 * Stubbed database client.
 * All operations log to console and return mock responses.
 * Replace with real Supabase calls when ready.
 */

function log(fn: string, data: unknown) {
  console.log(`[db:${fn}]`, JSON.stringify(data, null, 2))
}

export async function insertSession(data: Record<string, unknown>) {
  log('insertSession', data)
  return { ok: true }
}

export async function insertValuation(data: Record<string, unknown>) {
  const valuation_id = crypto.randomUUID()
  log('insertValuation', { ...data, valuation_id })
  return { valuation_id }
}

export async function updateValuation(
  valuation_id: string,
  data: Record<string, unknown>,
) {
  log('updateValuation', { valuation_id, ...data })
  return { ok: true }
}

export async function updateSession(
  session_id: string,
  data: Record<string, unknown>,
) {
  log('updateSession', { session_id, ...data })
  return { ok: true }
}

export async function insertFormEvent(data: Record<string, unknown>) {
  log('insertFormEvent', data)
}

export async function insertEmailRecord(data: Record<string, unknown>) {
  log('insertEmailRecord', data)
}

export async function updateEmailRecord(
  resend_id: string,
  data: Record<string, unknown>,
) {
  log('updateEmailRecord', { resend_id, ...data })
}

export async function insertBooking(data: Record<string, unknown>) {
  log('insertBooking', data)
}

export async function lookupValuationByEmail(
  email: string,
): Promise<{ session_id: string; valuation_id: string } | null> {
  log('lookupValuationByEmail', { email })
  // Stub: no match found
  return null
}

export async function logError(
  session_id: string | null,
  function_name: string,
  error_message: string,
  payload?: unknown,
) {
  console.error(`[error:${function_name}]`, {
    session_id,
    error_message,
    payload,
  })
}
