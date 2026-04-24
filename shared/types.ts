// Slider values (1-5 scale)
export type SliderValues = {
  growth: number
  owner_dep: number
  recurring: number
  cust_conc: number
  systems: number
  fin_records: number
}

// Input to calculate function
export type CalculateInput = {
  industry: string
  years_in_business: number
  revenue: number
  ebitda: number
  earnings?: number
  interest_expense?: number
  taxes_paid?: number
  depreciation_amort?: number
  input_mode: 'know' | 'calc'
  owner_salary: number
  market_salary: number
  addbacks: number
  sliders: SliderValues
}

// Output from calculate function — everything the UI needs to render
export type CalculateResult = {
  // Core numbers
  adj_ebitda: number
  base_multiple: number
  estimated_multiple: number
  years_bonus: number
  revenue_scale_bonus: number
  valuation_low: number
  valuation_base: number
  valuation_high: number
  value_score: number

  // Display copy
  score_band: string
  score_band_description: string

  // Good / bad factors
  good_factors: Array<{ name: string; level: string; description: string }>
  bad_factors: Array<{ name: string; level: string; description: string }>

  // Trajectory card
  trajectory: {
    uplift_amount: number
    new_valuation_low: number
    new_valuation_base: number
    new_valuation_high: number
    top_factors: Array<{
      name: string
      current_level: string
      target_level: string
      // Multiple-point gain from a 2-level slider improvement (e.g. 1.0, 0.8), not dollars
      delta: number
    }>
  }

  // VIP recommendations for Snapshot page (top 3, already sorted)
  vip_recommendations: Array<{ title: string; body: string }>

  // Flagged industry methodology notice (null if not flagged)
  methodology_notice: string | null

  // Industry metadata (for display)
  industry_category: string
}

export type FormEventType =
  | 'field_change'
  | 'step_advance'
  | 'step_back'
  | 'restart'
  | 'popup_opened'
  | 'popup_dismissed'
  | 'mode_switch'
  | 'recalculate'

export type FurthestStep =
  | 'landing'
  | 'business_info'
  | 'financials'
  | 'value_drivers'
  | 'results'
  | 'quiz'
  | 'snapshot'

// --- Request types for each endpoint ---

export type SaveSessionRequest = {
  session_id: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  user_agent?: string
}

export type SaveStep1Request = {
  session_id: string
  business_name: string
  industry: string
  city?: string
  state?: string
  years_in_business: number
  employees?: number
}

export type SaveValuationRequest = {
  session_id: string
  valuation_id: string
  input_mode: 'know' | 'calc'
  revenue: number
  ebitda: number
  earnings?: number
  interest_expense?: number
  taxes_paid?: number
  depreciation_amort?: number
  owner_salary: number
  market_salary: number
  addbacks: number
  adj_ebitda: number
  base_multiple: number
  estimated_multiple: number
  years_bonus: number
  revenue_scale_bonus: number
  valuation_low: number
  valuation_base: number
  valuation_high: number
  value_score: number
  sliders: SliderValues
}

export type SubmitQuizRequest = {
  session_id: string
  valuation_id: string
  lead_email: string
  quiz_timeline: string
  quiz_advisory_source: string
  email_content: {
    business_name: string
    industry: string
    valuation_low: number
    valuation_base: number
    valuation_high: number
    value_score: number
    score_band: string
    adj_ebitda: number
    estimated_multiple: number
    good_factors: Array<{ name: string; description: string }>
    bad_factors: Array<{ name: string; description: string }>
    trajectory_top_factors: Array<{ name: string; delta: number }>
    vip_recommendations: Array<{ title: string; body: string }>
  }
}

export type TrackEventRequest = {
  session_id: string
  event_type: FormEventType
  field_name?: string
  old_value?: string
  new_value?: string
  step: FurthestStep
  duration_seconds?: number
}
