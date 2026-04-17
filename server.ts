/**
 * Bun local dev server — NOT deployed.
 * Uses the same Hono app as production.
 * Serves static files from public/ and js/.
 */

import { app } from './api/index.js'

const port = Number(process.env.PORT) || 8888
if (!process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN = `http://localhost:${port}`
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

    // API routes — delegate to Hono
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(req)
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
