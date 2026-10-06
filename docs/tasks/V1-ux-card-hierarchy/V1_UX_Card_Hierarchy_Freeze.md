# Risk Advisor V1 UX Maintenance — Card Hierarchy Freeze

## Outcome

`V1_UX_CARD_HIERARCHY_FROZEN_READY_FOR_IMPLEMENTATION`

Authority:

- accepted V1 executable: `f4807e2186e43690ba6dc4c349107b55e407aa53`
- objective Pilot report: `1fc93c1de41379729ff4ed81824ae251d0c76365`
- UX preflight: `dafdb78a863dfcbb8d10fdcc9a2980ec4927a834`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This task changes presentation hierarchy only.

## 1. Frozen default READY hierarchy

The default visible card must contain only:

1. Risk Advisor title + advisory disclaimer.
2. Compact operation identity:
   - operation title;
   - requested permission when present.
3. Decision summary:
   - risk;
   - recommendation;
   - primary reason.
4. Assessment caveat only when relevant:
   - PARTIAL;
   - DEGRADED.
5. One collapsed control:
   - Chinese: `查看详细分析`
   - English: `View detailed analysis`

Do not show all six dimensions, findings, uncertainties, evidence, failure context, source or raw diagnostic lists expanded by default.

## 2. Human-readable primary labels

The first screen must prefer human-readable localized presentation labels instead of raw enum/code strings.

Examples:

- `HIGH` -> `高风险` / `High risk`
- `NEED_MORE_INFORMATION` -> `需要更多信息` / `Need more information`
- `INSUFFICIENT_CRITICAL_EVIDENCE` -> `关键证据不足` / `Insufficient critical evidence`
- `DEGRADED` -> `评估降级` / `Assessment degraded`

The underlying raw values remain unchanged and must stay available in the detailed section for audit/debugging.

All aggregate primary reason codes currently produced by `assessment-aggregator.ts` must have a stable localized label or a bounded readable fallback.

Do not modify aggregator semantics.

## 3. Detailed analysis section

Create one top-level collapsed `<details>` owned by the READY card.

Inside it retain, in this order:

1. operation details;
2. six dimensions;
3. findings;
4. uncertainties;
5. safer alternatives;
6. evidence + pre-execution disclosure;
7. failure context;
8. assessment source (rules-only / judge-assisted);
9. raw aggregate values/codes needed for audit.

Nested details are allowed where useful, but the outer detailed-analysis container must be closed by default.

No information currently exposed by the READY presentation may become inaccessible.

## 4. Operation duplication

`RiskAdvisorDetail` already renders the original command separately when available.

Therefore the READY card primary layer must not repeat the full operation summary.

Keep:

- operation title;
- requested permission when present.

Move:

- resources;
- workspace containment;
- sandbox coverage;
- reversibility;
- full operation summary

to detailed analysis.

## 5. Alternatives

Do not elevate unverified/model-suggested alternatives into the primary decision area.

All current alternatives remain in detailed analysis.

A future task may selectively surface verified safer alternatives, but that is outside this maintenance scope.

## 6. Assessment truthfulness

The compact view must never make uncertainty look safer.

Requirements:

- UNKNOWN remains visibly unknown when it is the primary risk/recommendation fact;
- DEGRADED/PARTIAL remains visible in the compact layer;
- no LOW inference from missing evidence;
- no hiding of `danger-full-access` when requested;
- Native Approval disclaimer remains visible.

## 7. No authority change

Risk Advisor remains presentation-only.

Do not add:

- approve/reject buttons;
- auto-answer behavior;
- approval side effects;
- policy changes.

Existing copy-only alternative behavior may remain inside details.

## 8. Allowed source scope

Expected changes are limited to:

- `src/client/components/RiskAdvisorCard.tsx`
- `src/client/locales.ts`
- focused UI tests;
- optionally one small client-only presentation-label helper if it keeps mapping logic bounded.

Do not modify:

- Risk Engine;
- assessment aggregator;
- Browser bridge;
- Host runtime;
- correlation;
- Fast/Evidence/Deep Judge;
- Native Approval;
- Harness Core.

## 9. Required UI regression proof

Automated tests must prove:

- READY primary layer contains risk, recommendation and primary reason;
- human-readable labels are used in the primary layer;
- PARTIAL/DEGRADED remains visible;
- requested elevated permission remains visible;
- detailed analysis exists and is closed by default;
- all six dimensions still exist inside detailed analysis;
- findings/uncertainties/evidence/failure/source remain accessible inside detailed analysis;
- raw primary reason code remains available in detailed analysis;
- operation details remain accessible;
- no Approve/Reject/Execute/Apply authority is introduced;
- alternative copy behavior still works;
- UNAVAILABLE/ANALYZING/CANCELLED behavior remains unchanged.

## 10. Real Browser proof

After implementation and automated gates, install the exact candidate into the real `web` profile and trigger one safe real Native Approval.

User-visible success criteria:

- first screen is materially shorter than the current accepted card;
- risk / recommendation / reason are immediately identifiable;
- detailed analysis is collapsed by default;
- expanding details still exposes the full assessment;
- Native Approval remains usable and authoritative;
- no duplicate card or stale state.

This is a UX acceptance proof, so final subjective clarity remains user-owned.

## 11. Validation governance

Run:

1. focused UI tests;
2. affected P6/P10 presentation tests;
3. typecheck/build/package/static gates;
4. real Browser proof on exact committed candidate;
5. exactly one fresh complete `pnpm test` on final exact Tested SHA;
6. report-only publication after Full.

No executable drift after final Full.

## 12. Frozen conclusion

The authorized repair is:

> convert the READY card from an expanded diagnostic report into a compact decision summary with one collapsed detailed-analysis section, while preserving all underlying information and all Risk Advisor safety/authority semantics.
