# Phase 13.3 — Stale Web Client Artifact Architecture Review

## Decision

`RISK_ADVISOR_PHASE13_3_STALE_CLIENT_ARTIFACT_RECONCILIATION_AUTHORIZED`

This is a **deployment artifact/profile selection mismatch**, not evidence of a defect in the current Online Correction Product implementation or of a Harness Client Loader defect. Phase 13.3 remains unaccepted and F1/F2 remain unscorable from historical V2 observations.

## Audited evidence

The execution branch's remotely verified, report-only commit `985ee0a809ffe8122ea249cedf265ab40cb70eb7` is based on `1ecdf21303abff4e95eb04e816b6c3345a27ac56`.

The selected real Web profile is `$DSH_HOME/profiles/web` (reported local root `/Users/tongxin/.dsh/profiles/web`), selecting a tarball from `$DSH_HOME/artifacts/risk-advisor/v1-ux-compact-risk-indicator/345a54882393da7f64584f21105fa7fc56793265/`.

- Installed npm package: `@dhandil/dsh-risk-advisor@0.1.0-r1`.
- Installed `lib/client.js` SHA-256: `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93`.
- Source tarball's `package/lib/client.js` has the same hash.
- Both selected/installed files lack Online Correction Client and the `conversation.input.dock` registration present in the current Product source.
- This conclusion does **not** require a live browser: the package selected by the profile is demonstrably stale relative to the code being evaluated.
- The previously missing request does **not** yet prove a current-Product Client bug.

Accepted Product executable baseline: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`. Accepted validation Repair2 baseline: `0904afe035232f6d9faab2fd539018b6e1c4263b`. Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`.

The `0.1.0-r1` version string is insufficient to distinguish the old candidate package from a newly built one. Treat content and selected artifact identity as authoritative.

## Product/Harness ownership

The plugin source requires no changes for this mismatch.

The pinned Harness documents `dsh plugin --profile <name> <pnpm args>` as the official package-management interface. The same profile's package manifest and ordered bundles are the active selection authority. Harness Plugin Manager notes that package replacement requires a Host process restart before new JavaScript code is loaded.

Do not bypass that interface by overwriting `node_modules` or by building another Client loader. Do not change model/provider/reasoning or run a custom session/agent stack.

## Limited authorization

Authorize **one targeted external plugin package reconciliation** in the existing Web profile, with provenance and rollback, *not* a Product implementation repair.

1. Confirm no active `dsh web` Host is serving this profile. If running, stop and report rather than change the live profile under it.
2. Confirm source tree is unchanged from accepted Product executable for Product/build inputs. If product diffs exist, stop rather than package unreviewed code.
3. Build and pack the current accepted Product through the repository's official `pnpm run build` / `pnpm pack` path. Do not increment package version or edit Product code.
4. Record source commit, package manifest fingerprint, packed archive digest, `package/lib/client.js` digest, exports, and the presence of Online Correction Client/dock registration in the packed browser artifact. Do not claim mere strings prove live Client activation.
5. Preserve an exact rollback reference to the old selected tarball and a nonsecret snapshot/hash of existing Web profile package/lock/selection records, without copying credentials.
6. Replace **only** `@dhandil/dsh-risk-advisor` selected package via the pinned Harness-supported `dsh plugin --profile web add <fresh-absolute-tarball>` path (which forwards to pnpm). Keep the same installed plugin/bundle activation identity. A content-addressed *different tarball path* is necessary because package version is unchanged. If supported pnpm invocation does not actually select/replace the package, **stop**, do not hand-edit package files or remove/reinstall by guesswork.
7. Verify manifest/lock selection points at the new archive, installed client bundle SHA-256 equals the newly packed bundle, and normal plugin exports/patch identity are preserved. If they do not match, report failure and restore only through the supported profile/package-management workflow.
8. Confirm no unrelated dependency/selection changes. If the change cannot be bounded, stop, and preserve rollback evidence.

Only profile package/lock/installed external plugin artifacts necessarily owned by the supported package operation may change. Do not edit profile credentials, other plugin entries or user model configuration.

## Browser incident and test boundary

Because Chrome has repeatedly misinterpreted a saved token-bearing Harness startup URL as a Google search, **do not open Chrome, Harness Web, or a token-bearing URL in this reconciliation step**. Do not launch Agent, provider or Tool; do not invent an authentication client or new browser workflow.

The pinned Harness launch token is process-scoped. Do not infer API credential compromise or purge user browser data. The currently audited run reported no live Host.

No test-suite rerun is needed to prove package delivery. Product/validation/Harness source remains unchanged. If build or pack needs unapproved scripts/installs or a new dependency, stop and report separately.

## Gate and report

Success means **installed selected package bytes match the accepted Product build**, not that the real Client was activated or a Finding was observed.

- `RISK_ADVISOR_PHASE13_3_WEB_PROFILE_CLIENT_ARTIFACT_RECONCILED`
- `RISK_ADVISOR_PHASE13_3_WEB_PROFILE_CLIENT_ARTIFACT_RECONCILIATION_BLOCKED`

Commit a bounded docs-only delivery report listing the exact digest comparisons and affected profile metadata. Do not include archive binaries, secrets or private raw logs. No Phase 13.3 acceptance or Phase 13.4.

A subsequent separate, safe, native Web Client first-read proof is needed before resuming live Agent evaluation.
