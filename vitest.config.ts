import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))
const harness = fileURLToPath(new URL('../../deepseek-harness/', import.meta.url))
const singleReact = resolve(root, 'node_modules/react')
const singleReactDom = resolve(root, 'node_modules/react-dom')
const singleSyncStore = resolve(root, 'node_modules/use-sync-external-store')

// The R1 Slot tests intentionally import Harness browser source. Pin every
// React entry point to the same physical runtime used by the test runner;
// dedupe alone does not prevent Vite from resolving a linked source import
// through a nested Harness package dependency.
const singleReactRuntime = [
  { find: /^react$/, replacement: singleReact },
  { find: /^react\/jsx-runtime$/, replacement: resolve(singleReact, 'jsx-runtime.js') },
  { find: /^react\/jsx-dev-runtime$/, replacement: resolve(singleReact, 'jsx-dev-runtime.js') },
  { find: /^react-dom$/, replacement: singleReactDom },
  { find: /^react-dom\/client$/, replacement: resolve(singleReactDom, 'client.js') },
  { find: /^react-dom\/test-utils$/, replacement: resolve(singleReactDom, 'test-utils.js') },
  { find: /^react-dom\/server$/, replacement: resolve(singleReactDom, 'server.js') },
  { find: /^use-sync-external-store$/, replacement: singleSyncStore },
  { find: /^use-sync-external-store\/shim$/, replacement: resolve(singleSyncStore, 'shim/index.js') },
  { find: /^use-sync-external-store\/shim\/with-selector(?:\.js)?$/, replacement: resolve(singleSyncStore, 'shim/with-selector.js') },
]

const harnessSourceAliases = {
  '@deepseek-ai/cordis': resolve(harness, 'vendor/cordis/src'),
  '@deepseek-ai/dsh-client-locale': resolve(harness, 'packages/client/locale/src'),
  '@deepseek-ai/dsh-client-ui-approval': resolve(harness, 'packages/client/ui-approval/src'),
  '@deepseek-ai/dsh-client-ui-chat': resolve(harness, 'packages/client/ui-chat/src'),
  '@deepseek-ai/dsh-client-ui-conversation': resolve(harness, 'packages/client/ui-conversation/src'),
  '@deepseek-ai/dsh-client-ui-primitives': resolve(harness, 'packages/client/ui-primitives/src'),
  '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts': resolve(harness, 'packages/client/ui-renderer/src/client/bind.ts'),
  '@deepseek-ai/dsh-client-ui-renderer/src/client/scoped-slots.tsx': resolve(harness, 'packages/client/ui-renderer/src/client/scoped-slots.tsx'),
  '@deepseek-ai/dsh-client-ui-renderer/client': resolve(harness, 'packages/client/ui-renderer/src/client/index.ts'),
  '@deepseek-ai/dsh-client-ui-renderer/src': resolve(harness, 'packages/client/ui-renderer/src'),
  '@deepseek-ai/dsh-client-ui-renderer': resolve(harness, 'packages/client/ui-renderer/src'),
  '@deepseek-ai/dsh-client-ui-session': resolve(harness, 'packages/client/ui-session/src'),
  '@deepseek-ai/dsh-client-ui-slots': resolve(harness, 'packages/client/ui-slots/src'),
  '@deepseek-ai/dsh-agent': resolve(harness, 'packages/core/agent/lib/index.js'),
  '@deepseek-ai/dsh-tools': resolve(harness, 'packages/core/tools/lib/index.js'),
  '@deepseek-ai/dsh-user-approval': resolve(harness, 'packages/interaction/user-approval/lib/index.js'),
  '@deepseek-ai/dsh-system-prompt': resolve(harness, 'packages/core/system-prompt/lib/index.js'),
  '@deepseek-ai/dsh-client-store': resolve(harness, 'packages/client/store/src'),
  '@deepseek-ai/dsh-typert-protocol': resolve(harness, 'packages/typert/protocol/src/index.ts'),
  '@deepseek-ai/dsh-llm': resolve(harness, 'packages/llm/llm/lib/index.js'),
  '@deepseek-ai/dsh-session': resolve(harness, 'packages/core/session/lib/index.js'),
}

export default defineConfig({
  root,
  cacheDir: `${root}/.vitest-cache`,
  resolve: {
    alias: [
      ...singleReactRuntime,
      ...Object.entries(harnessSourceAliases).map(([find, replacement]) => ({ find, replacement })),
    ],
    dedupe: ['react', 'react-dom'],
    tsconfigPaths: false,
  },
  server: { deps: { inline: ['use-sync-external-store'] } },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    setupFiles: [],
    css: true,
  },
})
