import type { CalculateInput, SliderValues } from '../../shared/types.ts'

type ValidationResult = { valid: true } | { valid: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): ValidationResult {
  if (!EMAIL_RE.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

const BOUNDS: Record<string, { min: number; max: number }> = {
  revenue: { min: 0, max: 10_000_000_000 },
  ebitda: { min: -1_000_000_000, max: 10_000_000_000 },
  earnings: { min: -1_000_000_000, max: 10_000_000_000 },
  interest_expense: { min: 0, max: 1_000_000_000 },
  taxes_paid: { min: 0, max: 1_000_000_000 },
  depreciation_amort: { min: 0, max: 1_000_000_000 },
  owner_salary: { min: 0, max: 100_000_000 },
  market_salary: { min: 0, max: 100_000_000 },
  addbacks: { min: 0, max: 1_000_000_000 },
  years_in_business: { min: 0, max: 200 },
}

const SLIDER_KEYS: (keyof SliderValues)[] = [
  'growth',
  'owner_dep',
  'recurring',
  'cust_conc',
  'systems',
  'fin_records',
]

export function validateCalculateInput(
  input: CalculateInput,
): ValidationResult {
  // Check numeric bounds
  for (const [field, { min, max }] of Object.entries(BOUNDS)) {
    const value = (input as Record<string, unknown>)[field]
    if (value === undefined || value === null) continue
    if (typeof value !== 'number' || value < min || value > max) {
      return { valid: false, error: `${field} out of bounds (${min}–${max})` }
    }
  }

  // Check sliders 1-5
  if (input.sliders) {
    for (const key of SLIDER_KEYS) {
      const v = input.sliders[key]
      if (typeof v !== 'number' || v < 1 || v > 5) {
        return { valid: false, error: `slider ${key} must be 1–5` }
      }
    }
  }

  // Check input_mode
  if (input.input_mode !== 'know' && input.input_mode !== 'calc') {
    return { valid: false, error: "input_mode must be 'know' or 'calc'" }
  }

  return { valid: true }
}
