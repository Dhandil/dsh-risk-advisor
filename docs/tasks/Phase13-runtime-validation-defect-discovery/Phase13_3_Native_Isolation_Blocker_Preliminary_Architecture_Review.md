# Risk Advisor Phase 13.3 — Harness-Native Isolation Blocker Preliminary Architecture Review

## Outcome

`RISK_ADVISOR_PHASE13_3_NATIVE_ISOLATION_PREFLIGHT_REQUIRED`

**Campaign remains blocked.** No new campaign, readiness, model request, Agent Session, Tool call, or environment mutation is authorized by this review.

## Provenance and review limit

- reviewed repository baseline: `53de5157c9d1ce37f1d5054e7927ee0cb1ff8770`;
- executor-reported local report commit: `11c9023e7abc0cab333247911e646bfcbf770458` on `codex/phase13-3-harness-native-campaign`;
- that commit is **not pushed and has not been independently retrieved or reviewed here**;
- this document is a conditional architecture response to the reported result, not acceptance of a nonremote report.

Before any further acceptance decision, push the exact local report commit unchanged and verify docs-only provenance.

## Reported observation

Per the executor's report:

- an isolated `DSH_HOME` can separate Harness Session persistence;
- it does not by itself confine all Agent Tool filesystem access to the disposable workspace;
- tools can retain access to other files and credential material accessible to the same OS user;
- tool external network access cannot be reliably denied by the proposed native entry;
- no supported native entry satisfying all isolation conditions was found;
- no manifest was created, no Agent Session started, and no provider, readiness, or Tool request was made.

This is an **isolation/authority blocker**, not evidence of a Risk Advisor Product defect.

## Architecture correction

Harness-native execution remains the governing objective. Do **not** rebuild Harness provider selection, stream handling, Agent lifecycle, SessionStore, or ToolRuntime.

A filesystem root path in a prompt and an alternate `DSH_HOME` are not security boundaries.

The trust boundary must be outside Harness and verified by the operating system or a separately authenticated Tool execution sandbox.

## Required threat boundaries

A proposed isolation solution must demonstrate all of the following **before** Agent task 1:

1. **Host filesystem isolation**: tool processes cannot read/write normal user home, repositories, SSH material, credential stores, or host runtime sockets.
2. **Credential isolation**: ordinary user Harness tokens and credential stores are not reachable from Tool processes. A dedicated low-privilege test credential may be considered only with user authorization and without exposing it to Agent Tools.
3. **Network isolation**: Tool-side network is denied by enforceable network controls; Harness provider traffic must still work through the normal Harness provider path. A prompt saying 'do not use network' does not satisfy this.
4. **Runtime fidelity**: the pinned unmodified Harness runtime, normal Agent/Session/ToolRuntime path, and normally loaded Risk Advisor plugin remain the system under test.
5. **State isolation**: synthetic Harness sessions and their mutable stores cannot affect the user's normal Harness session/storage.
6. **Disposable lifecycle**: setup, teardown, and evidence retention are bounded and do not touch user projects.
7. **Testability**: at least one read-only way exists to prove each security property without touching real private data or issuing real provider/tool campaign calls.

Container/VM or separate OS identity are **candidate isolation primitives**, not approved implementations. A different `HOME`/uid alone does not prove Tool-side network isolation, credential containment, or container privilege boundaries. Nor does allowing provider egress from a container automatically prove that spawned Tool processes cannot egress.

Any proposed design must explicitly account for process inheritance, mounts, sockets, DNS/egress controls, provider credential handling, and whether child Tool processes can reach the provider endpoint.

## Decision

Do not weaken the Phase 13.3 safety boundary to get a run.

Do not create a new Harness substitute.

Do not require graphic UI as a prerequisite if a genuine supported CLI/API path exists.

Do not assume macOS filesystem/container primitives meet the required guarantees without evidence.

Proceed only with a **read-only isolation feasibility preflight**. If a safe design cannot be demonstrated from supported Host/OS interfaces, preserve blocked status and return for architecture decision.

## No authority granted

This review does **not** authorize:

- starting a real Agent or provider readiness;
- invoking Agent Tool commands;
- generating/running a campaign manifest;
- changing Harness/Product/validation code or current configuration;
- installing dependencies or container engines;
- creating/modifying OS users, containers, VMs, firewall policies, credentials, or mounts;
- removing old temporary files;
- Phase 13.4.

## Status

`RISK_ADVISOR_PHASE13_3_NATIVE_ISOLATION_PREFLIGHT_REQUIRED`
