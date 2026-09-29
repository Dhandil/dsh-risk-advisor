import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))
const harness = fileURLToPath(new URL('../../deepseek-harness/', import.meta.url))

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
  resolve: { alias: harnessSourceAliases, dedupe: ['react', 'react-dom'], tsconfigPaths: false },
  server: { deps: { inline: ['use-sync-external-store'] } },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    setupFiles: [],
    css: true,
  },
})
