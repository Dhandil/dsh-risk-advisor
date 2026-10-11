# Risk Advisor Phase 15.0 — Product Readiness Preflight

**Status:** `RISK_ADVISOR_PHASE15_0_READY_FOR_ARCHITECTURE_REVIEW`
**Reviewed baseline:** `edf640b78dfbdcac87a6f47d659780859b3ac35a`
**Phase 14 accepted executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Scope:** Read-only product and evidence review; this report proposes a small follow-up experience validation. It does not authorize or start that validation.

## 1. Executive finding

Risk Advisor has an accepted deterministic implementation for ordinary Tool risk
awareness, evidence-qualified historical context, native-approval details, and
read-only F1/F2 correction context. Phase 14.6 accepted the integrated executable
after an 80-file / 554-test Full and deterministic Host, Client lifecycle, and
production-client-bundle evidence. The accepted Phase 14 executable is an ancestor
of the reviewed baseline.

The remaining readiness question is **delivery and use in a normal Harness Web
profile**. The Phase 14 evidence does not establish that the exact accepted package
is selected and loaded in a current user Web profile, nor does it establish how its
combined cards feel in an actual session. The Phase 14 final closure explicitly
leaves real-Agent generalization unverified. The smallest useful next validation is
a user-observed, provider-preserving Web-profile smoke with an artifact identity and
rollback record, bounded to ordinary advisory presentation and any naturally
available approval context. It must not manufacture F1/F2 events or be represented
as a real-Agent detection-coverage campaign.

## 2. Current product capability and authority

| Capability | Current implementation and user surface | Frozen limit |
| --- | --- | --- |
| Execution correlation and operation presentation | `src/index.ts` observes `tools/pre-execute` and `tools/result`; its pre-execute listener delegates through `next()`. The Host maintains bounded correlation and operation snapshots. | Observation only; no Tool argument rewrite, allow/deny/ask, execution gate, or Harness approval authority. |
| Runtime risk awareness (14.1) | A deterministic Host runtime captures pre-execution evidence and exposes a read-only runtime-risk bridge. The Client renders a separate `conversation.input.dock` entry, `risk-advisor-runtime-risk-awareness`, at order 20. | Advisory and best-effort. It does not block the Tool path or replace the native approval decision. The ordinary-Tool path is deterministic and provider-free. |
| Trusted historical Guidance (14.2) | A read-only, optional sidecar can display fixed Guidance beside a current ordinary-Tool risk row, derived from qualified Phase 11 Pattern history. | Missing or stale history is not a risk finding. Guidance does not alter score, Finding, approval, or execution. |
| Native approval detail (14.3) | The existing `conversation.approval.detail` slot receives the assessment and optional provenance-qualified historical context. | Informational detail within Harness Native Approval; no second approval control or authority. |
| Online Correction F1/F2 (Phase 12) | The existing `risk-advisor-online-correction` dock at order 10 presents the frozen Session-scoped Finding, using the existing Online Correction RPC. | Phase 12 remains the only F1/F2 classifier. Empty/missing data is not evidence of a true negative. |
| Correction history (14.4) | An optional read-only historical Guidance section can accompany the current eligible F1/F2 Finding. | It is sourced from qualified history, cannot create or change a Finding, and fails independently of the base dock. |
| Evidence-bound next check (14.5) | A fixed, optional manual inspection suggestion can accompany a currently qualified Finding and supported verifier evidence. | No free-form/LLM advice, executable command, retry, auto-correction, or new Finding authority. |
| Durable learning (Phase 11) | Host-owned immutable Episodes, append-only Outcomes, qualified Pattern revisions, and deterministic Guidance revisions use the existing storage-domain lifecycle. | Approval acceptance, Tool exit status, and Agent/user narrative alone do not establish verified success. |

The Host composition is installed from `src/index.ts`: correlation, ledger,
Operation Foundation, Risk Engine/Rule Engine, assessment coordination, verifier,
Experience Loop, Live Correction, and the Phase 14 optional read bridges. Storage,
connection/session, LLM, subagent, shell, and filesystem capabilities attach through
Harness-provided services. Browser integration is registered by
`src/client/index.ts`, which provides the approval detail slot and the two existing
input-dock registrations. The optional Phase 14 Client services have explicit
Session/generation lifecycle and failure isolation. This is an additive plugin
integration, not a Harness Core modification.

## 3. What existing verification establishes

- `Phase14_Completion_Report.md` records independent acceptance of Phases 14.1–14.6,
  the accepted executable above, and the exact Phase 14.6 Full run
  `phase14-6-evidence-repair1-full-20261010-ab3e17c-attempt1` (554/554 PASS).
- The Phase 14.6 integration and repair evidence covers cross-feature lifecycle,
  Session A→B→A isolation, delayed responses, and loading the production Client
  bundle in isolated real Chromium. The bundle smoke exercised its module loader and
  observed no external requests. This is strong deterministic integration evidence.
- Historical V1 deployment-pilot evidence exists in
  `docs/tasks/V1-deployment-pilot/Objective_Test_Report.md`. It observed a real
  `web` profile and a degraded-but-usable assessment for the then-tested product
  executable `f4807e2186e43690ba6dc4c349107b55e407aa53`. That report predates the
  accepted Phase 14 executable and cannot establish current Phase 14 package
  delivery or UX.
- `Phase14_Open_Validation_Register.md` remains authoritative:
  `REAL_AGENT_GENERALIZATION_UNVERIFIED`. Earlier R1–R5 runs stopped at 5/20 tasks
  after task-directory escape; the 20-Session observation was unscorable; and the
  scope-repair review found no demonstrated Bash read/list boundary outside the
  task root. No eligible real-Agent F1/F2 positive-event recall has been measured.

The package metadata continues to report version `0.1.0-r1`; this version string
alone does not identify the accepted Phase 14 artifact. Exact package and bundle
hashes must be recorded for any subsequent deployment check.

## 4. Readiness gaps

1. **Current package/profile identity:** No Phase 14 closure evidence proves that a
   selected current Web profile contains the exact package built from the accepted
   executable. The older V1 profile test is not a substitute. A future run needs a
   read-only profile inventory, exact package/bundle SHA-256 values, and a recoverable
   snapshot of only the profile control files that an install could change.
2. **Normal Harness Web activation:** The Phase 14.6 Chromium check loaded the
   production Client bundle through an isolated module-loader fixture; it did not
   establish a full normal Web Host startup, plugin-manager selection, Host route
   registration, or rendered surfaces in the current target profile.
3. **Combined real-session experience:** Deterministic tests prove contracts and
   lifecycle, but do not answer whether the risk row, approval detail, and optional
   correction sections are timely, understandable, visually distinct, and
   unobtrusive together in normal use. Subjective user feedback is absent for the
   accepted Phase 14 composition.
4. **Live evidence availability:** A real profile may have no qualified Phase 11
   Guidance or eligible current F1/F2/verifier evidence. Such sections must remain
   absent or unavailable; their absence must not be scored as a detection pass,
   failure, or true negative.
5. **Real-Agent safety and generalization:** The unresolved Phase 13.3 file
   read/list-isolation blocker prevents a broad autonomous campaign from being
   treated as safely runnable under the prior contract. Phase 15.0 does not resolve
   it or authorize a campaign.

## 5. Recommended minimum follow-up experience validation

Subject to independent review and separate execution authorization, use one
user-designated, recoverable Harness Web profile and one clearly disposable
workspace. Preserve its existing provider/model/reasoning settings. Record package
tarball SHA-256, `lib/index.js` and `lib/client.js` SHA-256, selected plugin identity,
Harness SHA, and the pre-install profile-control-file manifest; do not record token,
Cookie, credentials, unrelated sessions, or user project contents.

Keep the live observation bounded to:

1. **Install and startup:** install only the locally packed exact accepted Risk
   Advisor artifact after confirming the target profile and rollback snapshot. Open
   normal Harness Web and verify that the selected package, Host bridge, Client
   module and expected slots are the ones observed. Do not alter Harness, model
   configuration, or credentials.
2. **One safe ordinary Tool interaction:** in the disposable workspace, let a
   human initiate one explicitly bounded, low-risk task and observe the ordinary
   risk row, its primary reason/degraded state, and optional trusted historical
   note if qualified Guidance already exists. Do not treat a missing optional note
   as an error. Keep the unresolved file-isolation limitation visible; do not ask
   the Agent to search outside the workspace or claim the task prompt is a security
   boundary. If this cannot be kept within an independently enforced boundary,
   stop before any Agent Tool execution and limit the run to install/activation.
3. **Approval and Session coexistence, only when naturally available:** if the
   chosen safe flow naturally opens native approval, inspect the existing approval
   detail and verify there is one approval authority and no duplicate dialog. Switch
   Session A→B→A once and confirm that the visible state/RPC follows the selected
   Session. Do not change Harness policy or create a risky operation just to force
   approval.
4. **Optional correction evidence:** observe a genuine current F1/F2 Finding and
   its optional history/next-check only if one arises naturally and has independent
   evidence. Do not induce failures, mismatch, retries, or Findings. Otherwise mark
   these surfaces `NOT EXERCISED` / `UNSCORABLE`, not TN.
5. **User judgement and closeout:** ask the user to assess clarity, density,
   timing, visual hierarchy, distraction, and usefulness. Record observable
   defects separately from preference feedback. Close the page and Host, remove
   only the run's dedicated temporary workspace/files, and verify rollback data
   remains available.

This scope is a deployment and usability smoke, not a re-run of the 80-file Full,
not a replacement for deterministic Phase 14 tests, not a F1/F2 recall study, and
not closure of Phase 13.3. If the file-access boundary precondition blocks task
execution, report that limit without broadening permissions or changing the test
design.

## 6. Method and non-actions

This review inspected source and existing repository documentation at the reviewed
baseline, including `src/index.ts`, `src/client/index.ts`, the Phase 14 completion
and open-validation reports, Phase 14 architecture freezes/execution reports, and
the historical V1 deployment-pilot records. It did not launch Harness, Browser,
Agent, Provider, or Canonical Full. No tests were run. No package/profile/config or
product source was changed.

The accepted Phase 14 executable `ab3e17c1834b9ae2082369e35178d7006efb9e35` was
verified as an ancestor of the reviewed starting `main`. Existing untracked
`.vitest-cache/`, `lib/`, and `node_modules/` were preserved.
