# DSH Risk Advisor V1

DSH Risk Advisor is a bounded, read-only advisory presentation for Harness tool
operations. It observes the native approval lifecycle, builds deterministic risk
facts, and may add bounded Fast Judge, Evidence, or tool-less Deep Judge context.
It never answers or replaces Native Approval: the Harness Native Approval service
remains the only authority for allow, reject, cancel, and execution.

## External bundle installation

The package ships `cordis.patch.yml` as an external Harness bundle. For local
development, build and pack this repository, then install the tarball into a
disposable Harness profile with the pinned CLI:

```text
pnpm run build
pnpm pack
dsh plugin --profile risk-advisor-dev add ./dhandil-dsh-risk-advisor-0.1.0-r1.tgz
```

Use a disposable `DSH_HOME` for verification. Registry publication is not
claimed by this repository.

## Default behavior and optional reviewers

The default installation is provider-free and deterministic. Fast Judge is
disabled unless explicitly configured with a local or otherwise authorized LLM
route. Deep Judge is disabled by default; enabling it requires the accepted
`trusted-parent-composition` mode, a tool-less `spawn` capability, and bounded
sanitized input. These local structural seams do not claim external-provider
performance or prompt-injection immunity.

## Privacy and truthfulness

Reviewer payloads are bounded and redacted. Raw tool arguments, file contents,
credentials, provider diagnostics, and private paths are not retained in Risk
Advisor diagnostics or Browser DTOs. Evidence is a pre-execution observation;
execution-time state may change. Risk Advisor does not provide an atomic
execution-time guard, veto, or mutation authority.

Safer alternatives are display/copy-only suggestions and remain
`MODEL_SUGGESTED / UNVERIFIED`. No Use, Execute, Apply, or approval action is
provided by this package.

## Development checks

Use the pinned local toolchain:

```text
pnpm run typecheck
pnpm run test:p10
pnpm run bench:r5:p10:smoke
pnpm run bench:r5:p10
pnpm test
```

Phase-10 cold-start verification uses a disposable profile and two fresh CLI
processes. It is not an in-process remount substitute.

## Compatibility

This release targets the pinned Harness Core
`deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
Harness Core is a read-only reference for this repository.
