# Risk Advisor Phase 15.3E — Client Artifact Reproducibility Investigation Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3E_ARTIFACT_DIAGNOSTIC_AUTHORIZED`  
**Design/review authority:** ChatGPT  
**Diagnostic executor:** **Codex**  
**Starting remote main:** `11b543b08d902fcc7b462644afb9a86425534232`  
**Accepted tracked executable:** `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1`  
**Prior Phase15.3E accepted Client SHA-256:** `7d3939ab3a6086248a6f351c34ee3e66e5177e857ca6078d347940ffdeb030e3`  
**Stopped deployment rebuilt Client SHA-256:** `7df903bcde8d03954fd373ab8fbcc3090b9fbb3b6d76a6a3225b76e250bf6ec9`  
**Invariant Host SHA-256:** `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Authorization type:** strictly **P1-only offline artifact investigation**, not repair, acceptance, rebaseline or deployment.

## 1. Question and established facts

An already reviewed Phase15.3E test/build/browser run attested exact Client SHA `7d3939ab...` in an isolated snapshot, now removed. The first subsequent isolated reproduction from the same Git candidate produced `7df903bc...`, with identical Host SHA and no installation. This is a **provenance/reproduction gap**; it does not by itself prove a bug, binary tampering, or that one build is functionally different. There is no retained original accepted Client file known from the reports to permit a direct byte-for-byte diff against it. The immediate goal is to discover **why two attempts report different output identity** and determine what additional evidence is needed before authorizing a new deployment.

The current `web` Profile **still runs Phase15.3C** (Client `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`). All current installed packages, old root tarball, immutable Phase15.3C tarball, prior backups and newly created fresh backup (manifest `7b12a9418109e99cbebbb5f2e1ab02562f19aecb64532b469c3339d4886471f9`) remain protected. Do not recreate or modify Profile backups in this task.

## 2. A0 — Safe read-only preflight

Verify remote `Dhandil/dsh-risk-advisor`, `git ls-remote refs/heads/main` = exact starting SHA, local tracked clean, direct-main only. If behind, only verified `git fetch origin main` and `git merge --ff-only origin/main`; no reset/rebase/clean/force, branches or worktrees. Confirm accepted source is an ancestor and current diff since it is strictly docs/evidence. Pin Harness SHA, tool binaries/versions and dependency resolution, and record relevant build env `NODE_ENV`, `NODE_OPTIONS`, `SOURCE_DATE_EPOCH`, CWD and temporary-root shape **without secrets or unrelated environment dump**. Inspect scripts/hooks/symlinks before any build; confirm no tool action will modify `node_modules/`, existing untracked `lib/`, `.vitest-cache/`, tarballs, Harness or Profile. Stop for any unsafe precondition.

Only narrow read-only confirmation of current installed Profile identity/backup may be used if needed; default **do not access Profile at all**. Do not inspect conversations, browser cookies, credentials or task logs.

## 3. A1 — Bounded experiments on **exact same source**

Perform **at most two** clean, independent, task-owned, offline build experiments from `git archive 1d5addfc1ae1daa360708bcf0e408f058c4a2cd1` in separately named isolated temporary roots (no worktree/branch). The TypeScript config's relative pinned Harness path and external dependency symlinks must be resolved and attested for each root, without writing to their targets. Use the same direct existing local `tsc -p tsconfig.json` and `tsdown` binaries and unchanged toolchain, with identical explicitly recorded safe env. Do **not** run `pnpm exec`, install/repair dependencies, pack, start a browser, run Agent/Tool/Provider, or access existing `web` runtime.

Keep both outputs temporarily until their comparison completes. Record full SHA-256 and byte length of each `lib/client.js`, `lib/client.js.map`, `lib/index.js`, `lib/index.js.map` and relevant emitted `lib/types/**` map outputs. Do not run a third build to fish for the old SHA. First classify:
- **Both independent fresh Clients equal each other but differ from accepted SHA:** fresh-build reproducibility may exist, but the **historical build identity cannot yet be recovered**; investigate earlier source/environment/cwd/realpath or source-map provenance, and do not simply promote the new hash.
- **Two fresh Client binaries differ from each other:** investigate non-deterministic/path-dependent output via controlled output diff.
- **Accepted Client SHA reproduced:** verify its source closure, Host hash, toolchain and absence of any unexplained non-product inputs; do not auto-install—report a concrete bounded recovery proposal.
- **Any build/tool side effect outside task-owned roots:** immediately STOP; preserve pre-existing assets.

## 4. A2 — Explanatory artifact diff, never post-hoc rewriting

Compare the two **fresh outputs** byte-for-byte and by bounded structure: first differing offset, changed ranges, stable vs variant code segments, `sourceMappingURL`, source-map `sources`/`sourcesContent`, emitted TS module order/identifiers, custom CSS embedding source body and plugin IDs, dependencies resolved, Node/tool versions, `process.env.NODE_ENV`, `import.meta.env.MODE`, and whether absolute realpaths or temporary root names appear in output. The current `tsdown.config.ts` uses a custom CSS virtual-module plugin and sourcemaps; those are **hypotheses**, not an assigned defect.

Only normalize paths/strip sourceMappingURL **for diagnostic comparison in memory**, never modify distributable output, modify the frozen SHA or suggest packaging transformed bytes. Look for relative Config/Harness path differences and sourcemap-only changes separately from runtime-JS changes. If original accepted Client bytes aren't available (as previous reports suggest), explicitly state **NOT COMPARABLE** for old-vs-new byte offsets rather than inventing an old/new diff. Exclude secrets, absolute user home identifiers and unrelated input bodies from published diagnostics.

The source maps, where available, may permit a **source-closure attestation**: map bundled modules back to tracked `src/**`/exact Git blobs, pinned Harness types and vetted dependencies. Prove this only if every relevant input is actually enumerated and matched; a matching Host hash alone or matching visible F1/F2 words is insufficient.

## 5. A3 — Decision, cleanup and evidence

State one outcome with exact supporting digests:
- `REPRODUCIBLE_ACCEPTED_ARTIFACT_RECOVERED`: accepted exact Client bytes genuinely reproduced and source-verified;
- `REPRODUCIBLE_NEW_ARTIFACT_NOT_YET_ACCEPTED`: two new builds byte-equal to each other but differ from earlier accepted digest; proposed *separate* fresh full focused/build/browser proof and independent artifact re-acceptance, no immediate install;
- `NONDETERMINISTIC_OR_PATH_DEPENDENT_BUILD`: builds differ; pinpoint supported cause or explicitly `ROOT_CAUSE_UNDETERMINED`;
- `INVESTIGATION_BLOCKED`: unsafe precondition, absent tools or incomplete evidence.

**No rebaseline is authorized in this investigation.** A new, distinct artifact hash requires independent new-build acceptance with relevant frozen U9 + en/zh focused tests and isolated Chrome (and future delivery freeze) **before** any package can be installed. Do not treat Phase15.3E's 67 prior focused PASS and screenshots as validation of a byte-different build; do not silently waive the old SHA.

After evidence capture, securely clean **only task-owned temporary roots** with exact-path safeguards, leave all pre-existing assets intact. Do not commit generated outputs, archives, caches, logs or full source maps. Do not modify source/tests/tsdown config or user's normal `web` Profile.

Create a single sanitized report:
`docs/tasks/Phase15-product-readiness/Phase15_3E_Artifact_Reproducibility_Investigation_Report.md`
with A0–A3, exact commands/toolchain, two-build digest comparison, firm facts vs hypotheses, preservation, and precise next architecture decision. Commit/push **only** the report to `main`, verify remote SHA. If blocked, still report what was checked and first blocker.

**Success of diagnostic process:** `RISK_ADVISOR_PHASE15_3E_ARTIFACT_DIAGNOSTIC_READY_FOR_ARCHITECTURE_REVIEW`.  
**Unable to complete safely:** `RISK_ADVISOR_PHASE15_3E_ARTIFACT_DIAGNOSTIC_BLOCKED`.

No deployment resume is granted by this diagnostic freeze.
