# Risk Advisor Phase 13.3 — Harness-Native Campaign Execution Report

## Status

`RISK_ADVISOR_PHASE13_3_NATIVE_OBSERVABILITY_BLOCKED`

Execution stopped before manifest generation or task submission because I could not establish a supported isolation boundary that protects the current Harness credential and user files from campaign Agent Tools.

## Baseline

- Starting `main`, local `HEAD`, and `origin/main`: `53de5157c9d1ce37f1d5054e7927ee0cb1ff8770`.
- Accepted Product: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`; Product source/tests/package/config/benchmark drift: **0**.
- Accepted validation Repair2: `0904afe035232f6d9faab2fd539018b6e1c4263b`; `validation/phase13/` drift: **0**.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked checkout clean.
- Existing V4 docs-only report commit `5136356ebfcacd1159cac215bab3bb95e3ed9716` was pushed unchanged to `codex/phase13-3-campaign-v4`.

## Read-only native entry localization

The pinned Harness documents the supported one-shot CLI entry `dsh --profile headless [--json] "<task>"`. It creates a fresh persisted Agent through the core registry and accepts a Session id; Harness owns Agent, provider, ToolRuntime, and message lifecycle. The current Web profile’s real local path is also public: the Web app uses `session/create` followed by `session/prompt` over its authenticated local RPC API. The existing Web profile bundle list includes `@dhandil/dsh-risk-advisor`, so Web is the path that preserves the current Risk Advisor product wiring. No private provider adapter, custom Agent loop, stream parser, readiness call, or provider request was used.

## Isolation blocker

The Harness CLI supports `DSH_HOME`, and the base bundle stores durable Sessions under that home. A disposable home can separate Session persistence from the ordinary Web instance. The current Harness home has a managed credential file, while the inherited process environment has no `DEEPSEEK_API_KEY`; I did not read or copy any credential value. A disposable home would not see that managed file automatically. Making it available would require copying the secret file or pointing the isolated runtime back to the original file.

The Harness credential-store documentation states that Agent Tool processes run as the same OS user and can read the managed credential file. The default filesystem and subprocess policies do not confine reads or network access to the task workspace; the base composition includes network-capable search/fetch providers. I found no supported per-task public API in the normal Web/CLI path that enforces the required Tool-side network and user-file boundary.

Using the existing Web home would persist campaign Sessions in normal user data. A disposable `DSH_HOME` would isolate persistence, but a same-user Agent could still reach the original credential and unrelated files through Tools. Copying credentials, changing user configuration, or adding a validation-owned ToolRuntime/network wrapper is outside the frozen scope. I therefore did not boot a campaign runtime or try to work around this boundary.

## Execution counts

- Canonical manifest / tasks / Sessions: **not created / 0 / 0**.
- Provider requests / turns: **0 / 0**; standalone readiness: **not run**.
- Tool attempts / executions: **0 / 0**.
- Product, validation, Harness, and user Harness configuration changes: **0**.
- Complete `pnpm test`: **not run**; Phase 13.4: **not started**.

This is an isolation/observability blocker, not a Product finding or a completed Phase 13.3 campaign. The report does not claim acceptance.
