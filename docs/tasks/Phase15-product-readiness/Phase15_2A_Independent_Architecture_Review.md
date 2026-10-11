# Risk Advisor Phase 15.2A — Independent Read-Only Preflight Review

**Decision:** `RISK_ADVISOR_PHASE15_2A_READ_ONLY_PREFLIGHT_ACCEPTED_ACTIVATION_NOT_AUTHORIZED`  
**Independent reviewer:** ChatGPT  
**Reviewed report/main SHA:** `481d359cb7c9d2a29ff9530cd48bbeb83dc138b3`  
**Starting main:** `5ae1a290b22dd385ff247e956ff4d228dcc86504`  
**Accepted Phase 14 executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Selected target:** existing `web` Profile, `/Users/tongxin/.dsh/profiles/web`

## Remote provenance and scope

GitHub independently verifies that the report commit is one fast-forward child of the baseline and adds **only** `docs/tasks/Phase15-product-readiness/Phase15_2A_Read_Only_Preflight_Report.md`. No `src/`, tests, lockfile, package, scripts, Harness or earlier acceptance changes. From the accepted Phase 14 executable to this report SHA all Git-tracked changes are documentation-only. The execution agent reports no package build, install, backup, runtime start/restart, Agent, Tool, provider or tests; these were not independently reproduced by the reviewer.

## Independent interpretation of the report

1. **Target established:** The report gives exact existing Profile path, non-symlink directory and owner, selected manifest and known relevant hashes. The saved manifest selects `@dhandil/dsh-risk-advisor` as a bundle; default enabled state is supported by the reported absence of disable overrides. This is *metadata*, not a Host/Client runtime activation result.
2. **Installed artifact identity established:** The reported package tarball SHA-256 is `4dd3c86d62ca106be670c7c6c73215d6c00b31cd1618473318ac293cd1f8cf35`, and its Host/Client member hashes match the installed package. Installed Host SHA-256 is `64c8a854bcc87264882307c2e5204fb1c47da9a1253a2a14a0ba54502f8f9aa3`; installed Client is `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
3. **Accepted client mismatch is established:** The Phase 14.6 `Phase14_Completion_Report.md` and `Phase14_6_Evidence_Repair1_Execution_Report.md` independently record the accepted-candidate production `lib/client.js` SHA-256 `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`. Therefore the installed Client is **not byte-identical** to the Phase 14.6 attested Client. The source or feature set of the installed bundle cannot be inferred solely from the hash difference; do not claim it is defective or claim the entire exact accepted package is installed.
4. **Runtime unknown:** No local Host process/listener attributable to the inspected Harness/Profile was observed. Browser activation, Host routes, Client slots, current behavior and user-facing UX remain `NOT RUN`/`NOT OBSERVED`, not PASS or failed activation.
5. **Recovery planning sufficient for preflight:** The report specifies narrowly relevant Profile manifest, lock/workspace/virtual-store metadata, package bytes and source artifact; ownership, stop-on-unrelated-dependency-diff, optional pnpm script approvals, no credential/Session reads, unique private backup and hash-based rollback. Nothing was backed up or modified. The plan requires **fresh path/process and dependency topology verification** immediately before any authorized mutation: pnpm's virtual-store and metadata must be restored coherently, with no reliance on a generic rollback assumption or deletion of unrelated dependencies.

## Acceptance limits and authorization gate

This is acceptance of **read-only inspection and planning**, not acceptance of the Phase 14 build as currently installed and not proof of Web activation.

For a later mutation, the user must separately authorize the **specific existing web Profile**, building a source-identified package without overwriting untracked repository `lib/`, creating a narrowly scoped private backup, installing/switching the Risk Advisor package through supported plugin management, and if desired starting normal Web. Recheck no active Host/process and no unrelated changes just before acting. Exact target files and rollback/abort order must be presented before the mutating operation. The existing package tarball must stay intact.

Do not start Agent, Tool, provider, external model, native approvals, real-Agent campaigns, Docker/guest investigations or Phase 13.3 validation. With no Tool, ordinary risk and correction Finding UI may not be exercisable; lack of those rows is not TN or PASS. Do not infer ordinary-risk, native-approval or F1/F2 UX from isolated Client smoke alone.

**Result:** `RISK_ADVISOR_PHASE15_2A_READ_ONLY_PREFLIGHT_ACCEPTED_ACTIVATION_NOT_AUTHORIZED`. No Phase 15.2B package install, profile modification, backup creation or Host/Browser start authorized by this document.
