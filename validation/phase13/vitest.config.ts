import { defineConfig } from 'vitest/config'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import base from '../../vitest.config.ts'

export default defineConfig({
  ...base,
  cacheDir: join(tmpdir(), 'dsh-risk-advisor-phase13-vitest-cache-v1'),
  test: {
    ...base.test,
    include: ['validation/phase13/phase13-1-validation-harness.spec.ts'],
  },
})
