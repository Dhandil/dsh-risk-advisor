# Phase 13.3 — Bootstrap Sessions Within Bounded Live Functional Probe

Date: 2026-10-08

## Architecture decision

`RISK_ADVISOR_PHASE13_3_NEW_SESSION_FUNCTIONAL_PROBE_AUTHORIZED`

**Replace the unproductive requirement that two previously populated Sessions exist before ANY Agent work.** This is an amendment to the scope-limited live-functional-probe procedure, not a change to accepted Risk Advisor F1/F2 contracts or to Product/validation/Harness code.

The latest local executor results reported:
- `RISK_ADVISOR_PHASE13_3_SESSION_IDENTITY_UNPROVEN` at local commit `4d50895b1470185d9f84ee6187930fc6d1066e76`: normal bilingual Session tree discovered, but fewer than two usable preexisting nonblank Sessions; one Host and one browser cleaned; zero Agent, provider and Tool calls.
- `RISK_ADVISOR_PHASE13_3_ARTIFACT_INVENTORY_READY_FOR_REVIEW` at local commit `f40a598858a81cc691e32659ff99e8bcb430419b`: V2 root contains 20 task directories, 49 files and 35 subdirectories, no symlinks; zero proven safe-to-delete files; prior Session workspace uninspected.

**Remote-provenance caveat:** These two commits were NOT available in GitHub at review time. Before running the amended probe, the executor must publish and remotely verify the unchanged docs-only reports on their separate existing branches. Do not claim accepted report provenance otherwise.

Existing confirmed execution/product baselines remain pinned:
- Risk Advisor accepted Product `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`;
- installed Risk Advisor Client `lib/client.js` SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`;
- pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Grounding from pinned Harness

In `packages/client/ui-workspace/src/client/rows/Rows.tsx`, the normal Session row renders `role="treeitem"`, with `aria-selected={node.id === currentId}`; click calls `onOpen(node.id)`.

`WorkspaceBrowser.tsx` renders the Session tree as `role="tree"` with localized `aria-label`; `ui-workspace/src/client/locales.ts` defines `会话` or `Sessions`. `ui-sidebar/src/client/locales.ts` defines `打开侧边栏` or `Open sidebar`.

A fixed count of already-populated Sessions is **not** a product invariant. The regular Web UI can create and select Sessions; the evaluator should test user operations instead of requiring seeded historical state.

## Revised one-run functional protocol

1. Preflight current Web profile bundle hash, clean pinned Harness/Product tracked sources, available ephemeral Playwright/Chromium, and a designated fresh **exclusive** task-output root under OS temporary storage. Capture ownership and paths of generated files; do not touch historical V2 roots.
2. Start **one** normal pinned `dsh --profile web --no-open` Host and one fresh nonpersistent Chromium context. Use native process-token handoff only in memory and direct `page.goto`; never use the user's Chrome profile/omnibox. Do not install Browser MCP or broaden browser permissions.
3. Expand sidebar if collapsed; select/create **normal Session A** through the real Web UI. Submit **one** low-impact Agent task scoped strictly to one exclusively owned fixture folder. Let the native Agent choose Tools; current model/approval settings remain authoritative. Record on-page task/Tool evidence and timely Client-originated Online Correction `VIEW`/Finding responses. Do not presume the first empty read scores F1/F2.
4. Select/create **normal Session B** through the same UI and submit one distinct low-impact task into its *own* exclusive fixture folder. After normal UI persists both sessions, prove **A → B → A** with `aria-selected` transitions and fresh Client-originated `risk-advisor/online-correction` request identities `sidA → sidB → sidA`. Require request/response equality for each observation. Keep identifiers only in memory; don't count old in-flight poll responses as a new selection read.
5. **If correlation fails after these two tasks**, stop; preserve independently observed facts but mark any unbound findings `UNSCORABLE`. Do not bootstrap/restart again to satisfy a selector assumption.
6. **Only if correlation succeeds**, permit up to two further distinct safe real Agent tasks within the same run (maximum **4 tasks / 40 Tool executions total**), for an organic F1 repeat-failure opportunity and supported F2 postcondition opportunity. Never force duplicate Tool retries, fabricate a mismatch, alter Product, invoke a custom RPC or create a fake Harness.
7. End by completing postcondition/Finding observation while the 5-minute retention window is live. Score F1/F2 only when independent eligible Tool facts and attributable Client Finding evidence exist. No positive means `POSITIVE_COVERAGE_INSUFFICIENT`; absent/empty `VIEW` alone is not a true negative. Separate Agent outcome, Product evidence, and advice usability.

## Cleanup as a mandatory independent gate

Before creating either task root, record its exact exclusive path, ownership, and any seed manifest. Do not point a fixture into user home, Desktop, Documents, Downloads, iCloud Drive, active Harness profile or another project.

After capturing the necessary observation and ensuring no Tool or Host action can write to those roots, delete **only the newly created exclusive per-task root/contents** and verify their absence, on success, cancellation, and failures alike. A temporary task root is not a historical seed fixture. If ownership or pending activity is ambiguous, do not delete: record `CLEANUP_BLOCKED`, not `CLEANUP_PASS`.

Clean the exact launched browser/Host separately, including listener/process check. Do not recursively scan user home or full `/private/tmp`; do not request macOS access to Desktop, iCloud, Documents, Downloads or unrelated project paths.

Historical V2 `/private/tmp/phase13-real-harness-observational-v2/workspaces/`, the distinct older Session workspace, old paused Session dependencies, archived evidence, real `$DSH_HOME` Sessions, accepted plugin tarballs and rollback package remain protected. The inventory of 49 files does NOT grant deletion permission; no historical `rm -rf`.

Do not auto-delete `lib/`, `node_modules/` or `.vitest-cache/`. They are separate build/dependency/cache artifacts requiring separately grounded cleanup. No edits to Product, validation, Harness, Web profile, or model configuration.

## Execution constraints and statuses

- Maximum **one** Host/browser startup in the attempted live functional probe. If preflight or navigation fails, stop and report; no rerun loops.
- Maximum **4** tasks and **40** Tool executions; two bootstrap tasks count toward the cap.
- No forceful Agent follow-up to a blocked action, no extra readiness/model invocation, no secrets or remote operations; no Phase 13.4.
- Reports must state actual task/tool counts, Event/Finding attribution, number of new roots/files and exact cleanup counts, `CLEANUP_PASS|PARTIAL|BLOCKED`, and runtime cleanup separately.
- Never publish raw session IDs, browser tokens, cookies, sensitive task content or browser histories.

Return exactly one:
- `RISK_ADVISOR_PHASE13_3_FUNCTIONAL_EVIDENCE_READY_FOR_REVIEW`;
- `RISK_ADVISOR_PHASE13_3_FUNCTIONAL_POSITIVE_COVERAGE_INSUFFICIENT`;
- `RISK_ADVISOR_PHASE13_3_FUNCTIONAL_SESSION_CORRELATION_UNPROVEN`;
- `RISK_ADVISOR_PHASE13_3_FUNCTIONAL_PRODUCT_DEFECT_CANDIDATE`;
- `RISK_ADVISOR_PHASE13_3_FUNCTIONAL_SCOPE_OR_CLEANUP_BLOCKED`.

None self-accepts Phase 13.3.
