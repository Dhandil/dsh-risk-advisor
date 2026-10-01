# Phase 5 Fast Judge Side-Path — Execution Report

## Outcome

`PHASE5_PUBLISHED_READY_FOR_REVIEW`

This is an implementation handoff only. Final repository review is external to Codex. No Acceptance Report was created and no later product phase was started.

## Baseline and provenance

| Item | SHA / value |
|---|---|
| Historical Phase 5 implementation start / frozen remote baseline | `99434f262276aef6d0805b19825ef67489db23c9` |
| Final repair start / required remote commit present | `d5ab0183c9637dd2274af85e20fb167f6099da49` |
| Residual repair start / required remote commit present | `274432ec4fee8edd45bddb363f8825062d2318eb` |
| Harness checkout used read-only | `ddefc45fbc7f8e46dd73185e68295696d1297887` |
| Historical Phase 5 implementation Tested SHA | `b32d4dbb612dbbf7dabee6e0254b01a44083a0c1` |
| Final repair executable/Tested SHA | `bcb07deb2f86344ec2f27c2cf70f9dde02c42b4e` |
| Final remote SHA | Verified after the report-only publication with `git rev-parse HEAD`, `git rev-parse origin/main`, and `git ls-remote origin refs/heads/main`; all three values were equal. |

The final remote hash is deliberately verified by the final publication command rather than copied into this report, because this report is itself part of the final commit tree. The command output is the authoritative post-publication value.

## Scope and file manifest

Implemented only the frozen Phase 5 bounded side path:

- `package.json` — optional pinned `@deepseek-ai/dsh-llm` peer/dev seam, Phase 5 tests and R5 follow-up scripts.
- `src/host/redactor.ts` — deterministic bounded SecretRedactor.
- `src/host/reviewer-seed.ts` — allowlisted operation seed, direct-user ring, TTL/capacity ownership and redacted capture.
- `src/host/context-builder.ts` — immutable bounded context/reviewer payload and ledger-health-only projection.
- `src/host/risk-engine.ts` — deterministic features, formal six-dimension A1/A2 artifacts and bounded Judge merge.
- `src/host/assessment-aggregator.ts` — pure P0–P9 recommendation aggregation.
- `src/host/fast-judge.ts` — fixed prompt, direct `ctx.llm.stream()` invocation, strict parser and finite scheduler.
- `src/host/assessment-envelope.ts` / `src/index.ts` — BOUND lifecycle integration, optional capability wiring, A1/A2 diagnostics and generation fencing.
- `tests/p5-fast-judge.unit.spec.ts`, `tests/p5-repair.unit.spec.ts`, `tests/p5-lifecycle.integration.spec.ts`, and `tests/p5-runtime.integration.spec.ts` — focused redaction, parser, aggregator, lifecycle/security, structural gate and real pinned LLM seam proofs.
- `benchmarks/r5-phase5.mjs`, `tests/r5-phase5-benchmark-smoke.spec.ts`, `tests/r5-phase5-benchmark-full.spec.ts` — distinct local Phase-5 R5 follow-up.
- `evidence/r5-phase5-follow-up.json` — bounded local measurement evidence only.

The existing `lib/`, `node_modules/`, `pnpm-lock.yaml`, `.vitest-cache/`, `docs/risk-advisor-current/`, and prior repair-document drift were preserved unmodified and excluded from the commits.

## Frozen architecture mapping

## Final Repair F1–F5

- F1 now uses exact closed adapters only (`read`, `write`, `edit`, `bash`, `pwsh`, `web_fetch`, `web_search`), requires operation-kind agreement, reads plain/null-prototype argument objects through own data descriptors, rejects accessors and arbitrary aliases, and fails credential-bearing malformed URLs closed.
- F2 now keeps deletion/configuration/permission/code facts deterministic and narrowly mapped, maps every retained finding basis to an existing RiskFeature, preserves escalation/repeated-failure policy flags, and projects positive-proof false placeholders as `UNKNOWN / NOT_PROVEN` for Judge input.
- F3 constructs local deterministic A1 before reviewer serialization. Reviewer payload failure/redaction degradation leaves A1 readable and skips Judge; successful Phase-5 BOUND records no longer retain `ASSESSOR_NOT_IMPLEMENTED`, while genuine P1B-only records retain it.
- F4 validates duplicate JSON object keys recursively with string-aware parsing before `JSON.parse`, preserves strict schema/8192-character limits, and rechecks bounds after redaction.
- F5 adds expanded focused and real pinned `ctx.llm.stream()` lifecycle evidence for source/privacy caps, route/eligibility, stream rejection, scheduler saturation/cancellation/timeout, decision/dispose/HMR fencing, identity isolation, duplicate asked events, and Native Approval non-interference.

## Residual Repair R1–R2

- R1 maps `reversibility` AssessmentFindings to primary dimension `RISK`, while retaining `recovery.reversible` as the valid basis feature and leaving Phase-4 RuleFinding category/severity/hardness unchanged. The focused finding matrix proves destructive/system-change/credential/network/install/reversibility → `RISK`, permission → `PRIVILEGE`, and shell-ambiguity/unknown-tool/path-alias/workspace-boundary → `EVIDENCE_QUALITY`; every basisFeatureId remains present in RiskFeatureSet.
- R2 classifies malformed HTTP(S) URL userinfo only when `@` occurs in the authority before the first `/`, `?`, or `#`; malformed sensitive query material remains fail-closed, ordinary path `@` is not broadly classified, and valid credential URLs remain redacted and idempotent.
- Residual executable/Tested SHA: `de8a7649dd3ce6deca5bb797ac6fc233abd740f3`.

- The existing exact-live capture chain remains the only capture path: foundation → failure-chain → Phase 4 rules → redacted reviewer seed.
- A deterministic A1 is synchronously created for every exact BOUND approval when the Phase 1–4 diagnostics are available. A1 uses the existing assessment identity and remains the latest artifact until a valid A2 exists.
- Context is bounded to allowlisted operation fields, accepted deterministic findings, Phase 3 summary, the direct-user ring, and ledger health metadata. No raw argument tree, full Session, full Ledger, approval reason, tool output, or ReviewerPayload is stored in a RiskAssessment.
- Judge is disabled by default. Explicit enablement requires finite timeout/concurrency/pending bounds and `maxTokens <= 512`; route selection is explicit reviewer pair first, then exact session request configuration.
- Judge uses one direct `ctx.llm.stream()` attempt with the fixed versioned system prompt, one bounded data message, `temperature=0`, bounded tokens, no tools, no session ID, no purpose, no retry and no Agent/session mutation.
- Strict parsing rejects fences, trailing text, extra keys, bad enums, unknown feature references, malformed result coverage, non-hypothesis facts, oversized values and non-text stream blocks. Late results are fenced by approval generation and closed/disposed state.
- A2 only fills requested UNKNOWN semantic dimensions. Deterministic/hard facts and Evidence Quality are immutable/local. Model alternatives are `MODEL_SUGGESTED` and `UNVERIFIED`; they cannot trigger P3.
- Final recommendation is produced by the pure local P0–P9 aggregator. Native Approval remains the sole answerer and outcome authority.

## Verification matrix

| Gate | Result |
|---|---|
| Phase 5 focused (`pnpm test:p5`) | PASS — 4 files, 23 tests |
| Phase 4 regression (`pnpm test:p4`) | PASS — 2 files, 17 tests |
| Phase 3 regression (`pnpm test:p3`) | PASS — 2 files, 17 tests |
| Phase 2 regression (`pnpm test:p2`) | PASS — 2 files, 15 tests |
| Phase 1B regression (`pnpm test:p1b`) | PASS — 2 files, 14 tests |
| Phase 1C regression (`pnpm test:p1c`) | PASS — 1 file, 8 tests |
| R4 regression (`pnpm test:r4`) | PASS — 2 files, 21 tests |
| Typecheck (`pnpm typecheck`) | PASS |
| Host build (`pnpm run build`) | PASS; Host and Client bundles emitted |
| Host export smoke | PASS; `lib/index.js` imports and exposes Host entry functions |
| Client export/static smoke | PASS; `node --check lib/client.js`; no Fast Judge/LLM dependency in Client bundle |
| Declaration/export audit | PASS; Phase 5 public surface is read-only types/diagnostics; mutable scheduler/provider handles are not exported |
| Pack gate (`pnpm pack --dry-run --json`) | PASS; package contains only declared bundles, declarations, package metadata and README |
| Diff/privacy/scope gate | PASS; `git diff --check`, pinned Harness read-only SHA, no production deprecated Session readers, no child process/CLI/subagent/network fixture |
| Phase 5 R5 smoke (`pnpm run bench:r5:p5:smoke`) | PASS — 1 file, 1 test |
| Phase 5 R5 full (`pnpm run bench:r5:p5`) | PASS — 1 file, 1 test, 32 local samples; `LOCAL_MOCK_ONLY` |
| Residual R1–R2 focused assertions | PASS — included in the 4-file / 23-test Phase-5 focused suite |

## Real seam and Native Approval proof

`tests/p5-runtime.integration.spec.ts` registers a deterministic local adapter on the real pinned `LlmRuntime` and exercises the coordinator through `ctx.llm.stream()`. The direct healthy-ledger seam observes A1 before A2, verifies one request, the fixed system prompt, omitted `tools`, `sessionId`, and `purpose`, and verifies no durable `assistant/message` was appended. A separate real Host `apply()` path proves that the live incomplete ledger is structurally degraded and therefore remains A1-only/fail-closed.

Native Approval is not awaited, answered, rejected, or modified by Phase 5. The R5 native parity path observed exactly one `allowed-once` answerer. Approval decision/Session disposal closes and fences the advisory generation; scheduler disposal aborts and drains owned stream work.

## Privacy and trust proof

- The redactor covers the frozen secret vocabulary, bounded URL/userinfo/query forms, malformed credential-bearing URL fail-closed behavior, and idempotence-tested output.
- Seeds use only allowlisted read/write/edit path, shell command/workdir, web-fetch URL, and bounded web-search queries. Write/edit content and approval justification are excluded.
- Direct user input is observed only from committed `user/message` events with `source.kind === 'user'`, capped at four messages/eight thousand characters, and SecretRedacted before context construction.
- Rationale, proposed facts, and model alternative strings are SecretRedacted before storage. Proposed facts remain `HYPOTHESIS`; no hypothesis becomes a feature or hard fact.
- No raw prompt/argument persistence, secret logging or hashing, full ReviewerPayload logging, production provider/network fixture, tool schema, child process, Agent Loop, Main Agent inbox/followup/steer/inject mutation, Browser product redesign, Evidence Collector, postcondition verifier or Deep Judge was added.

## R5 follow-up and non-claims

The distinct follow-up is `R5_PHASE5_FOLLOW_UP`, FULL mode, 32 samples. It measured local context/seed-redactor/A1/in-memory publish, finite scheduler queue/execute behavior, saturation, and Native Approval coexistence. Ranges and bounded metadata are in `evidence/r5-phase5-follow-up.json`.

All measurements are labeled `LOCAL_MOCK_ONLY`. Real provider/model latency is `REAL_PROVIDER_NOT_RUN`; production timeout/concurrency/queue policy is `PRODUCTION_POLICY_UNDETERMINED`. The local mock numbers are not production Assessment or Judge performance claims.

## Fresh complete regression provenance

The exact command was run once after the residual repair executable commit and before this report-only change:

```text
git rev-parse HEAD
pnpm test
```

The first line was `de8a7649dd3ce6deca5bb797ac6fc233abd740f3`. The complete chain passed 12 test commands, 24 test files, and 173 tests. The R1 fixture intentionally emits expected fault logs while its tests pass; there were no failed tests.

No executable, test, configuration or package semantic changes were made after this Full. The only post-Full additions are this report and the declared bounded benchmark evidence.

## Inherited open boundaries

The following remain open without promotion: F-006 PARTIAL; F-013 PARTIAL; guard-returned denial without a full witness PARTIAL/UNKNOWN; true disk/process restart NOT_RUN; native real PTC producer NOT_RUN; deployed Live Browser/profile NOT_RUN; WebWorker NOT_VALIDATED; newer Harness/V4 NOT_VALIDATED; Phase 7 semantic verification not implemented; Phase 8 canonical/git/checkpoint evidence not implemented; Phase 9 Deep Judge not implemented; and real-provider Judge latency/production scheduler policy undetermined.

## Tested-to-remote proof

The historical executable commit is `b32d4dbb612dbbf7dabee6e0254b01a44083a0c1`; the final repair executable commit is `bcb07deb2f86344ec2f27c2cf70f9dde02c42b4e`; the residual repair executable commit is `de8a7649dd3ce6deca5bb797ac6fc233abd740f3`. After the residual report/evidence commit is pushed, the following exact commands are run:

```text
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
git diff --name-only de8a7649dd3ce6deca5bb797ac6fc233abd740f3 HEAD
```

The three final SHA outputs are required to be equal. The residual Tested→remote path must contain only `docs/tasks/Phase5-fast-judge-side-path/Execution_Report.md` and `docs/tasks/Phase5-fast-judge-side-path/evidence/r5-phase5-follow-up.json`; all pre-existing untracked drift remains outside the commits.
