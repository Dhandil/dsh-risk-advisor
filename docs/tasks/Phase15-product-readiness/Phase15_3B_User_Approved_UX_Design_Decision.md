# Risk Advisor Phase 15.3B — User-Approved UX Design Decision

**Decision:** `RISK_ADVISOR_PHASE15_3B_DESIGN_ACCEPTED`  
**Design author / architecture authority:** ChatGPT  
**Product decision:** User explicitly approved A, B, C in conversation, 2026-10-11  
**Design proposal:** `Phase15_3B_ChatGPT_UX_Design_Decision_Proposal.md` at `beb819ab0f0357b6d29b3867bd667a6a51bc31f1`  
**Prior UX evidence:** `RISK_ADVISOR_PHASE15_3A_ACCEPTED_WITH_V7_LIMITATION`  
**Design-only acceptance; no product implementation yet.**

## Accepted design

- **A1 — Ordinary-risk historical Guidance:** use a separate initially collapsed native `<details>` labelled as historical and applicability-unverified; keep the current ordinary-risk summary and warnings dominant. Five existing historical fields retain exact source text, identity and freshness checks. Reset disclosure on change of Session/execution/assessment or withdrawal/expiry of history.
- **B1 — Native Approval detail metadata:** inside the existing Details modal use a semantic labelled definition-list/grid with a narrow-width stacked fallback, preserving multiple resources, permission, containment, sandbox and reversibility values. Outside modal, preserve **exactly the accepted 28px compact indicator** and existing Harness approval decision authority.
- **C — Safe staged localization:** localize UI-owned labels, applicability/provenance helper copy where needed for A/B. Never rewrite the frozen Host/Client F1/F2 fixed advisory bodies or change byte-identity/meaning; preserve source-bearing historical/current reason text unchanged. Any new explanatory bilingual F1/F2 presentation or formal translation contract change requires separately designed/reviewed follow-up (15.3D).

### Implementation partition

Authorize a *separately frozen* Phase 15.3C for A1+B1+only supporting C UI-owned microcopy. Do **not** include F1/F2 fixed-text changes, translations of historical Guidance or any Host/DTO/store/authority changes. Product implementation belongs to zcode/Codex under ChatGPT's already-approved UX design; the former Phase15.3B agent-design delegation is superseded and must not be run.

### Evidence limitations

Synthetic screenshots from Phase15.3A support component presentation, not a real-agent risk event or normal Web approval flow. Late async A→B→A response scenario V7 remains `NOT EXERCISED / UNSCORABLE`; future focused regression must not claim it is already proven.

**Status:** `RISK_ADVISOR_PHASE15_3B_DESIGN_ACCEPTED_IMPLEMENTATION_FREEZE_NEXT`.
