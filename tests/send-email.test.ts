import { describe, expect, test } from 'bun:test'
import { sendReport } from '../api/_lib/send-email.ts'
import { createTestValuation } from './helpers.ts'

describe('sendReport', () => {
  test('returns a resend_id on success', async () => {
    const { session_id, valuation_id } = await createTestValuation()
    const result = await sendReport({
      session_id,
      valuation_id,
      recipient_email: 'test@example.com',
      business_name: 'Acme Corp',
      html: '<p>Test email</p>',
    })
    expect(result.resend_id).toBeDefined()
    expect(result.resend_id).toStartWith('resend_mock_')
  })
})
