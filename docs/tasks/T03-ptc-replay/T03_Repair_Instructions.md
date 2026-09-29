# T03-R3 — Independent Architecture Review Repair Instructions

**Authority:** ChatGPT Web independent remote-source review, `REPAIR` (2026-09-29).  
**Repository:** `Dhandil/dsh-risk-advisor`, `main`.  
**Starting remote checkpoint:** `e27920777275d1e66cc0a7d505b897cb7b4cf164`.  
**Last executable Tested SHA:** `bb9d41c3a7a145222ec6eff53b0c49c356a4937c`.  
**Harness reference (read-only):** `ddefc45fbc7f8e46dd73185e68295696d1297887`.  
**Scope:** T03 `src/host/ptc-replay.ts` and relevant tests/docs only; minimum directly necessary changes elsewhere. Codex implements/self-tests/reports, ChatGPT independently accepts. No Acceptance Report.

## 0. Preflight and protection

Inspect local HEAD, branch, `git status --short`, origin and `git ls-remote origin refs/heads/main`; only safely fast-forward expected ancestry. Preserve every existing untracked/user drift, including `docs/risk-advisor-current/` and the untracked T01 final runtime instruction. Inspect reference Harness only read-only; protect `build.log`, `install.log`, `t0-*`, `undefined/`. Read T03 frozen Architecture/Implementation Instructions, T03 Execution Report, and actual implementation/tests. Stop on material unexpected divergence. No reset, clean, rebase, force push, Harness Core edit, permanent setting change or user-file overwrite.

## F1 — Ordering is necessary for unique START/SETTLE pairing (required)

Current `settlementFor()` finds unique matching tuples but never verifies `settle.seq > start.ref.seq`. A `tool/ptc-dispatch` that precedes its alleged `tool/ptc-dispatch-start` in the same step can therefore be reported as `PAIRED` with an `isError` fact. That is a false evidence claim.

Require *one* matching START, *one* matching SETTLE, exact same scoped structural tuple, **and causal source order** (`start.seq < settle.seq`) before yielding `PAIRED`. A reversed-order or otherwise impossible pairing must be explicit `UNRESOLVED` or appropriately classified orphan/invalid evidence; never supply `isError` as confirmed terminal for this pair. Record a bounded issue/DEGRADED status where global source provenance is invalid. Preserve existing START_ONLY and SETTLE_ONLY semantics for genuinely missing evidence; do not invent a start or change native events. Check that orphan projection does not silently discard an invalid earlier settle merely because the tuple counts happen to be one each.

Add a focused synthetic regression for a unique full-tuple SETTLE before START and a positive control for ordinary START then SETTLE; check output settlement status, issue/provenance and absence of falsely paired `isError`.

## F2 — Eliminate compound-key aliasing (required)

Current `scopeKey()`, `tupleKey()`, `subKey()` and top-call keys concatenate untrusted identifiers with `\u0000`, while `nonEmptyString()` accepts `\u0000` inside a field. Distinct field arrays can form the same key. This can produce a false tuple match even when `rootCallId` / `parentCallId` differ.

Replace ambiguous delimiter concatenation with an **injective field encoding**, e.g. `JSON.stringify([turn, step, ...fields])`, or safely nested maps / length-prefixed keys. Apply consistently to *all* composite lookup keys, including top parent/root, per-sub-id and full START/SETTLE tuple indexes. Preserve legitimate string identity; do not split PTC call IDs to infer ancestry.

Add an explicit negative regression using delimiter-containing identifiers: a START with `(rootCallId='r\u0000p', parentCallId='q')` and a SETTLE with `(rootCallId='r', parentCallId='p\u0000q')`, keeping the other fields identical, must **not** be `PAIRED`. Include at least one top-level parent/root or sub-id key-alias isolation control. A normal tuple continues to pair.

## F3 — Minimal scope/limits regression reinforcement (bounded)

R3-10 currently exercises `maxSourceEvents` but does not directly prove `maxPtcEvidence`. Add one fixture crossing that cap: projection must return `DEGRADED/LIMIT_EXCEEDED`, never report the truncated prefix as `COMPLETE`. Check that malformed sequence or overlapping turn/step boundaries cannot cause source occurrences from an invalid bracket to acquire a spurious `RECOVERED`/`PAIRED` status. If any such status remains in the degraded projection, make its trust limitation mechanically fail-closed (e.g. suppress affected edges or return empty degraded projection), without expanding into T04 general fault recovery. Verify reason/provenance is bounded and no arguments/content leak.

## Tests and release gates

1. Run focused F1/F2/F3 regressions and the existing R3-01..R3-12 suite. Label real `Session.append`/`snapshotEvents()` integration correctly; the actual PTC producer remains `NOT_RUN` unless a safe, pre-existing disposable producer can truly run without provider/privileged calls.
2. Re-run the full inherited regressions, with expected previous counts T01 9/9 and T02 16/16; preserve T01 live deployed Browser `NOT_RUN` and no T01/T02 product behavior drift.
3. Audit structural soundness: seq-order pairing; injective composite keys; no first/newest match; independent parent/root/settlement; no fake historical ExecutionId or native approval changes; output detachment/immutability; no raw arguments, output, prompt, errors or secrets in projection/logs.
4. Perform low-cost gates before final executable acceptance test: typecheck, relevant lint, build, Host export smoke, `pnpm pack --dry-run --json`, scoped/staged `git diff --check`, staged filename/secret audit. Record inherited warnings separately and do not claim a global all-files diff PASS when frozen historical Markdown hard-break whitespace is present. Run final applicable full 9+16+R3 test suite after fixes. T03 Canonical Full remains `NOT_APPLICABLE`.
5. No executable drift after the final Tested SHA without rerunning affected tests. Update `docs/tasks/T03-ptc-replay/Execution_Report.md` with exact changed files, focused/whole results, source evidence, F1/F2/F3 statuses, actual/not-run producer distinction, SHA, protected drift and scope exclusions. Commit implementation, separately commit report-only where feasible, normal push, and verify `HEAD == origin/main == git ls-remote origin refs/heads/main`.
6. Do **not** generate Acceptance Report or pronounce `ACCEPTED`; do not begin R4/R5, persistent Ledger, live Browser bridge, full Risk Engine, LLM or provider integration. If any STOP condition requires modifying Harness, changing accepted architecture or violating protected drift, preserve evidence and return `T03_R3_PARTIAL` / `BLOCKED` instead.

## Terminal Codex handoff

```text
Outcome: T03_R3_REPAIR_PUBLISHED / T03_R3_PARTIAL / BLOCKED
F1 / F2 / F3 verification:
R3 test count and proof level:
T01 9/9 + T02 16/16 regression:
Static/type/build/pack/export gates:
Actual PTC producer / T01 Live Browser status:
Tested SHA and Implementation SHA:
Execution_Report.md path:
Final origin/main SHA and equality check:
Protected drift / outstanding limitations:
STOP; no R4/R5. ChatGPT independently reviews.
```
