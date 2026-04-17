/**
 * API client for EdgeFour Value backend.
 *
 * @typedef {import('../../shared/types.ts').CalculateResult} CalculateResult
 * @typedef {import('../../shared/types.ts').CalculateInput} CalculateInput
 */

const API_BASE = window.location.origin;

async function post(path, data) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    console.warn(`[api] ${path} failed:`, err.message);
    return null;
  }
}

// ── Stubbed responses (remove when backend is live) ───────────────────

const STUB_VALUATION_ID = "00000000-0000-4000-8000-000000000001";

/** @returns {CalculateResult} */
function stubCalculateResult(input) {
  const revenue = input.revenue || 1_000_000;
  const ebitda =
    input.input_mode === "know"
      ? input.ebitda
      : (input.earnings || 0) +
        (input.interest_expense || 0) +
        (input.taxes_paid || 0) +
        (input.depreciation_amort || 0);

  const adjEbitda =
    ebitda - input.owner_salary + input.market_salary + input.addbacks;
  const baseMultiple = 3.5;
  const sliderAvg =
    (input.sliders.growth +
      input.sliders.owner_dep +
      input.sliders.recurring +
      input.sliders.cust_conc +
      input.sliders.systems +
      input.sliders.fin_records) /
    6;
  const estimatedMultiple = baseMultiple + (sliderAvg - 3) * 0.4;
  const yearsBonus = Math.min(input.years_in_business * 0.02, 0.3);
  const revenueScaleBonus =
    revenue > 5_000_000 ? 0.3 : revenue > 2_000_000 ? 0.15 : 0;
  const finalMultiple = estimatedMultiple + yearsBonus + revenueScaleBonus;

  const valuationBase = Math.round(adjEbitda * finalMultiple);
  const valuationLow = Math.round(valuationBase * 0.8);
  const valuationHigh = Math.round(valuationBase * 1.2);

  const valueScore = Math.min(100, Math.max(0, Math.round(sliderAvg * 20)));

  const scoreBands = [
    {
      max: 30,
      band: "Needs Work",
      desc: "Your business has significant room for improvement in key value drivers.",
    },
    {
      max: 50,
      band: "Developing",
      desc: "Your business is building a foundation but key areas need attention.",
    },
    {
      max: 70,
      band: "Solid",
      desc: "Your business has good fundamentals with opportunities to strengthen.",
    },
    {
      max: 85,
      band: "Strong",
      desc: "Your business demonstrates strong performance across most value drivers.",
    },
    {
      max: 100,
      band: "Excellent",
      desc: "Your business excels across nearly all value drivers.",
    },
  ];
  const scoreBand = scoreBands.find((b) => valueScore <= b.max) || scoreBands[4];

  const sliderNames = {
    growth: "Revenue Growth",
    owner_dep: "Owner Dependency",
    recurring: "Recurring Revenue",
    cust_conc: "Customer Concentration",
    systems: "Systems & Processes",
    fin_records: "Financial Records",
  };

  const levels = ["Very Low", "Low", "Moderate", "High", "Very High"];

  const goodFactors = [];
  const badFactors = [];
  for (const [key, name] of Object.entries(sliderNames)) {
    const val = input.sliders[key];
    const level = levels[val - 1];
    const entry = {
      name,
      level,
      description: `Rated ${level.toLowerCase()} based on your assessment.`,
    };
    if (val >= 4) goodFactors.push(entry);
    else if (val <= 2) badFactors.push(entry);
  }

  const topFactors = Object.entries(input.sliders)
    .filter(([, v]) => v < 5)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, val]) => ({
      name: sliderNames[key],
      current_level: levels[val - 1],
      target_level: levels[Math.min(4, val + 1)],
      delta: Math.round(adjEbitda * 0.05),
    }));

  const uplift = topFactors.reduce((sum, f) => sum + f.delta, 0);

  return {
    adj_ebitda: adjEbitda,
    base_multiple: baseMultiple,
    estimated_multiple: Number(finalMultiple.toFixed(2)),
    years_bonus: Number(yearsBonus.toFixed(2)),
    revenue_scale_bonus: revenueScaleBonus,
    valuation_low: valuationLow,
    valuation_base: valuationBase,
    valuation_high: valuationHigh,
    value_score: valueScore,
    score_band: scoreBand.band,
    score_band_description: scoreBand.desc,
    good_factors: goodFactors,
    bad_factors: badFactors,
    trajectory: {
      uplift_amount: uplift,
      new_valuation_low: valuationLow + Math.round(uplift * 0.8),
      new_valuation_base: valuationBase + uplift,
      new_valuation_high: valuationHigh + Math.round(uplift * 1.2),
      top_factors: topFactors,
    },
    vip_recommendations: [
      {
        title: "Reduce Owner Dependency",
        body: "Document key processes and delegate critical decisions to build a management team that can operate independently.",
      },
      {
        title: "Strengthen Recurring Revenue",
        body: "Develop subscription or retainer-based offerings to create predictable, recurring income streams.",
      },
      {
        title: "Improve Financial Documentation",
        body: "Implement clean, auditable financial reporting with clear separation of personal and business expenses.",
      },
    ],
    methodology_notice: null,
    industry_category: "General Business Services",
  };
}

// ── Public API ────────────────────────────────────────────────────────

/** Set true to skip network and use inline stub math (offline). False uses /api/* (e.g. `bun dev`). */
const USE_STUBS = false;

export async function saveSession(data) {
  if (USE_STUBS) return { ok: true };
  return post("/api/save-session", data);
}

export async function saveStep1(data) {
  if (USE_STUBS) return { valuation_id: STUB_VALUATION_ID };
  return post("/api/save-step1", data);
}

/** @param {CalculateInput} data */
export async function calculate(data) {
  if (USE_STUBS) return stubCalculateResult(data);
  return post("/api/calculate", data);
}

export async function saveValuation(data) {
  if (USE_STUBS) return { valuation_id: data.valuation_id || STUB_VALUATION_ID };
  return post("/api/save-valuation", data);
}

export async function submitQuiz(data) {
  if (USE_STUBS) return { ok: true };
  return post("/api/submit-quiz", data);
}

export function trackEvent(data) {
  if (USE_STUBS) return;
  post("/api/track-event", data);
}
