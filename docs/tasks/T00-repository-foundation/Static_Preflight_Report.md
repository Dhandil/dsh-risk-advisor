# T00 — Local Static Preflight Report

Status: `COMPLETE_CARRIED_FORWARD`; this is the completed local Codex preflight
evidence saved for T00. It is not an Acceptance Report.

## Scope and baseline

- Harness reference: `D:\Harness\deepseek-harness`
- Harness branch: `master`
- Harness HEAD and `origin/master`: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Reference worktree drift at preflight: untracked `build.log`, `install.log`,
  `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`; no tracked
  or staged changes.
- Plugin workspace at preflight: not yet a Git worktree; no plugin files were changed
  by the preflight.

## Static findings

| Area | Result | Finding |
|---|---|---|
| Approval ordering | `CODE_VERIFIED_WITH_ARCHITECTURE_CHANGE` | `approval/asked` is appended before the `approval/request` waterfall. `prepend` and `policy = never` mean Risk Advisor correctness must not depend on answerer ordering. |
| Approval UI | `CODE_VERIFIED` | `conversation.approval.detail` is a public session-scoped additive slot; Native Reject / Allow once remain owned by the native panel. |
| Session/correlation | `PARTIALLY_CODE_VERIFIED` | Host ownership is `req.agent.session`; `callId` is optional and not a sufficient Execution identity. Use a collision-aware active multimap and degrade on ambiguity. |
| Nested durable tree | `PARTIALLY_CODE_VERIFIED` | Current durable events are `tool/ptc-dispatch-start` and `tool/ptc-dispatch`, with root/parent/sub call IDs. Normal replay is structurally supported; occurrence ambiguity remains runtime coverage. |
| Guard flow | `CODE_VERIFIED` | `PreToolDecision` has `allow`, `deny` with optional `info`, `cancel`, and `ask`. Guard returned denial is deterministic only with the complete control trace. |
| Cordis lifecycle | `CODE_VERIFIED` | Cordis event listeners are effect-owned and removed with their fiber. Risk Advisor-owned runtime state recovery is not proven by Harness source. |
| Latency budget | `RUNTIME_REQUIRED` | P50/P95/P99/MAX and Judge saturation cannot be established statically. |

## Focused runtime boundary

`R1` Approval additive UI smoke, `R2` live correlation integration, `R3` durable
PTC replay, `R4` Ledger fault injection/recovery, and `R5` bounded advisory benchmark
were **not run**. No provider, browser, or managed-agent runtime was invoked.

## Source evidence

The static review covered `user-approval`, `ui-approval`, `core/tools`, `core/session`,
Cordis events/fiber lifecycle, and the upstream source checkpoint above. Relevant
design conclusions are preserved in `docs/baseline/` and the original handoff copy
remains under `docs/risk-advisor-current/`.

Final preflight verdict:

```text
STATIC_PREFLIGHT = PASS_WITH_ARCHITECTURE_UPDATES
```
