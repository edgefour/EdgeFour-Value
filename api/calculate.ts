import { handleCors, jsonResponse } from './_lib/cors'
import { validateCalculateInput } from './_lib/validate'
import { calculate } from './_lib/calculator'
import { logError } from './_lib/db'
import type { CalculateInput } from '../shared/types'

export async function POST(req: Request): Promise<Response> {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const body = (await req.json()) as CalculateInput

    const validation = validateCalculateInput(body)
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400)
    }

    const result = calculate(body)
    return jsonResponse(result)
  } catch (err) {
    await logError(null, 'calculate', String(err))
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
