import { describe, expect, test } from 'bun:test'
import { POST } from '../api/calendly-webhook.ts'
import { postRequest, json } from './helpers.ts'

describe('calendly-webhook', () => {
  test('handles invitee.created event', async () => {
    const res = await POST(
      postRequest({
        event: 'invitee.created',
        payload: {
          email: 'test@example.com',
          name: 'Jane Smith',
          event_type: { uuid: `calendly-event-${crypto.randomUUID()}` },
          scheduled_event: {
            start_time: '2026-05-01T14:00:00Z',
            end_time: '2026-05-01T14:30:00Z',
          },
        },
      }),
    )
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  test('ignores non-invitee.created events', async () => {
    const res = await POST(
      postRequest({
        event: 'invitee.canceled',
        payload: {},
      }),
    )
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })
})
