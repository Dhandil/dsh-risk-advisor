import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../..')
const fixtureRoot = resolve(import.meta.dirname)
const clientBundle = resolve(repoRoot, 'lib/client.js')
const harnessRoot = resolve(repoRoot, '../../deepseek-harness')
const harnessPrimitives = resolve(harnessRoot, 'packages/client/ui-primitives/src')

export default {
  root: fixtureRoot,
  appType: 'spa',
  plugins: [{
    name: 'phase15-3a-source-identified-client-artifact',
    configureServer(server) {
      server.middlewares.use('/risk-advisor-client.js', async (_request, response, next) => {
        try {
          const content = await readFile(clientBundle)
          response.statusCode = 200
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(content)
        } catch (error) { next(error) }
      })
    },
  }],
  resolve: {
    alias: [{ find: '@phase15-pinned-harness-ui', replacement: harnessPrimitives }],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    strictPort: true,
    open: false,
    cors: false,
    hmr: false,
    fs: { strict: true, allow: [fixtureRoot, harnessPrimitives, resolve(harnessRoot, 'node_modules/.pnpm')] },
  },
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'] },
  clearScreen: false,
}
