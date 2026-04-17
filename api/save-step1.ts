import { handleCors, jsonResponse } from './_lib/cors'
import { insertValuation, updateSession, logError } from './_lib/db'
import type { SaveStep1Request } from '../shared/types'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as SaveStep1Request

    if (!body.session_id || !body.business_name || !body.industry) {
      return jsonResponse(
        { error: 'session_id, business_name, and industry are required' },
        400,
      )
    }

    const { valuation_id } = await insertValuation({
      session_id: body.session_id,
      business_name: body.business_name,
      industry: body.industry,
      city: body.city ?? null,
      state: body.state ?? null,
      years_in_business: body.years_in_business,
      employees: body.employees ?? null,
    })

    await updateSession(body.session_id, { furthest_step: 'financials' })

    return jsonResponse({ valuation_id })
  } catch (err) {
    await logError(null, 'save-step1', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
