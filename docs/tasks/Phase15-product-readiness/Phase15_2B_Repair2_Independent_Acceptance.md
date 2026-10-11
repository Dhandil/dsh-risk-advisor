# Risk Advisor Phase 15.2B Repair2 — Independent Activation Acceptance

**Decision:** `RISK_ADVISOR_PHASE15_2B_ACTIVATION_ACCEPTED`  
**Independent reviewer:** ChatGPT, remote GitHub source/diff/report review  
**Reviewed execution report SHA:** `8c0070e0e28069695d197fc27ba0e1442a9d6542`  
**Starting Repair2 instruction SHA:** `32f66994c3f989e189d529b7cdb1783d3728cc41`  
**Accepted Phase 14 source executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Scope accepted:** installation/source provenance + normal Harness Web activation-only; **not** end-user Tool/Finding UI or real-Agent coverage.

## 1. Remote provenance and review method

GitHub compare from the Repair2 instruction to the execution report is exactly one linear commit, adding only `docs/tasks/Phase15-product-readiness/Phase15_2B_Repair2_Execution_Report.md`. Compare from accepted Phase 14 executable to the reviewed report SHA shows only `docs/` changes, no changed Risk Advisor source, tests, configuration, lockfile, package manifest or Harness source. The reviewer inspected the published execution report, the Repair2 amendment, accepted Phase14.6 evidence and current Host/Client registration code. The reviewer did **not** independently run installation, real Browser or tests; local hashes, timings, process state, responses and backup integrity are the execution agent's reported observations.

## 2. P1 — Source-identified candidate PASS

The executor retained the already-built local outputs, attested their source and build inputs with emitted TypeScript maps, module source maps, tracked product and CSS sources, compiler/bundler resolution and tested package-lock dependencies, then ran a bounded, offline module-factory smoke. The evidence established package registration, three allowlisted external imports, four CSS modules and callable Client `apply` export; the VM smoke **did not invoke `apply()`**. The Host bundle loaded and exposed `apply` without executing it.

New candidate hashes:
- `lib/index.js`: `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.
- `lib/client.js`: `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`.

The latter **differs** from historical accepted Chrome-smoke Client `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`. These are different exact builds; the historical byte identity was not a previously frozen reproducible-build criterion. No source/lock changes were recorded, and Repair2 does not falsely claim the exact historical artifact has been reproduced.

## 3. P2 — Local package identity PASS

`pnpm pack` succeeded without dependency removal or install-script approval. Tarball `dhandil-dsh-risk-advisor-0.1.0-r1.tgz` has SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`; all 90 tar entries were identified, with Host and Client bytes matching the above candidate hashes. Tarball remains an **untracked file in the official repository root**; the selected `web` Profile now references this exact local file. Preserve that file/path until a separately authorized packaging reference change; do not `git clean`, delete/move it or assume the source repository can be relocated without affecting future reinstall/resolution. This is a maintainability note, **not** a failed activation gate.

## 4. P3 — Existing web Profile activation PASS within observed scope

The execution report records:
- Fresh ownership/process checks, unchanged unrelated bundle order/config and a verified existing private rollback backup (manifest SHA-256 `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`). The previous package artifact remains intact.
- Supported pinned-Harness plugin-manager install using the local tarball with offline resolution and disabled scripts; only the Risk Advisor dependency/integrity, associated lock/bookkeeping entries and workspace validation timestamp changed. The installed package's **90 files match the candidate tarball**, including exact Host/Client hashes.
- One task-owned normal Harness `web` Host and a task-owned Playwright tab started. The normal Web Client loaded four named Risk Advisor CSS modules. HTTP **200** was observed for POST `/api/risk-advisor/online-correction` and `/api/risk-advisor/runtime-risk`. This supports *live module loading and route availability* rather than mere standalone-loader simulation. It does not prove successful payload semantics for every route, a white-box SlotRegistry listing, or that a pending Native Approval / Finding / risk card actually appeared.
- Task-owned page and Host were closed, with the earlier user tab, old tarball, backup and unrelated plugins retained. No Agent, Tool, provider, native approval, synthetic Finding or Canonical Full was run.

## 5. Acceptance boundary and next action

**Accept Phase 15.2B as complete for source-bounded local packaging, selected existing-`web` Profile installation, and bounded real Host/Client activation evidence.** The current Profile now has a newly installed, source-identified Risk Advisor package; it is not the historical exact Phase14.6 Chrome-smoke bundle.

Do **not** use this result to claim actual ordinary Tool risk UI, approval detail UX, historical Guidance eligibility, F1/F2 event/recommendation display, detection recall, production deployment or autonomous correction. The `REAL_AGENT_GENERALIZATION_UNVERIFIED` status and prior Phase13.3 file-access-scope blocker remain open. The accepted Phase14 deterministic test result (80 files / 554 tests, exact historical executable) remains unchanged; no new Full is requested.

Next useful activity is **Phase 15.3 human UX observation/design validation**, with a separate bounded proposal: no automatic model/Agent/Tool/campaign execution. UI fixtures or user-supplied real observations may be considered only with appropriate authorization and privacy controls.

**Outcome:** `RISK_ADVISOR_PHASE15_2B_ACTIVATION_ACCEPTED`.
