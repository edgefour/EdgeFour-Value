import { handleCors, jsonResponse } from './_lib/cors.ts'
import { validateCalculateInput } from './_lib/validate.ts'
import { MOCK_CALCULATE_RESULT } from './_lib/mock-data.ts'
import { logError } from './_lib/db.ts'
import type { CalculateInput } from '../shared/types.ts'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as CalculateInput

    const validation = validateCalculateInput(body)
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400)
    }

    // TODO: Replace with real calculation logic ported from edgefour-value.html
    return jsonResponse(MOCK_CALCULATE_RESULT)
  } catch (err) {
    await logError(null, 'calculate', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
