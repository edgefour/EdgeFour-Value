import { describe, expect, test } from 'bun:test'
import { POST } from '../api/save-step1.ts'
import { postRequest, json } from './helpers.ts'

describe('save-step1', () => {
  test('returns valuation_id for valid input', async () => {
    const res = await POST(
      postRequest({
        session_id: crypto.randomUUID(),
        business_name: 'Acme Corp',
        industry: 'Professional Services',
        years_in_business: 10,
        employees: 15,
      }),
    )
    expect(res.status).toBe(200)
    const body = (await json(res)) as { valuation_id: string }
    expect(body.valuation_id).toBeDefined()
    expect(typeof body.valuation_id).toBe('string')
  })

  test('returns 400 when business_name is missing', async () => {
    const res = await POST(
      postRequest({
        session_id: crypto.randomUUID(),
        industry: 'Test',
      }),
    )
    expect(res.status).toBe(400)
  })

  test('returns 400 when industry is missing', async () => {
    const res = await POST(
      postRequest({
        session_id: crypto.randomUUID(),
        business_name: 'Test',
      }),
    )
    expect(res.status).toBe(400)
  })
})
