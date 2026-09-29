# DSH Risk Advisor — T01 R1 fixture

This package is the disposable Browser-side R1 fixture for the frozen Approval UI seam.
It registers `conversation.approval.detail` with explicit priority `-100`, composes the
public Chat snapshot command semantics with a clearly marked `TEST FIXTURE`, and lets
the slot/runtime disposer restore the shipped detail renderer.

The fixture has no provider, LLM, Host approval listener, answer button, or privileged
execution path. The pinned Harness checkout is used only as a read-only source and test
reference; it is not a dependency checkout and is never changed by this repository.

Run the focused checks with the Harness-pinned Node toolchain:

```text
npm run typecheck
npm run test
```

The live Browser smoke is intentionally separate from these jsdom/real-slot checks and
is recorded in `docs/tasks/T01-approval-ui/Execution_Report.md`.
