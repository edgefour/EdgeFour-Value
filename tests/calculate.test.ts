import { describe, expect, test } from 'bun:test'
import { POST } from '../api/calculate.ts'
import { postRequest, json } from './helpers.ts'
import type { CalculateResult } from '../shared/types.ts'

const validBody = {
  industry: 'Professional Services',
  years_in_business: 10,
  revenue: 2_000_000,
  ebitda: 400_000,
  input_mode: 'know',
  owner_salary: 150_000,
  market_salary: 120_000,
  addbacks: 50_000,
  sliders: {
    growth: 4,
    owner_dep: 2,
    recurring: 3,
    cust_conc: 3,
    systems: 2,
    fin_records: 4,
  },
}

describe('calculate', () => {
  test('returns full CalculateResult for valid input', async () => {
    const res = await POST(postRequest(validBody))
    expect(res.status).toBe(200)

    const body = (await json(res)) as CalculateResult
    expect(body.adj_ebitda).toBeNumber()
    expect(body.valuation_low).toBeNumber()
    expect(body.valuation_base).toBeNumber()
    expect(body.valuation_high).toBeNumber()
    expect(body.value_score).toBeNumber()
    expect(body.score_band).toBeString()
    expect(body.good_factors).toBeArray()
    expect(body.bad_factors).toBeArray()
    expect(body.vip_recommendations).toBeArray()
    expect(body.trajectory).toBeDefined()
    expect(body.trajectory.top_factors).toBeArray()
  })

  test('returns 400 for invalid slider value', async () => {
    const res = await POST(
      postRequest({
        ...validBody,
        sliders: { ...validBody.sliders, growth: 9 },
      }),
    )
    expect(res.status).toBe(400)
    const body = (await json(res)) as { error: string }
    expect(body.error).toContain('growth')
  })

  test('returns 400 for negative revenue', async () => {
    const res = await POST(postRequest({ ...validBody, revenue: -1 }))
    expect(res.status).toBe(400)
  })

  test('returns 400 for invalid input_mode', async () => {
    const res = await POST(
      postRequest({ ...validBody, input_mode: 'something' }),
    )
    expect(res.status).toBe(400)
  })

  test('accepts calc mode with optional fields', async () => {
    const res = await POST(
      postRequest({
        ...validBody,
        input_mode: 'calc',
        earnings: 300_000,
        interest_expense: 20_000,
        taxes_paid: 80_000,
        depreciation_amort: 10_000,
      }),
    )
    expect(res.status).toBe(200)
  })
})
