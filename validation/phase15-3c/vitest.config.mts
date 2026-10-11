import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from '../../vitest.config.ts'

const isolatedCache = process.env.RISK_ADVISOR_PHASE15_3C_VITEST_CACHE
if (isolatedCache === undefined || isolatedCache.length === 0) {
  throw new Error('RISK_ADVISOR_PHASE15_3C_VITEST_CACHE must point to a task-owned temporary directory')
}

export default mergeConfig(baseConfig, defineConfig({ cacheDir: isolatedCache }))
