import { describe, expect, test } from 'bun:test'
import { post, json, createTestSession } from './helpers.ts'

describe('save-step1', () => {
  test('returns valuation_id for valid input', async () => {
    const session_id = await createTestSession()
    const res = await post('/api/save-step1', {
      session_id,
      business_name: 'Acme Corp',
      industry: 'Professional Services',
      years_in_business: 10,
      employees: 15,
    })
    expect(res.status).toBe(200)
    const body = (await json(res)) as { valuation_id: string }
    expect(body.valuation_id).toBeDefined()
    expect(typeof body.valuation_id).toBe('string')
  })

  test('returns 400 when business_name is missing', async () => {
    const res = await post('/api/save-step1', {
      session_id: crypto.randomUUID(),
      industry: 'Test',
    })
    expect(res.status).toBe(400)
  })

  test('returns 400 when industry is missing', async () => {
    const res = await post('/api/save-step1', {
      session_id: crypto.randomUUID(),
      business_name: 'Test',
    })
    expect(res.status).toBe(400)
  })
})
