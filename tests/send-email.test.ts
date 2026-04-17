import { describe, expect, test } from 'bun:test'
import { sendReport } from '../api/send-email.ts'

describe('sendReport', () => {
  test('returns a resend_id on success', async () => {
    const result = await sendReport({
      session_id: crypto.randomUUID(),
      valuation_id: crypto.randomUUID(),
      recipient_email: 'test@example.com',
      business_name: 'Acme Corp',
      html: '<p>Test email</p>',
    })
    expect(result.resend_id).toBeDefined()
    expect(result.resend_id).toStartWith('resend_mock_')
  })
})
