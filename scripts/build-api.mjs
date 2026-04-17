import { build } from 'esbuild'
import { readdirSync } from 'fs'
import { join } from 'path'

// Find all top-level API function files (not _lib helpers)
const apiDir = 'api'
const entryPoints = readdirSync(apiDir)
  .filter(f => f.endsWith('.ts') && !f.startsWith('_'))
  .map(f => join(apiDir, f))

await build({
  entryPoints,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outdir: 'api-build',
  outExtension: { '.js': '.mjs' },
  // Keep node_modules external — Vercel installs them at deploy time
  packages: 'external',
})

console.log(`Bundled ${entryPoints.length} API functions → api-build/`)
