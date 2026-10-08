# Phase 13.3 — Chromium-First Functional Resume Instructions

Sync main; read and follow:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Chromium_First_Single_Run_Resume_Architecture_Review.md`

Preflight pinned Harness `ddefc45f...`, accepted Product inputs `b1b605e...`, installed Client `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.

**Change execution order:**
1. Before starting Host or creating task roots, stat only the exact cached Chromium executable from Playwright; inspect launch options and prepare to capture/sanitize the original `chromium.launch()` exception.
2. Launch **one** fresh nonpersistent Chromium and prove `about:blank`. If it fails, record sanitized original error stage, name/code/message, stop **without Host launch or retries**.
3. If it works, reuse **the same** browser/context; start **one** native pinned Harness `--no-open` Host, direct normal token URL navigation in memory, never Chrome omnibox.
4. Through real UI create/select Session A/B, perform two tiny safe Agent tasks in two exclusive OS temp roots; prove A→B→A with actual `aria-selected` and Client-originated RPC Session identities. Stop if unproven.
5. Only then allow up to two organic F1/F2 opportunity tasks. Maximum **4 tasks / 40 Tools total**. Do not force failures or score empty `VIEW` as TN.
6. After required Finding/Tool observation and quiescence, remove **only** this run's exact owned disposable roots and verify absence. Stop and clean browser/Host with separate process/port checks; record `CLEANUP_PASS/PARTIAL/BLOCKED`.

**Forbidden:** Browser/Playwright reinstall, alternate browser retry, custom RPC, source/config/profile changes, browsing or permission request for Desktop/Documents/Downloads/iCloud, home/temp-wide scans, deleting V2 49 files, installed dependencies or old archives, Phase 13.4.

Submit a docs-only report with one review-defined frozen outcome. It must report real error details (sanitized) if Chromium fails, not only a generic classification.
