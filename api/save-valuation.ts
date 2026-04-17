import { handleCors, jsonResponse } from './_lib/cors'
import { updateValuation, updateSession, logError } from './_lib/db'
import type { SaveValuationRequest } from '../shared/types'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as SaveValuationRequest

    if (!body.session_id || !body.valuation_id) {
      return jsonResponse(
        { error: 'session_id and valuation_id are required' },
        400,
      )
    }

    await updateValuation(body.valuation_id, {
      input_mode: body.input_mode,
      revenue: body.revenue,
      ebitda: body.ebitda,
      earnings: body.earnings ?? null,
      interest_expense: body.interest_expense ?? null,
      taxes_paid: body.taxes_paid ?? null,
      depreciation_amort: body.depreciation_amort ?? null,
      owner_salary: body.owner_salary,
      market_salary: body.market_salary,
      addbacks: body.addbacks,
      adj_ebitda: body.adj_ebitda,
      base_multiple: body.base_multiple,
      estimated_multiple: body.estimated_multiple,
      years_bonus: body.years_bonus,
      revenue_scale_bonus: body.revenue_scale_bonus,
      valuation_low: body.valuation_low,
      valuation_base: body.valuation_base,
      valuation_high: body.valuation_high,
      value_score: body.value_score,
      sliders: body.sliders,
      calculated_at: new Date().toISOString(),
    })

    await updateSession(body.session_id, { furthest_step: 'results' })

    return jsonResponse({ valuation_id: body.valuation_id })
  } catch (err) {
    await logError(null, 'save-valuation', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
