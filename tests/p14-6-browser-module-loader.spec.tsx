// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { afterEach, describe, expect, it } from 'vitest'
import { createSlotRenderer } from '../../../deepseek-harness/packages/client/ui-renderer/src/client/scoped-slots.tsx'
import { createClientModuleSystem } from '../../../deepseek-harness/packages/client/modules/src/client/index.ts'
import type {
  ClientBundleRegistration, ClientModuleCreateOptions, ClientModuleLoaderTarget, DshWindow,
} from '../../../deepseek-harness/packages/client/modules/src/client/manifest.ts'

const PLUGIN_ID = '@dhandil/dsh-risk-advisor'
const BOOTSTRAP_ID = '@deepseek-ai/dsh-client-modules'
type WindowWithLoader = Window & DshWindow

afterEach(() => {
  cleanup()
  delete (window as WindowWithLoader).__ModuleLoader__
  for (const style of document.querySelectorAll('style[data-plugin="@dhandil/dsh-risk-advisor"]')) style.remove()
})

describe('Phase 14.6 production Browser bundle through pinned Harness module loader', () => {
  it('materializes lib/client.js, injects CSS, registers actual Client slots and disposes them', async () => {
    const bundle = readFileSync(resolve('lib/client.js'), 'utf8')
    expect(bundle).not.toMatch(/from\s+["']node:|require\(["']node:/u)
    const pendingQueue: ClientBundleRegistration[] = []
    let target!: ClientModuleLoaderTarget
    target = {
      mode: 'queue',
      pendingQueue,
      load: registration => { pendingQueue.push(registration) },
      create: (options: ClientModuleCreateOptions) => createClientModuleSystem(target,
        { id: BOOTSTRAP_ID, exports: { createClientModuleSystem } }, options),
    }
    ;(window as WindowWithLoader).__ModuleLoader__ = target
    // This intentionally evaluates the generated browser artifact so its real
    // package banner registers the factory through the Harness loader seam.
    // oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-call
    new Function(bundle)()
    expect(pendingQueue).toHaveLength(1)
    expect(pendingQueue[0]?.id).toBe(PLUGIN_ID)

    const staticModules = {
      react: await import('react'),
      'react/jsx-runtime': await import('react/jsx-runtime'),
      '@deepseek-ai/dsh-client-ui-primitives': await import('@deepseek-ai/dsh-client-ui-primitives'),
    }
    const loader = target.create({
      boot: {
        rev: 'p14-6-browser-smoke-v1',
        entries: [{ id: PLUGIN_ID, url: `/plugins/??${PLUGIN_ID}/client.js&rev=1`, rev: '1',
          inject: [], external: Object.keys(staticModules) }],
        batches: [{ phase: 'application', url: `/plugins/??${PLUGIN_ID}/client.js&rev=1`, rev: '1', entries: [PLUGIN_ID] }],
      },
      staticModules,
      loadBundle: async url => { throw new Error(`unexpected browser bundle fetch ${url}`) },
    })
    expect(target.mode).toBe('live')
    const plugin = await loader.import(PLUGIN_ID, '', {}) as {
      readonly apply: (ctx: Context) => void
      readonly inject: readonly string[]
    }
    expect(plugin.apply).toBeTypeOf('function')
    expect(plugin.inject).toEqual(['slots', 'locale'])
    expect(document.querySelectorAll(`style[data-plugin-css^="${PLUGIN_ID}/"]`).length).toBeGreaterThan(0)

    const ctx = new Context()
    ctx.provide('connection', {
      rpc: { call: async () => ({ ok: true, value: {} }) },
      generation: { getSnapshot: () => 1, subscribe: (_listener: () => void) => () => undefined },
    })
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.slots
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    slots.installLocale(locale)
    slots.install(createSlotRenderer())
    slots.register({ name: 'root', children: {
      'conversation.input.dock': { kind: 'list', scope: 'session' },
      'conversation.approval.detail': { kind: 'single', scope: 'session' },
    } }, () => null)
    const fiber = ctx.plugin({ name: 'p14-6-production-client-artifact', inject: [...plugin.inject], apply: plugin.apply })
    try {
      await fiber.await()
      const dockEntries = slots.entriesOfSlot('conversation.input.dock')
      expect(dockEntries.map(entry => entry.options.id)).toEqual([
        'risk-advisor-online-correction', 'risk-advisor-runtime-risk-awareness',
      ])
      expect(dockEntries.map(entry => entry.options.order)).toEqual([10, 20])
      expect(slots.entriesOfSlot('conversation.approval.detail')).toHaveLength(1)
    } finally {
      await fiber.dispose()
      await ctx.fiber.dispose()
    }
    expect(slots.entriesOfSlot('conversation.input.dock')).toHaveLength(0)
    expect(slots.entriesOfSlot('conversation.approval.detail')).toHaveLength(0)
    expect(document.querySelectorAll(`style[data-plugin-css^="${PLUGIN_ID}/"]`).length).toBeGreaterThan(0)
  })
})
