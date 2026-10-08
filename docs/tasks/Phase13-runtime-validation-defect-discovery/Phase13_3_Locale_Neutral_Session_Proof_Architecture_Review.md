# Risk Advisor Phase 13.3 — Locale-Neutral Active Session Proof and Bounded Functional Probe

## Status

`RISK_ADVISOR_PHASE13_3_LOCALE_NEUTRAL_SESSION_PROBE_AUTHORIZED`

This supersedes **the observer's English-only UI assumptions**, not the existing Product F1/F2 contracts. Phase 13.3 remains unaccepted.

## Provenance

Remote report `814c860d2561eceed3cacffab4a6bf0f6bae4e98` was reviewed on `codex/phase13-3-live-functional-probe` as a **one-file docs-only** commit atop `1978fb5374a1706f55b6ca8e3b73ac8949fecb71`.

- Real installed Risk Advisor Client SHA-256: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Client normal read path produced HTTP 200, `VIEW`, zero retained Findings and request/response Session identity equality.
- **No proof of the active UI Session**, so no F1/F2 scoring; no Agent/provider/Tool tasks executed.
- The ephemeral observer bootstrapped **four** short-lived Host/browser runs and saw many ordinary 1-second poll responses. This was a probe control deviation; it should not be repeated.

## Source-confirmed native UI facts

At pinned Harness SHA:

- `packages/client/ui-sidebar/src/client/locales.ts`: left sidebar toggle is `打开侧边栏` (zh) / `Open sidebar` (en).
- `packages/client/ui-workspace/src/client/locales.ts`: Session tree's accessible name is `会话` (zh) / `Sessions` (en).
- `packages/client/ui-workspace/src/client/rows/WorkspaceBrowser.tsx`: actual Session list uses `role="tree"` and a localized `aria-label`.
- `packages/client/ui-workspace/src/client/rows/Rows.tsx`: Session rows use `role="treeitem"` and `aria-selected={node.id === currentId}`. A row's click invokes `onOpen(node.id)`.
- The Risk Advisor Client's public bridge takes `sessionId` from the mounted `conversation.input.dock`, not from a browser-selected string.

The sidebar can be collapsed; blindly searching for an English `Sessions` accessible name does not establish that the browser failed.

## Fix the measurement plan, not Product

Use the ordinary existing Playwright 1.61.1 + cached Chromium, one fresh ephemeral browser and normal pinned `dsh --profile web --no-open` Host.

Preflight the **exact localized selectors from source** before Host startup. Once running, find the toggle in the browser via its supported `aria-label` (zh or en), expand the sidebar if necessary, then restrict observations to the native Session tree `role="tree"[aria-label="会话"|"Sessions"]` and session rows `role="treeitem"[aria-selected]`.

Do not infer active Session merely from click completion or from request/response ID equality.

### Correlation proof with two distinct existing Sessions

If at least two existing normal nonblank Sessions are present in the tree:

1. Choose existing row A through the normal UI; await `aria-selected="true"`; observe first normal per-Session Risk Advisor read after the selection has settled, and keep opaque request Session ID `sidA` **in memory only**.
2. Choose different existing row B; await B selected and A no longer selected; observe current per-Session Risk Advisor read with `sidB` distinct from `sidA`. Differentiate overlapping/outstanding poll responses from the newly retained store; do not count pre-switch stale responses as B.
3. Return to row A; await selected; observe a new native read with `sidA` again. Each accepted request/response pair must have matching IDs and a valid `VIEW` or clearly recorded `NOT_FOUND`/`UNAVAILABLE`.
4. Record only boolean A→B→A identity consistency, row selection evidence, result kinds and timestamps; do not persist IDs, titles, URLs, raw bodies or user content.

This is a causal, language-neutral **normal UI Session-to-RPC binding proof** based on native selected state and actual Client traffic; there is no need to fetch an internal Session API, inspect React private state or create a custom RPC client.

If fewer than two usable rows exist, do not invent or create a Session just for this gate. Record the limitation; a directly supported exposed current-Session identity may be used only if proven from normal public UI/API, otherwise stop with `SESSION_IDENTITY_UNPROVEN`.

### Single-run stop rule

- At most **one** Host/browser startup for this probe. Do not retry with different locales or repeat bootstraps; if preflight/UI condition fails, stop and document the blocker.
- No Agent prompt before correlation proof passes.
- Minimize observation time; capture first relevant native read after the selection transition. Additional polling is not itself new coverage.
- Temporary browser and Host must be closed with port/process cleanup.

## Then, and only then: small real Agent evaluation

After correlation succeeds **within the same Host/browser run**, use at most **four new normal Web Sessions and forty Tool calls**, no V2 replay:

1. one low-impact supported write/edit task;
2. one supported mkdir/copy task;
3. one natural failure/recovery opportunity for F1 (no instructed Tool retry);
4. one safe supported postcondition-verification opportunity for F2 (no fake mismatch).

Agent chooses operations and is free to stop for safety. Real tool/process observations and existing Risk Advisor public Finding views are captured contemporaneously, separately from Agent task outcomes. Keep F1/F2 eligibility independent of Product findings.

If no positive occurs, report insufficient positive coverage. Empty `VIEW` remains no retained Finding, never automatically a true negative. Report advisory usefulness qualitatively only where an actual Finding exists.

Do not make the browser observer, Plugin Manager, Harness Agent, or other assistant the correctness oracle.

## File-system and privacy boundary

The macOS user recently **denied** attempted accesses to Desktop and iCloud Drive. These folders are NOT required for Risk Advisor verification.

Allow access only to:
- Risk Advisor checkout: task-required source and its existing temporary observer setup;
- pinned Harness checkout: read-only source/normal native run;
- chosen dedicated disposable task fixture root: bounded task writes;
- `$DSH_HOME/profiles/web`: only metadata needed to verify the already-installed Risk Advisor Client fingerprint.

**Never traverse, glob, scan, test-read, or request permissions** for `~/Desktop`, `~/Documents`, `~/Downloads`, `~/Library/Mobile Documents` (iCloud), other personal folders, or other projects. Do not use system-wide `find`/recursive home-directory walks or attempt reauthorization. Do not treat macOS permission refusal as a reason to work around it.

Keep startup launch token/headers/cookies in process memory only; no default Chrome/omnibox and no persistent Playwright trace/HAR/screenshots.

If unexpected access to a protected folder is attempted, stop affected operation, report its exact initiating command/process and do not retry. No broad investigation of unrelated Mac files is authorized.

## Outcomes

Commit one bounded docs-only report with exactly one outcome:

- `RISK_ADVISOR_PHASE13_3_LIVE_EVIDENCE_READY_FOR_ARCHITECTURE_REVIEW` — selected Session binding proven and independent F1/F2-relevant facts available;
- `RISK_ADVISOR_PHASE13_3_LIVE_POSITIVE_COVERAGE_INSUFFICIENT` — binding proven, native tasks ran, no scorable positive;
- `RISK_ADVISOR_PHASE13_3_SESSION_IDENTITY_UNPROVEN` — selected row ↔ native RPC identity cannot be proven; **no Agent tasks**;
- `RISK_ADVISOR_PHASE13_3_LIVE_PRODUCT_DEFECT_CANDIDATE` — independently grounded Risk Advisor behavior contradicts the accepted product contract;
- `RISK_ADVISOR_PHASE13_3_SCOPE_OR_SECURITY_BLOCKED` — unsafe browser navigation, unapproved file-system access, out-of-scope action or need for wider permissions.

All outcomes preserve accepted Product/validation/Harness code and the current Web profile. No plugin reinstall or broader test suites. No Phase 13.4. Do not self-accept Phase 13.3.
