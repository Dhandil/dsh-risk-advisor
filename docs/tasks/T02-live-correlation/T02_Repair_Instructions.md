# T02-R2 — Independent Architecture Review Repair Instructions

**Authority:** ChatGPT Web independent review: `REPAIR` (2026-09-29).  
**Canonical plugin repository:** `Dhandil/dsh-risk-advisor`, branch `main`.  
**Repair starting SHA:** `ee4348c3df21b31a1eebc0366bf9887fb3d59c25`.  
**Last executable Tested SHA:** `4404ef2d2cfcc1d9384b27ba43720a8e0708e96b`.  
**Harness read-only source baseline:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.  
**Allowed task:** only `T02-live-correlation` R2 contract and regressions. Codex is implementation/self-test agent, not acceptance authority.

## 0. Preflight and invariants

Check plugin `git status`, branch, HEAD, origin, remote refs and protected untracked files before edits; safely sync only on expected ancestry. Confirm the Harness reference and all drift in read-only mode. Never reset, clean, rebase, force-push, change Harness Core, change permanent/user settings, or stage unrelated handoff files. Read `T02_Architecture_Freeze.md`, `T02_Implementation_Instructions.md`, the existing `Execution_Report.md` and source/tests. Preserve prior R2 tests and T01 executable code. Keep the inherited T01 **Live Browser = NOT_RUN**; no R3–R5, Host–Browser bridge, risk judgment, LLM, provider or privileged action.

## F1 — ExecutionId must be fresh across index generations (required)

Current `src/host/correlation.ts` mints `ra-execution-${++this.sequence}` independently for every `ActiveExecutionIndex`. The first execution after disposal/HMR therefore reuses an earlier identifier. Fix with a Node-Host-supported unique identity source (e.g. `node:crypto` `randomUUID()` per traversal, or generation-unique prefix plus sequence). Keep the exact ToolExecution WeakMap and Session/callId Set semantics; the same observed object remains idempotent within a generation, while distinct traversals and distinct generations must never share ExecutionId. Do not derive it from callId, rootCallId or operationHash.

Update ordinal-based tests to treat ExecutionId as opaque, capture the real returned identity, and assert equality/inequality as appropriate. Add a regression creating **two separate indexes** (simulated HMR) and checking distinct minted IDs. Add a stale old-generation result while a new execution with the same Session/callId is active: the old result cannot remove the new member.

## F2 — Diagnostics must not mutate correlation authority (required)

Current `src/index.ts` provides the entire mutable `ActiveExecutionIndex` as `ctx.riskAdvisorCorrelation`, exposing `observePreExecute`, `observeResult`, `observeSessionEvent`, and `dispose` to diagnostic consumers. Provide a **narrow, read-only facade** instead: only necessary lookup and immutable/sanitized observation reads. Retain the internally owned mutable index for the three Host listeners and for focused test setup. Do not add any HTTP/Browser route or policy authority.

Current `snapshotObservations()` freezes its outer container but retains the internal nested `lookup` object. Return detached immutable snapshots, including copied/frozen `AMBIGUOUS.executionIds`; an external mutation of one returned snapshot must not alter the next snapshot or any active association. Preserve existing conflict/closed semantics. A contradictory repeated approval ID must remain clearly flagged and must not be usable as an unqualified FOUND by future diagnostic consumers; use a narrowly documented fail-closed observable representation rather than silently rewriting the original recorded evidence.

Add a test probing the context-provided facade (no mutation/dispose methods), testing nested snapshot alias resistance, and confirming internal native listeners continue to work. Use type-level assertions only as supplementary evidence; runtime objects must enforce the intended read-only boundary.

## F3 — Recover a clean T01 + T02 regression path (required)

The T02 `vitest.config.ts` edits caused T01 public Slot owner/child integration to fail with duplicate React resolution: previous T01 package evidence had 9/9, whereas the latest report records only 3/4 T01 integration. This is a **new test-configuration regression**, even though `src/client/**` was untouched.

Fix the test-only module resolution without modifying Harness or rewriting accepted T01 product code. Separate bounded R1/Browser-source and R2/compiled-Host Vitest configurations/scripts if that is the simplest robust solution. Execute and document **all 9 T01 tests passing** and the R2 suite passing in the repaired setup. Typecheck/build/pack and Host export smoke must remain green. Do not suppress the React failure or convert NOT_RUN into PASS.

## F4 — Complete cheap R2 negative controls (bounded)

The existing R2-12 case is explicitly `PARTIAL`: policy-never and bypass were not separately exercised. Add at least one real safe `ApprovalService` integration for `policy='never'` using an open-turn Session, verifying `approval/asked` still commits, `approval/request` waterfall is bypassed, native decision is rejected, and RA only records the observation. Add a negative control for an unobserved/short-circuited traversal yielding NOT_FOUND rather than a synthetic execution when safely testable; otherwise precisely explain the remaining gap and keep that subcase PARTIAL.

Keep evidence honest for other case matrices: add a small exact-object isolation negative control for two distinct Session objects with an equal textual ID (not just different IDs); include two separate approval IDs for a single uniquely active execution under R2-10 if missing. Do not expand to R3 durable replay, R4 ledger or R5 latency measurement. No invented latency target.

## Quality / delivery order

1. Focused implementation and pure R2 regressions.
2. Real pinned Harness ToolRuntime/Session/ApprovalService integration and negative controls.
3. Re-run all T01 regressions with consistent React resolution; verify no T01 product code drift.
4. Architecture/scope/lifecycle audit: exactly-once `next()`, exact Session object/callId identity, no history fallback, no native approval mutation, immutable facade and copies, generation-safe IDs, exact result retirement, no logs containing raw arguments/secrets.
5. Typecheck, relevant lint, build/export smoke, `pack`, and exact staged diff/scope checks. Record pre-existing warnings separately; never falsely claim a global PASS. No Canonical Full is defined for T02 (`NOT_APPLICABLE`). After last executable gates, no executable drift without rerunning affected checks.
6. Preserve this instruction file under `docs/tasks/T02-live-correlation/T02_Repair_Instructions.md`. Update existing `docs/tasks/T02-live-correlation/Execution_Report.md` as Codex's **execution/self-test report**, retaining the earlier partial state in Git history. Include revised per-case evidence level and honest unresolved gates, exact Tested/implementation SHA, report-only commit and remote verification. Do **not** produce an Acceptance Report or independently announce `ACCEPTED`.
7. Commit implementation/tests; commit report/docs-only separately where possible; normal push; verify local HEAD = origin/main = `git ls-remote origin refs/heads/main`. STOP at T02 and await ChatGPT's remote-code independent review.

**Explicit STOP:** any need to alter Harness Core, native Approval authority, frozen R2 architecture, permanent user settings, unrelated drift, unexpected remote history, or perform destructive Git actions. If a safe proof is unavailable, report `PARTIAL` with the precise limitation rather than fabricate success.

## Compact Codex terminal response

```text
Outcome: T02_R2_REPAIR_PUBLISHED / T02_R2_PARTIAL / BLOCKED
F1/F2/F3/F4 status:
R2 focused + real Host tests:
T01 full 9/9 regression:
Typecheck/lint/build/pack/static gates:
Remaining NOT_RUN/PARTIAL:
Tested SHA:
Execution_Report.md path:
Final remote SHA and equality check:
Protected drift:
STOP; no R3.
```
