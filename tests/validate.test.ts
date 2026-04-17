import { describe, expect, test } from 'bun:test'
import { validateEmail, validateCalculateInput } from '../api/_lib/validate.ts'
import type { CalculateInput } from '../shared/types.ts'

const validSliders = {
  growth: 3,
  owner_dep: 3,
  recurring: 3,
  cust_conc: 3,
  systems: 3,
  fin_records: 3,
}

const validInput: CalculateInput = {
  industry: 'Professional Services',
  years_in_business: 10,
  revenue: 2_000_000,
  ebitda: 400_000,
  input_mode: 'know',
  owner_salary: 150_000,
  market_salary: 120_000,
  addbacks: 50_000,
  sliders: validSliders,
}

describe('validateEmail', () => {
  test('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toEqual({ valid: true })
  })

  test('rejects missing @', () => {
    const r = validateEmail('testexample.com')
    expect(r.valid).toBe(false)
  })

  test('rejects empty string', () => {
    const r = validateEmail('')
    expect(r.valid).toBe(false)
  })

  test('rejects spaces', () => {
    const r = validateEmail('test @example.com')
    expect(r.valid).toBe(false)
  })
})

describe('validateCalculateInput', () => {
  test('accepts valid input', () => {
    expect(validateCalculateInput(validInput)).toEqual({ valid: true })
  })

  test('rejects revenue out of bounds', () => {
    const r = validateCalculateInput({ ...validInput, revenue: -1 })
    expect(r.valid).toBe(false)
  })

  test('rejects revenue above max', () => {
    const r = validateCalculateInput({
      ...validInput,
      revenue: 500_000_000_001,
    })
    expect(r.valid).toBe(false)
  })

  test('allows negative ebitda within bounds', () => {
    const r = validateCalculateInput({ ...validInput, ebitda: -500_000_000 })
    expect(r.valid).toBe(true)
  })

  test('rejects ebitda below min', () => {
    const r = validateCalculateInput({
      ...validInput,
      ebitda: -500_000_000_001,
    })
    expect(r.valid).toBe(false)
  })

  test('rejects slider below 1', () => {
    const r = validateCalculateInput({
      ...validInput,
      sliders: { ...validSliders, growth: 0 },
    })
    expect(r.valid).toBe(false)
  })

  test('rejects slider above 5', () => {
    const r = validateCalculateInput({
      ...validInput,
      sliders: { ...validSliders, systems: 6 },
    })
    expect(r.valid).toBe(false)
  })

  test('rejects invalid input_mode', () => {
    const r = validateCalculateInput({
      ...validInput,
      input_mode: 'invalid' as 'know',
    })
    expect(r.valid).toBe(false)
  })

  test('accepts calc mode', () => {
    const r = validateCalculateInput({ ...validInput, input_mode: 'calc' })
    expect(r.valid).toBe(true)
  })

  test('rejects years_in_business above 200', () => {
    const r = validateCalculateInput({ ...validInput, years_in_business: 201 })
    expect(r.valid).toBe(false)
  })
})
