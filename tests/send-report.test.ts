import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { post, json, createTestValuation } from './helpers.js'

// Mock the Resend wrapper — these tests cover the /send-report contract
// (DB-derived rendering, error paths), not the Resend SDK itself.
vi.mock('../api/_lib/resend.js', () => ({
  sendEmail: vi.fn(async () => ({ resend_id: `resend_mock_${crypto.randomUUID()}` })),
}))

const sliders = { growth: 4, owner_dep: 2, recurring: 3, cust_conc: 3, systems: 2, fin_records: 4 }

const inputBody = (ids: { session_id: string; valuation_id: string }) => ({
  ...ids,
  industry: 'mgmt_consulting',
  years_in_business: 8,
  input_mode: 'know',
  revenue: 2_000_000,
  ebitda: 400_000,
  owner_salary: 150_000,
  market_salary: 120_000,
  addbacks: 50_000,
  sliders,
})

async function setupSavedValuation() {
  const ids = await createTestValuation()
  const res = await post('/api/save-valuation', inputBody(ids))
  expect(res.status).toBe(200)
  return ids
}

describe('send-report', () => {
  let resendMock: { sendEmail: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    resendMock = await import('../api/_lib/resend.js') as unknown as { sendEmail: ReturnType<typeof vi.fn> }
    resendMock.sendEmail.mockClear()
  })

  afterEach(() => vi.restoreAllMocks())

  test('builds email entirely from saved valuation row (no email_content payload)', async () => {
    const ids = await setupSavedValuation()
    const res = await post('/api/send-report', {
      ...ids,
      recipient_email: 'lead@example.com',
    })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })

    expect(resendMock.sendEmail).toHaveBeenCalledOnce()
    const call = resendMock.sendEmail.mock.calls[0][0] as { html: string; subject: string; to: string }
    expect(call.to).toBe('lead@example.com')
    // Subject mirrors the persisted business name from save-step1 ("Test Corp"),
    // proving the server pulled from DB rather than echoing client input.
    expect(call.subject).toContain('Test Corp')
    // Trajectory block must be present — fields were derived & persisted in /save-valuation.
    expect(call.html).toContain('After Key Improvements')
    expect(call.html).toContain('increase in value with key improvements')
  })

  test('returns 422 when valuation row is incomplete (missing derived fields)', async () => {
    // create a session+valuation but skip /save-valuation, so the derived
    // columns are NULL. The handler must refuse to render rather than
    // silently emailing placeholder content.
    const ids = await createTestValuation()
    const res = await post('/api/send-report', {
      ...ids,
      recipient_email: 'lead@example.com',
    })
    expect(res.status).toBe(422)
    const body = (await json(res)) as { error: string }
    expect(body.error).toContain('missing')
    expect(resendMock.sendEmail).not.toHaveBeenCalled()
  })

  test('returns 404 when valuation_id does not exist', async () => {
    const res = await post('/api/send-report', {
      session_id: crypto.randomUUID(),
      valuation_id: crypto.randomUUID(),
      recipient_email: 'lead@example.com',
    })
    expect(res.status).toBe(404)
    expect(resendMock.sendEmail).not.toHaveBeenCalled()
  })

  test('returns 400 when recipient_email is malformed', async () => {
    const ids = await setupSavedValuation()
    const res = await post('/api/send-report', {
      ...ids,
      recipient_email: 'not-an-email',
    })
    expect(res.status).toBe(400)
    expect(resendMock.sendEmail).not.toHaveBeenCalled()
  })

  test('returns 400 when recipient_email is missing', async () => {
    const ids = await setupSavedValuation()
    const res = await post('/api/send-report', ids)
    expect(res.status).toBe(400)
    expect(resendMock.sendEmail).not.toHaveBeenCalled()
  })
})
