# Phase 13.3 — Fresh Session Bootstrap & Live Risk Advisor Probe

Read: `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_New_Session_Bootstrap_Functional_Architecture_Review.md`

First, push **unchanged**, remotely confirm docs-only:
- local `4d50895b1470185d9f84ee6187930fc6d1066e76` on its `codex/phase13-3-locale-neutral-live-probe` branch (report based on prior main);
- local `f40a598858a81cc691e32659ff99e8bcb430419b` on the existing inventory-report branch (base `779e436c5cd461a02a1656a853a1489afaec2e99`).
If these report commits cannot be verified remotely, stop rather than changing their evidence.

Preflight pinned Harness `ddefc45f...`, accepted Product inputs `b1b605e...`, installed Client SHA `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`; prepare localized role selectors and two **new exclusively owned** disposable task roots in OS temp.

Use **ONE** real Harness Web `--no-open` Host and ONE ephemeral Chromium via Playwright. No Chrome address bar, tokens/logs or new MCP.

Do not require two existing nonblank Sessions. Through native UI run **task A** in newly created Session A and **task B** in newly created Session B (low-impact files only). Observe Tool and Risk Advisor evidence live. After both persist, prove A→B→A via `treeitem[aria-selected]` and native RPC Session ID changes. No custom RPC. If unproven, stop and report; no third task.

If proven, run at most two more **natural** F1/F2-opportunity tasks; cap **4 tasks / 40 Tools total**. Score only independently attributable F1/F2.

After all live observations, close Host/browser and remove **only this run's exact exclusive temporary task roots**; confirm absence. Report actual per-task files created, files cleaned, blocked leftovers and `CLEANUP_PASS/PARTIAL/BLOCKED`. Historical V2 49 files have **zero proven deletion candidates** and must remain untouched until a separately authorized cleanup.

No home-wide scan, Desktop/Documents/Downloads/iCloud access, macOS permission override, Product/validation/Harness/profile mutations, broad tests, artifact deletion, or Phase 13.4.

Publish one docs-only execution report with one frozen outcome from architecture review, without declaring Phase 13.3 accepted.
