# T04 — Harness Upstream Drift | Architecture Decision

**Decision:** `T04_RESUME_ON_PINNED_HARNESS_BASELINE`  
**Decision date:** 2026-09-29  
**Risk Advisor start checkpoint:** `Dhandil/dsh-risk-advisor/main @ 3c3fd9d540caa654bb3aaf8378536cfde74ead3e` (T03 independently accepted).  
**Pinned and tested Harness baseline:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.  
**New upstream master observed via GitHub (read-only):** `4878cdabd87d4041bdaff61d04c966883b9fd07a`.  
**Scope:** Resolve *only* the unexpected remote-master drift STOP reported during T04. This is not T04 acceptance or a general upstream-compatibility approval.

## 1. Verified facts

- Local `origin/master` was reported at `ddefc45f...`, and the new remote `ls-remote origin/master` at `4878cdab...`. GitHub independently confirms the latter as the public `master` head; it is a descendant of `ddefc45f...` (many intervening commits). Risk Advisor `main` independently remains at `3c3fd9d...`; T04 work is uncommitted and cannot be independently code-accepted yet.
- Read-only GitHub blob comparison of the two Harness SHAs found identical files for `packages/core/tools/src/types.ts`, `vendor/cordis/src/events.ts`, `vendor/cordis/src/fiber.ts` and `vendor/cordis/src/reflect.ts`.
- Other involved source files **are not all identical**. The new `packages/core/session/src/types.ts` changes `SESSION_FORMAT_VERSION` from 3 to 4; Session fork/seed behavior and some message vocabulary change, and Host tools/approval sources also have changes. Consequently, this decision does **not** attest compatibility with upstream `4878cdab...` or any newer runtime.
- The T04 frozen instructions and all accepted T00–T03 verification use the pinned local Harness `ddefc45f...`. A newer upstream branch tip is not, by itself, a mutation of the pinned checkout or a material mismatch of its local source. Fetching into the protected Core working repository is unnecessary and prohibited for this task.

## 2. Binding decision for Codex

1. Resume **the existing uncommitted T04 working tree** without discarding, resetting, cleaning, rebasing or recreating the work. Plugin remote remains the T03 accepted checkpoint until intended T04 publication.
2. Before any further write, verify read-only that Harness `HEAD` and the local source files used by T04 still match the frozen `ddefc45f...` object and that inherited user drift remains protected. Confirm plugin branch/remote ancestry and existing T04 changes. Stop if the **local pinned source** actually changed or the intended T04 code depends on an unverified newer-only interface.
3. Deliberately continue T04 implementation, tests and final evidence **against the pinned local Harness baseline `ddefc45f...`**. Do not run `git fetch`, pull, checkout, install/build, reset, clean or any other command that mutates `D:\Harness\deepseek-harness`, including its `.git` metadata. `git ls-remote` and other read-only remote observations are allowed. Do not silently rebase or retarget the plugin to upstream `4878cdab...`.
4. Treat `UPSTREAM_MASTER_DRIFT` as a separately recorded, **non-blocking for pinned-baseline T04** compatibility item; its new runtime remains `NOT_VALIDATED`. A subsequent explicit upgrade/compatibility task must test Session V4 and the changed fork/message/tool interfaces before Risk Advisor is claimed compatible with that upstream.
5. Preserve the prior STOP event as historical evidence in `docs/tasks/T04-ledger-recovery/Execution_Report.md`: original mismatch, architecture decision, local pinned SHA, upstream observed SHA and explicit target scope. This decision overrides only the remote-head-equality part of the T04 preflight; it does not relax any source-seam, correctness, protection or test requirement.
6. Revalidate the existing 16 focused R4 tests on final implementation, actual safe pinned Harness integration/fault tests as required by the frozen instructions, and the **entire T01 9 + T02 16 + T03 17 regression**. Run typecheck, lint, build, Host export smoke, pack and relevant diff/staged-secret/scope gates; preserve warnings honestly. Final executable Tested SHA must precede report-only changes. Do not infer any PASS from tests already run before this decision.
7. Commit this file as task documentation alongside the exact-scope T04 implementation. Codex writes/updates **Execution_Report.md**, never `Acceptance_Report.md`. Normal push and remote SHA verification, then STOP for ChatGPT independent review. No R5; T01 Live Browser and actual PTC producer continue to be `NOT_RUN` unless separately proven.

## 3. Explicit return-to-STOP conditions

- The local Harness `HEAD`, affected source, or available package/runtime in the pinned checkout no longer matches the T04 freeze.
- The existing uncommitted T04 implementation actually requires new upstream functionality or source modifications to Harness Core.
- Correct fault/replay semantics cannot be proved under the pinned baseline, native approval/tool behavior would change, or the current plugin/history/drift cannot safely be preserved.

**Acceptance language:** This document authorizes resuming T04 *only against* frozen `ddefc45f...`. It neither accepts T04 implementation nor asserts compatibility with `4878cdab...`.
