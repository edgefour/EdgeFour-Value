/**
 * Bun local dev server — NOT deployed.
 * Routes /api/* requests to the corresponding function handlers.
 * Serves static files from public/ and js/.
 */

import { POST as saveSession } from './api/save-session'
import { POST as saveStep1 } from './api/save-step1'
import { POST as calculate } from './api/calculate'
import { POST as saveValuation } from './api/save-valuation'
import { POST as submitQuiz } from './api/submit-quiz'
import { POST as trackEvent } from './api/track-event'
import { POST as resendWebhook } from './api/resend-webhook'
import { POST as calendlyWebhook } from './api/calendly-webhook'

const port = Number(process.env.PORT) || 8888
if (!process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN = `http://localhost:${port}`
}

const routes: Record<string, (req: Request) => Promise<Response>> = {
  '/api/save-session': saveSession,
  '/api/save-step1': saveStep1,
  '/api/calculate': calculate,
  '/api/save-valuation': saveValuation,
  '/api/submit-quiz': submitQuiz,
  '/api/track-event': trackEvent,
  '/api/resend-webhook': resendWebhook,
  '/api/calendly-webhook': calendlyWebhook,
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN!,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function getMime(path: string): string {
  const ext = path.slice(path.lastIndexOf('.'))
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // API routes
    const handler = routes[url.pathname]
    if (handler) {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
      }
      return handler(req)
    }

    // Static files: try public/ then js/
    const path = url.pathname === '/' ? '/index.html' : url.pathname

    const candidates = [
      `./public${path}`,
      `.${path}`, // serves js/ directly
    ]

    for (const filePath of candidates) {
      const file = Bun.file(filePath)
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': getMime(filePath) },
        })
      }
    }

    return new Response('Not found', { status: 404 })
  },
})

console.log(`Dev server at http://localhost:${port}`)
