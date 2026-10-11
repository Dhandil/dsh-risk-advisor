# Phase 15.3C isolated UI validation

`node validation/phase15-3c/run.mjs` opens a fresh temporary-profile Google Chrome against a loopback-only Vite fixture. The fixture loads the source-built `lib/client.js`, the real Risk Advisor components and embedded CSS Modules, plus the pinned Harness UI primitives from `../../deepseek-harness`. All DTOs and store snapshots are synthetic; it never starts Harness, Provider, Agent, Tool, Native Approval controls or RPC/network activity. External browser requests are blocked.

The runner captures at most five new screenshots under `docs/tasks/Phase15-product-readiness/evidence/phase15-3c/`, refuses to overwrite an existing evidence directory, then closes Chrome and Vite and removes only its unique temporary directory.
