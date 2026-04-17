import { describe, expect, test } from 'bun:test'
import { post, json } from './helpers.ts'
import { calculate } from '../api/_lib/calculator.ts'
import type { CalculateResult } from '../shared/types.ts'

const validBody = {
  industry: 'mgmt_consulting',
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
    const res = await post('/api/calculate', validBody)
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
    const res = await post('/api/calculate', {
      ...validBody,
      sliders: { ...validBody.sliders, growth: 9 },
    })
    expect(res.status).toBe(400)
    const body = (await json(res)) as { error: string }
    expect(body.error).toContain('growth')
  })

  test('returns 400 for negative revenue', async () => {
    const res = await post('/api/calculate', { ...validBody, revenue: -1 })
    expect(res.status).toBe(400)
  })

  test('returns 400 for invalid input_mode', async () => {
    const res = await post('/api/calculate', {
      ...validBody,
      input_mode: 'something',
    })
    expect(res.status).toBe(400)
  })

  test('accepts calc mode with optional fields', async () => {
    const res = await post('/api/calculate', {
      ...validBody,
      input_mode: 'calc',
      earnings: 300_000,
      interest_expense: 20_000,
      taxes_paid: 80_000,
      depreciation_amort: 10_000,
    })
    expect(res.status).toBe(200)
  })
})

describe('calculator engine — value correctness', () => {
  test('computes correct values for a known SaaS input', () => {
    const result = calculate({
      industry: 'saas',
      years_in_business: 12,
      revenue: 6_000_000,
      ebitda: 500_000,
      input_mode: 'know',
      owner_salary: 200_000,
      market_salary: 150_000,
      addbacks: 25_000,
      sliders: {
        growth: 4,
        owner_dep: 3,
        recurring: 4,
        cust_conc: 2,
        systems: 3,
        fin_records: 4,
      },
    })

    expect(result.adj_ebitda).toBe(575_000)
    expect(result.base_multiple).toBe(8.0)
    expect(result.estimated_multiple).toBe(10.8)
    expect(result.years_bonus).toBeCloseTo(0.8, 2)
    expect(result.revenue_scale_bonus).toBe(0.5)
    expect(result.valuation_base).toBe(6_210_000)
    expect(result.valuation_low).toBe(5_278_500)
    expect(result.valuation_high).toBe(7_141_500)
    expect(result.value_score).toBeGreaterThanOrEqual(10)
    expect(result.value_score).toBeLessThanOrEqual(100)
    expect(result.methodology_notice).not.toBeNull()
    expect(result.industry_category).toBe('Technology')
  })

  test('computes correct values for a small restaurant', () => {
    const result = calculate({
      industry: 'restaurant_full',
      years_in_business: 3,
      revenue: 800_000,
      ebitda: 100_000,
      input_mode: 'know',
      owner_salary: 80_000,
      market_salary: 65_000,
      addbacks: 0,
      sliders: {
        growth: 2,
        owner_dep: 1,
        recurring: 2,
        cust_conc: 1,
        systems: 2,
        fin_records: 2,
      },
    })

    expect(result.adj_ebitda).toBe(115_000)
    expect(result.base_multiple).toBe(2.0)
    expect(result.years_bonus).toBe(0)
    expect(result.revenue_scale_bonus).toBe(0)
    expect(result.estimated_multiple).toBeGreaterThanOrEqual(1.0)
    expect(result.methodology_notice).toBeNull()
    expect(result.industry_category).toBe('Food & Beverage')
    expect(result.bad_factors.length).toBeGreaterThan(0)
    expect(result.vip_recommendations.length).toBe(3)
  })

  test('negative comp adjustment reduces adjEBITDA', () => {
    const result = calculate({
      industry: 'other',
      years_in_business: 5,
      revenue: 1_000_000,
      ebitda: 200_000,
      input_mode: 'know',
      owner_salary: 50_000,
      market_salary: 120_000,
      addbacks: 0,
      sliders: {
        growth: 3,
        owner_dep: 3,
        recurring: 3,
        cust_conc: 3,
        systems: 3,
        fin_records: 3,
      },
    })

    expect(result.adj_ebitda).toBe(130_000)
  })

  test('unknown industry falls back to defaults', () => {
    const result = calculate({
      industry: 'nonexistent_industry',
      years_in_business: 5,
      revenue: 1_000_000,
      ebitda: 200_000,
      input_mode: 'know',
      owner_salary: 100_000,
      market_salary: 100_000,
      addbacks: 0,
      sliders: {
        growth: 3,
        owner_dep: 3,
        recurring: 3,
        cust_conc: 3,
        systems: 3,
        fin_records: 3,
      },
    })

    expect(result.base_multiple).toBe(3.5)
    expect(result.industry_category).toBe('General Business Services')
  })
})
