import type { CalculateResult } from '../../shared/types.ts'

/** Hardcoded mock result for the calculate endpoint. */
export const MOCK_CALCULATE_RESULT: CalculateResult = {
  adj_ebitda: 425_000,
  base_multiple: 3.2,
  estimated_multiple: 3.65,
  years_bonus: 0.15,
  revenue_scale_bonus: 0.3,
  valuation_low: 1_240_000,
  valuation_base: 1_551_250,
  valuation_high: 1_862_500,
  value_score: 68,

  score_band: 'Developing',
  score_band_description:
    'Your business has solid fundamentals with meaningful room for improvement. Addressing the areas below could significantly increase your valuation multiple.',

  good_factors: [
    {
      name: 'Revenue Growth',
      level: 'Strong',
      description:
        'Consistent year-over-year growth signals a healthy demand trajectory.',
    },
    {
      name: 'Financial Records',
      level: 'Good',
      description:
        'Clean books and reliable reporting increase buyer confidence.',
    },
  ],

  bad_factors: [
    {
      name: 'Owner Dependency',
      level: 'High',
      description:
        'The business relies heavily on the owner for key relationships and decisions.',
    },
    {
      name: 'Customer Concentration',
      level: 'Moderate',
      description:
        'A significant share of revenue comes from a small number of clients.',
    },
    {
      name: 'Systems & Processes',
      level: 'Weak',
      description:
        'Limited documented processes make the business harder to transfer.',
    },
  ],

  trajectory: {
    uplift_amount: 465_000,
    new_valuation_low: 1_705_000,
    new_valuation_base: 2_016_250,
    new_valuation_high: 2_327_500,
    top_factors: [
      {
        name: 'Owner Dependency',
        current_level: 'High',
        target_level: 'Low',
        delta: 155_000,
      },
      {
        name: 'Systems & Processes',
        current_level: 'Weak',
        target_level: 'Strong',
        delta: 170_000,
      },
      {
        name: 'Customer Concentration',
        current_level: 'Moderate',
        target_level: 'Low',
        delta: 140_000,
      },
    ],
  },

  vip_recommendations: [
    {
      title: 'Reduce Owner Dependency',
      body: 'Document key relationships, delegate decision-making to a management team, and create succession plans for critical roles. Buyers pay more for businesses that run without the founder.',
    },
    {
      title: 'Diversify Your Customer Base',
      body: 'No single client should represent more than 15% of revenue. Develop a sales pipeline targeting new market segments to reduce concentration risk.',
    },
    {
      title: 'Build Scalable Systems',
      body: 'Invest in documented SOPs, CRM/ERP tooling, and repeatable workflows. Systematized businesses command higher multiples because they transfer cleanly.',
    },
  ],

  methodology_notice: null,
  industry_category: 'Professional Services',
}
