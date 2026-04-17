/**
 * Node.js local dev server — NOT deployed.
 * Uses the same Hono app as production.
 * Serves static files from public/ and js/.
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
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
  return MIME_TYPES[extname(path)] ?? 'application/octet-stream'
}

async function tryFile(filePath: string): Promise<Buffer | null> {
  try {
    await stat(filePath)
    return await readFile(filePath)
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${port}`)

  // API routes — delegate to Hono
  if (url.pathname.startsWith('/api/')) {
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }

    const body = ['GET', 'HEAD'].includes(req.method!)
      ? undefined
      : await new Promise<Buffer>((resolve) => {
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', () => resolve(Buffer.concat(chunks)))
        })

    const honoReq = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    })

    const honoRes = await app.fetch(honoReq)
    res.writeHead(honoRes.status, Object.fromEntries(honoRes.headers.entries()))
    const buf = await honoRes.arrayBuffer()
    res.end(Buffer.from(buf))
    return
  }

  // Static files: try public/ then root
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname
  const candidates = [
    join('public', pathname),
    `.${pathname}`,
  ]

  for (const filePath of candidates) {
    const data = await tryFile(filePath)
    if (data) {
      res.writeHead(200, { 'Content-Type': getMime(filePath) })
      res.end(data)
      return
    }
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(port, () => {
  console.log(`Dev server at http://localhost:${port}`)
})
