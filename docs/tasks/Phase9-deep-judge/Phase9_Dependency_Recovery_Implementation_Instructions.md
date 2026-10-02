# Phase 9 Dependency Recovery Implementation Instructions

## 0. Required outcome

Resume Phase 9 from the dependency stop using the frozen structural-capability recovery.

Final Phase-9 handoff remains:

`PHASE9_PUBLISHED_READY_FOR_REVIEW`

Do not declare acceptance.

Do not create `Acceptance_Report.md`.

Do not start Phase 10.

---

## 1. Sync and verify recovery baseline

Sync `origin/main`.

Required recovery-doc baseline:

`820fabd27aa99c5ff79142b9662a89c3479a7637`

Verify:

- no executable Phase-9 implementation commit exists before this recovery;
- user drift remains unchanged;
- Harness Core remains read-only;
- no registry install was performed.

Read, in order:

1. `Phase9_Preflight.md`
2. `Phase9_Architecture_Freeze.md`
3. `Phase9_Dependency_Recovery_Amendment.md`
4. `Phase9_Implementation_Instructions.md`

The Recovery Amendment supersedes only the dependency-specific clauses.

---

## 2. Do not install the missing package

Do not run:

- `pnpm add @deepseek-ai/dsh-subagent`;
- `npm install`;
- registry resolution;
- local `file:` dependency;
- symlink/junction workaround;
- direct source import from sibling Harness subagent package.

Do not add `@deepseek-ai/dsh-subagent` to:

- peerDependencies;
- devDependencies;
- dependencies;
- tsconfig paths.

No lockfile mutation is expected from this recovery.

---

## 3. Implement the internal structural seam first

Create a Host-private module, suggested:

`src/host/deep-judge-subagent.ts`

It owns:

- the minimal `DeepJudgeSubagentRuntimeLike`;
- provider/capability/run/result/request structural types;
- dynamic capability lookup;
- runtime shape guards;
- provider preflight.

It must not export from package root.

Use no import from `@deepseek-ai/dsh-subagent`.

Use existing resolvable types only where helpful.

The implementation should remain valid if the concrete Harness class changes internally while the public method/field contract stays the same.

---

## 4. Dynamic capability lookup

Use erased Context lookup.

Equivalent behavior:

```ts
(ctx as unknown as {
  get(name: string, required?: boolean): unknown
}).get('subagents', false)
```

Handle:

- missing value;
- getter throw;
- non-object;
- missing `getProvider`;
- missing `start`.

All fail closed.

Do not locally declaration-merge `Context.subagents`.

---

## 5. Provider preflight

Provide one pure/near-pure preflight function.

For exact provider `spawn`, require:

- provider object present;
- provider.name === 'spawn';
- inheritsParentContext === false;
- five required capabilities true.

No optional coercion.

No truthy-object shortcuts.

No fallback provider.

Return a bounded static failure classification only.

---

## 6. Continue original Phase-9 implementation

After structural seam is focused-green, execute the original Phase9 Implementation Instructions for:

- config;
- parent binding;
- trigger;
- payload;
- static persona;
- strict output schema/candidate;
- dedicated scheduler;
- optional subagents attachment;
- A4 merge;
- provenance;
- Bridge V4;
- Client V4;
- tests;
- benchmark;
- boundary proof;
- pre-Full gates;
- exact executable SHA;
- exactly one fresh complete Full;
- Execution Report.

All original safety rules remain.

---

## 7. Optional capability attachment

Keep:

`export const inject = ['tools']`

unchanged.

Add optional lifecycle attachment through:

`ctx.inject(['subagents'], ...)`

Inside callback:

- resolve via structural lookup;
- attach only a valid capability generation;
- on detach/replacement abort/drain owned Deep Judge work;
- fence stale generation.

If no valid runtime is available, do not fail plugin startup.

Deep Judge simply reports capability unavailable when eligible.

---

## 8. Tests specific to dependency recovery

Add direct tests for:

1. no subagent package dependency in package.json;
2. no source import of `@deepseek-ai/dsh-subagent`;
3. no source import from sibling `packages/subagent/**`;
4. dynamic Context lookup missing -> unavailable;
5. lookup throw -> unavailable;
6. malformed runtime -> unavailable;
7. valid structural runtime accepted;
8. spawn missing -> unavailable;
9. wrong provider name -> unsupported;
10. inheritsParentContext=true -> unsupported;
11. each missing capability -> unsupported;
12. exact request captured by structural fake;
13. run result consumed;
14. returned run always disposed;
15. no extra fake-only methods are required by product code.

Use a narrow structural fake.

Do not make it implement concrete Harness classes.

---

## 9. Declaration/package boundary proof

After implementation:

- typecheck;
- build;
- inspect generated `.d.ts`;
- pack dry-run.

Prove no occurrence of:

`@deepseek-ai/dsh-subagent`

exists in generated JS/declarations/package manifest.

Also prove no sibling absolute/local Harness path leaks into packed output.

A test/source path in docs is not a runtime-package leak; report executable/package surfaces separately.

---

## 10. Actual spawn integration status

Because the concrete package is unavailable locally:

- do not attempt registry installation;
- actual local Harness spawn integration may remain NOT_RUN.

If it becomes resolvable naturally from the unchanged workspace during normal build, it may be run without changing dependency state.

Otherwise structural public-seam integration is the required executable proof.

Execution Report must say:

```text
Harness real spawn integration: NOT_RUN (package unavailable without install)
Structural public-seam integration: PASS
External provider/model calls: 0
```

Do not call the structural fake a real subagent run.

---

## 11. Benchmark amendment

Phase-9 benchmark may use the structural fake runtime + deterministic local reviewer result.

It must still execute real Risk Advisor product code:

- trigger;
- start request creation;
- scheduler;
- result validation;
- A4 merge;
- cancellation;
- disposal;
- Browser stage changes where applicable.

It must not hard-code the final A4 without traversing the product runner path.

---

## 12. Package/lockfile rule

Expected package.json delta for Phase 9:

- scripts may add `test:p9` / Phase-9 benchmark commands;
- no `@deepseek-ai/dsh-subagent` dependency entry.

Expected lockfile:

- unchanged unless an already-required non-dependency script/tool update genuinely changes it;
- any dependency-driven lockfile change is forbidden under this recovery.

---

## 13. Pre-Full order

Use the original frozen validation order.

Add recovery-specific gates before other P9 focused completion:

```text
dependency-boundary focused tests
-> structural seam tests
-> remaining P9 focused
-> inherited regression sequence
-> static/package/privacy gates
-> P9 benchmark
```

Then commit exact executable SHA and run exactly one fresh complete `pnpm test`.

---

## 14. Execution Report additions

Add a section:

`Dependency Recovery`

Record:

- original stop: `PHASE9_DEPENDENCY_UNAVAILABLE`;
- recovery amendment SHA: `820fabd27aa99c5ff79142b9662a89c3479a7637`;
- no registry install;
- no local file/symlink dependency;
- no package dependency on dsh-subagent;
- structural seam exact surface;
- actual spawn integration status;
- generated declaration/package scan;
- lockfile status.

---

## 15. STOP conditions

Stop with:

`PHASE9_DEPENDENCY_RECOVERY_BLOCKED`

if any implementation step requires:

- installing dsh-subagent;
- adding a file/symlink path dependency;
- editing Harness;
- importing Harness subagent private/source code;
- weakening the frozen Deep Judge isolation/provider checks.

Otherwise continue all the way through publication.

Final handoff:

`PHASE9_PUBLISHED_READY_FOR_REVIEW`
