# Risk Advisor Phase 13.3 — Focused Live Functional Probe Instructions

Sync main. Follow:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Live_Functional_Probe_After_First_Read_Architecture_Review.md`

Baseline: reconciled Web Client `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`, pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`.

1. Fix only the ephemeral Playwright observer's incorrect waiter callback. Do not change Product, validation, Harness or profile.
2. Use normal `dsh --profile web --no-open`, ephemeral Chromium with direct in-memory page navigation; **no Chrome address bar**. No token/log/cookie dumps.
3. Prove live active-Session identity matches a **normal** `risk-advisor/online-correction` request/response. If not, stop without Agent calls.
4. Then at most **4 real Agent tasks / 40 Tool calls**, normal Web Sessions and current model config: 2 quiet successes, 1 natural retry/recovery opportunity, 1 supported postcondition opportunity. Agent chooses all Tools; never force retries/Findings.
5. Capture during each live Session: sanitized Tool/settlement truth, Risk Advisor Finding (if any), Client read state, UI advisory and explanation. Distinguish no trigger, no Finding, expired Finding and unscorable evidence.
6. Report F1/F2 only when independently scorable. No expected positive = insufficient coverage, not 100% recall.
7. Stop unexpected high-impact actions, cleanly close ephemeral browser and its exact Host, preserve unrelated untracked files.
8. Submit one docs-only report, one frozen status token.

Do not rerun 20 tasks, create another Harness runtime/provider client, manually call RPC, change Product, run full tests, or start Phase 13.4.
