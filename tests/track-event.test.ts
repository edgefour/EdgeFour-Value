import { describe, expect, test } from 'bun:test'
import { POST } from '../api/track-event'
import { postRequest } from './helpers'

describe('track-event', () => {
  test('returns 204 for valid event', async () => {
    const res = await POST(
      postRequest({
        session_id: crypto.randomUUID(),
        event_type: 'field_change',
        step: 'business_info',
        field_name: 'industry',
        new_value: 'Consulting',
      }),
    )
    expect(res.status).toBe(204)
  })

  test('returns 204 for step_advance with duration', async () => {
    const res = await POST(
      postRequest({
        session_id: crypto.randomUUID(),
        event_type: 'step_advance',
        step: 'financials',
        duration_seconds: 45,
      }),
    )
    expect(res.status).toBe(204)
  })

  test('returns 400 when session_id is missing', async () => {
    const res = await POST(
      postRequest({ event_type: 'field_change', step: 'landing' }),
    )
    expect(res.status).toBe(400)
  })

  test('returns 400 when event_type is missing', async () => {
    const res = await POST(
      postRequest({ session_id: crypto.randomUUID(), step: 'landing' }),
    )
    expect(res.status).toBe(400)
  })
})
