import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../..')
const fixtureRoot = resolve(import.meta.dirname)
const clientBundle = resolve(repoRoot, 'lib/client.js')
const harnessPrimitives = resolve(repoRoot, '../../deepseek-harness/packages/client/ui-primitives/src')
const cacheDir = process.env.RISK_ADVISOR_PHASE15_3C_VITE_CACHE
if (cacheDir === undefined || cacheDir.length === 0) throw new Error('RISK_ADVISOR_PHASE15_3C_VITE_CACHE is required')

export default {
  root: fixtureRoot,
  cacheDir,
  appType: 'spa',
  plugins: [{
    name: 'phase15-3c-source-built-client',
    configureServer(server) {
      server.middlewares.use('/risk-advisor-client.js', async (_request, response, next) => {
        try {
          response.statusCode = 200
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(await readFile(clientBundle))
        } catch (error) { next(error) }
      })
    },
  }],
  resolve: {
    alias: [{ find: '@phase15-pinned-harness-ui', replacement: harnessPrimitives }],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1', strictPort: true, open: false, cors: false, hmr: false,
    fs: { strict: true, allow: [fixtureRoot, harnessPrimitives, resolve(repoRoot, '../../deepseek-harness/node_modules/.pnpm')] },
  },
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime'] },
}
