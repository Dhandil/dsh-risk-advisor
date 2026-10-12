# Risk Advisor — Plugin Delivery Acceptance Policy v2 (Prospective)

**Status:** `RISK_ADVISOR_PLUGIN_DELIVERY_POLICY_V2_ADOPTED`  
**Approved by user:** 2026-10-12  
**Applicability:** New Risk Advisor deliveries **after** this policy's publication. Previous Architecture Freezes, implementation tests, Blocked records and acceptance reports remain unchanged.  
**Scope:** Risk Advisor plugin releases to user-controlled DeepSeek Harness profiles. Not the general PAH/Idea release policy, and not a rewrite of pinned Harness package-manager behavior.

## Why the policy exists

Plugin authors must protect user-controlled data, package/source identity, other plugins and runtime safety. The official Harness plugin manager and pinned pnpm maintain installation metadata: `package.json`, lockfiles, modules registry and generated workspace state. A plugin update should be considered acceptable when the **intended plugin version is installed, unrelated user state remains protected, and activation is correct**, with an honest, supported recovery plan. Byte-exact restoration of *all* package-manager-generated metadata is **not** required for functional rollback.

Specifically, `node_modules/.pnpm-workspace-state-v1.json` is **not** an inert throwaway cache; it participates in pnpm dependency/workspace validation. Its legitimate, explainable regeneration is acceptable, but its consistency must not be assumed without evidence. Conversely, a timestamp-dependent file's prior SHA is not a necessary universal rollback target.

## State classes and minimum preservation

| Class | Examples | Normal gate |
| --- | --- | --- |
| **A — Non-reconstructible/user-owned** | sessions, user preferences, secrets, plugin persistent business data, migrations | Never touch without explicit scoped authorization; no accidental deletion, migration requires pre-change backup + tested or convincingly bounded reversible strategy |
| **B — Declarative install / executable identity** | immutable package tarball, source SHA, package manifest, pnpm lockfile, installed executable, plugin selection/order, important profile configuration | Protect old package and manifest/locks; install through supported manager; exact new package and installed-byte digests; preserve unrelated plugin identities; future rollback must reselect an old preserved package and verify semantic/behavioral consistency |
| **C — Manager-owned generated state** | `node_modules/.modules.yaml`, `node_modules/.pnpm-workspace-state-v1.json`, generated virtual-store metadata | Record changes and validate against current declarative state; allow supported regeneration and timestamp differences; consider backing up pre-change bytes for diagnosis, **but byte-identical restoration is not a normal acceptance gate** |
| **D — Ephemeral operational byproducts** | operation-scoped plugin-manager logs, temporary build roots, caches | Respect privacy, don't overwrite user items; cleanup only task-owned resources, do not require historical SHA restoration |

Unknown or unexpected writes outside established manager-owned scope are **not automatically class C**: first identify owner, significance and effects. Stop further mutation on suspected user-data loss, surprise unrelated-plugin changes, unsafe partial install, integrity mismatch or unrecognized privilege/config change. Record and classify harmless known manager-owned additions without artificially failing otherwise valid delivery.

## Practical release gates

**G0 — Preflight.** Exact Git source/executable SHA; pinned supported Harness/profile and compatible Node/pnpm toolchain; clean tracked source; user Host/installer quiescence; preserve all pre-existing untracked assets and user sessions. Explicit scope/approval before touching a real Profile.

**G1 — Artifact/provenance.** Built output from accepted source with the agreed reproducibility/identity gate (where prescribed), new durable immutable package, digest/SRI and safe-member manifest. Reuse existing validated focused/build/browser evidence instead of rerunning entire regression or Canonical Full for a docs-only promotion. Never substitute an old `lib/` for the accepted candidate.

**G2 — State protection and install.** Safeguard non-reconstructible data and old package+declarative configuration; narrow pre-change backup of installed package and affected declarative controls. For known manager-generated metadata, prefer capturing preimage if inexpensive, but allow source-proven regeneration with semantic verification; never claim absent old bytes are recoverable. Use the official pinned profile plugin-management command only. Audit before/after write paths and report all generated metadata or operation logs, checking no other plugin, selection order, privileges or user settings change unexpectedly.

**G3 — Operational activation.** Verify installed executable digest and package/lock source. Start only a task-owned Host/browser when allowed, confirm actual plugin-loader/registered slots/styles and relevant safe endpoint metadata; cleanup only task-owned processes. A browser-loaded Client hash may be `INDIRECT` if honest packaging/installed-file proof and runtime activation are present. Clearly distinguish synthetic UI smoke from real Agent/Tool/Finding/approval behavioral evidence. Do not treat startup success as proof of detection accuracy.

**G4 — Restoreability claim.** Preserve older immutable package plus sufficient manifest/lock/critical settings to request a supported rollback. Explain expected semantics and identify untested paths. An actual rollback is **not** needed for every routine UI-only update and must **not** be run against the user's active Profile solely to satisfy a paper gate. For high-risk migrations or plugin-owned persistent data writes, separately design and verify applicable recovery/rollback gates. Never claim exact byte recovery from a digest or a rollback test that was not performed.

**G5 — Evidence and decision.** Write a concise execution report and independently check remote Git doc-only drift, tested SHA, identities, noninterference and any exceptions. Classify statuses accurately: `PASS`, `PASS_WITH_DOCUMENTED_GENERATED_STATE_LIMITATION`, `BLOCKED`, or `NOT_TESTED`. Do not upgrade a literal frozen historical `BLOCKED` Gate retrospectively. Future approved releases use this new contract up front.

## Division of responsibility

- **Plugin author (Risk Advisor)**: source correctness, package identity, user data/permissions boundaries, compatibility, bundled UI, test evidence.
- **Pinned Harness plugin manager / pnpm**: supported package transactions, dependency install/uninstall and generated workspace metadata. A plugin author should not bypass, manually rewrite or patch the manager's internal state.
- **Delivery executor (Codex)**: exact authorized install on the user's machine, safe backup, write-set audit, observed activation and truthful limitations.
- **Independent reviewer (ChatGPT)**: Git evidence and architecture decision; do not claim local environment proof without executor evidence.
- **User**: explicit permission for deployment, destructive operations, and material deviations that could affect user data/rollback risk.

## Relationship to Phase15.3E Delivery2

Delivery2 was separately accepted **with a permanent workspace-state rollback limitation** at `Phase15_3E_Web_Delivery2_Final_Independent_Acceptance.md`. It did **not** save the pre-update `.pnpm-workspace-state-v1.json` bytes; successful supported offline semantic re-generation is source-predicted, actual rollback untested; prior S1 inspection exceeded its manifest-only method. This historical exception is neither erased nor retroactively repaired by Policy v2.

**Outcome:** a risk-proportionate, profile-safe and evidence-backed plugin release discipline; no global byte-for-byte recovery gate for manager-generated state.
