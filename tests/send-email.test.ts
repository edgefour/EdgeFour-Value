import { describe, expect, test } from 'vitest'
import { sendReport } from '../api/_lib/send-email.js'
import { createTestValuation } from './helpers.js'

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
    expect(result.resend_id).toMatch(/^resend_mock_/)
  })
})
