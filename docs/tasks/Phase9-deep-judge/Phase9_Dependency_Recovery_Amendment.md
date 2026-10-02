# Phase 9 Dependency Recovery Amendment

## 0. Outcome

`PHASE9_DEPENDENCY_RECOVERY_FROZEN`

This amendment supersedes only the dependency-resolution portions of:

- `Phase9_Architecture_Freeze.md`
- `Phase9_Implementation_Instructions.md`

All other Phase-9 architecture, safety, trigger, A4, lifecycle, Browser V4, testing, Full, and publication rules remain unchanged.

Recovery start:

- Phase-9 implementation-instructions commit: `30d760c079d67987866e5aab5cc5b323ef1c3060`
- Codex stop outcome: `PHASE9_DEPENDENCY_UNAVAILABLE`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

No executable Phase-9 change existed when this amendment was frozen.

---

## 1. Recovered fact

The local Risk Advisor checkout cannot resolve:

`@deepseek-ai/dsh-subagent`

and registry installation is prohibited by the frozen workflow.

The correct response is **not** to add a registry dependency, local `file:` dependency, symlink, vendored copy, or Harness mutation.

The Deep Judge only consumes a small optional runtime capability surface:

```text
ctx capability: subagents
  getProvider('spawn')
  start('spawn', request)
```

The implementation does not need the concrete SubagentRuntime class identity.

---

## 2. Revised dependency decision

Phase 9 adds **no package dependency** on:

`@deepseek-ai/dsh-subagent`

Therefore:

- do not modify `peerDependencies` for it;
- do not modify `devDependencies` for it;
- do not add a `tsconfig.paths` entry for it;
- do not run package-manager installation;
- do not add a local `file:` path;
- do not import from Harness source-relative subagent files.

The prior Architecture Freeze §23 package-dependency requirement is superseded.

---

## 3. Structural public-seam adapter

Implement one internal, non-exported structural contract that mirrors only the pinned public methods/fields Risk Advisor consumes.

Equivalent minimum shape:

```ts
interface DeepJudgeSubagentCapabilitiesLike {
  readonly agentOptions: boolean
  readonly outputSchema: boolean
  readonly depthLimit: boolean
  readonly toolFilter: boolean
  readonly persona: boolean
}

interface DeepJudgeSubagentProviderLike {
  readonly name: string
  readonly capabilities: DeepJudgeSubagentCapabilitiesLike
  readonly inheritsParentContext: boolean
}

interface DeepJudgeSubagentResultLike {
  readonly structured?: unknown
  readonly stopReason: string
  readonly diagnostic?: string
}

interface DeepJudgeSubagentRunLike {
  readonly result: Promise<DeepJudgeSubagentResultLike>
  dispose(): Promise<void>
}

interface DeepJudgeSubagentRuntimeLike {
  getProvider(name: string): DeepJudgeSubagentProviderLike | undefined
  start(name: string, request: DeepJudgeSubagentStartRequestLike): Promise<DeepJudgeSubagentRunLike>
}
```

The request-like shape contains only the frozen Phase-9 request fields:

- parent;
- label;
- prompt;
- signal;
- agentOptions;
- outputSchema;
- maxDepth;
- toolFilter;
- persona.

Use already-resolvable public types from existing Risk Advisor dependencies where useful:

- `Agent` from `@deepseek-ai/dsh-agent`;
- `ContentBlock` from `@deepseek-ai/dsh-llm`;
- JSON-schema-compatible local/static type or an already exported type from current dependencies.

Do not export these adapter interfaces from the Risk Advisor package root.

---

## 4. Dynamic optional capability lookup

Do not augment Cordis `Context.subagents` locally.

Reason:

A local declaration merge could conflict with the real Harness package's own Context augmentation when both type universes are present.

Instead use the established erased-facade pattern.

Equivalent:

```ts
type DynamicCordisContext = {
  get(name: string, required?: boolean): unknown
}

function getSubagentsCapability(ctx: Context): DeepJudgeSubagentRuntimeLike | undefined {
  let value: unknown
  try {
    value = (ctx as unknown as DynamicCordisContext).get('subagents', false)
  } catch {
    return undefined
  }
  return isDeepJudgeSubagentRuntimeLike(value) ? value : undefined
}
```

The runtime shape guard must verify the exact callable methods Risk Advisor uses.

Do not trust an arbitrary object only because the capability name exists.

---

## 5. Cordis attachment

The plugin may still use:

`ctx.inject(['subagents'], ...)`

as an optional lifecycle attachment.

Inside the callback, resolve the capability through the structural adapter above.

If callback/context lookup yields no valid capability:

- do not throw plugin startup;
- Deep Judge remains unavailable;
- no start attempt;
- static failure reason only.

The top-level `inject = ['tools']` remains unchanged.

Do not make `subagents` a hard inject dependency.

---

## 6. Runtime contract validation

Immediately before every Deep Judge start, validate:

```text
runtime.getProvider is callable
runtime.start is callable

provider exists for exact name "spawn"
provider.name == "spawn"
provider.inheritsParentContext == false
provider.capabilities.agentOptions == true
provider.capabilities.outputSchema == true
provider.capabilities.depthLimit == true
provider.capabilities.toolFilter == true
provider.capabilities.persona == true
```

Any mismatch is:

`DEEP_JUDGE_PROVIDER_UNSUPPORTED`

or the frozen equivalent.

No fallback.

---

## 7. Why this is not a private Harness dependency

This adapter:

- does not import Harness private source;
- does not depend on concrete class identity;
- does not reach internal symbols;
- does not monkey-patch the runtime;
- consumes only methods/fields already frozen from the pinned public `ctx.subagents` contract;
- treats the service as optional at runtime.

This is standard capability-oriented structural typing.

The exact pinned contract remains documented by Phase-9 Preflight and independently reviewed against Harness source.

---

## 8. Production requirement

Removing the package dependency from Risk Advisor does **not** mean the production deployment can run Deep Judge without Harness subagent support.

When Deep Judge is explicitly enabled, the active Harness composition must still provide:

- `ctx` service named `subagents`;
- provider named `spawn`;
- required public capabilities;
- trusted parent composition assertion.

If absent, Deep Judge fails closed and Risk Advisor continues without A4.

---

## 9. Test strategy after recovery

Actual local spawn integration is now explicitly:

`NOT_RUN unless already resolvable without installation`

Do not install anything to make it run.

Mandatory focused tests instead use a deterministic public-seam structural fake that reproduces:

- provider discovery;
- capability flags;
- start request capture;
- returned run;
- structured result;
- result failure;
- disposal/quiescence.

The fake must not expose extra methods to product code.

Tests must prove the product only relies on the frozen public subset.

Do not claim structural-fake tests are actual Harness spawn integration.

---

## 10. Contract-drift guard

Add a focused source-level/type-level contract test around Risk Advisor's own adapter ensuring:

- no import string contains `@deepseek-ai/dsh-subagent`;
- no source import reaches `packages/subagent/`;
- package.json contains no new subagent dependency;
- start request still pins provider name `spawn`;
- requested capability preflight is complete.

This is a dependency-boundary proof, not a substitute for behavioral tests.

---

## 11. Packaging proof

Mandatory:

- build PASS;
- typecheck PASS;
- declarations PASS;
- `pnpm pack --dry-run --json` PASS;
- packed output has no runtime import/reference requiring `@deepseek-ai/dsh-subagent`.

If generated `.d.ts` leaks the private adapter or unresolved subagent package name, repair before Full.

---

## 12. Lockfile/package governance

Because no dependency is added:

- package.json should not gain a subagent entry;
- lockfile should not change for dependency resolution;
- no install step is needed.

Any unexpected lockfile mutation is out of scope and must be investigated rather than committed automatically.

---

## 13. Full/test ordering amendment

The original Phase-9 validation order remains.

Replace only:

`actual local spawn proof required/preferred`

with:

```text
structural public-seam integration proof = REQUIRED
actual local Harness spawn proof = OPTIONAL / NOT_RUN if unavailable without install
```

Execution Report must state the distinction explicitly.

---

## 14. STOP conditions

Stop again with:

`PHASE9_DEPENDENCY_RECOVERY_BLOCKED`

if implementation would require:

- registry install;
- `file:` dependency;
- symlink/junction dependency;
- direct import from Harness `packages/subagent/**`;
- Harness mutation/build solely to make the dependency resolvable;
- local Context augmentation conflicting with real Harness type ownership;
- weakening provider capability checks;
- turning `subagents` into a hard plugin startup dependency.

---

## 15. Recovery conclusion

Phase 9 implementation is re-authorized using:

`optional runtime capability + internal structural adapter`

No package installation is required.

All original Deep Judge safety boundaries remain frozen.
