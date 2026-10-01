# Risk Advisor — Phase 5 Residual Final Repair Instructions

**Review verdict:** `PHASE5_RESIDUAL_REPAIR_REQUIRED`  
**Date:** 2026-10-01  
**Reviewed repair Tested SHA:** `bcb07deb2f86344ec2f27c2cf70f9dde02c42b4e`  
**Reviewed report/evidence SHA:** `f14af30f9ec36524f8f8c1ba8d58dae35dc83d11`  
**Frozen Phase-5 architecture:** `578b1b434d2d366ecd7e9ccf9ec20ca27fe3cf11`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Scope

The previous Phase-5 repair correctly closed the large F1–F5 set: exact adapter reads, accessor safety, local A1 independence, Judge-facing unknown projection, duplicate-key strict parsing, and expanded scheduler/lifecycle proofs.

Two residual executable mismatches remain. Fix only R1–R2 below. Do not redesign Phase 5 and do not add new capabilities.

## 2. R1 — `reversibility` finding dimension is still wrong

Current executable `src/host/risk-engine.ts` still contains logic equivalent to:

```text
permission → PRIVILEGE
workspace-boundary/path-alias/shell-ambiguity/unknown-tool/reversibility → EVIDENCE_QUALITY
else → RISK
```

This contradicts the frozen Phase-5 Architecture mapping:

```text
destructive/system-change/credential/network/install/reversibility → RISK
permission → PRIVILEGE
shell-ambiguity/unknown-tool/path-alias/workspace-boundary → EVIDENCE_QUALITY
```

### Required repair

Map `reversibility` findings to `RISK`.

Keep `REVERSIBILITY_EVIDENCE_UNAVAILABLE` basis mapped to the retained recovery feature as appropriate; only the primary assessment dimension changes.

Do not change Phase-4 finding category/severity/hardness.

### Required tests

- `REVERSIBILITY_EVIDENCE_UNAVAILABLE` AssessmentFinding.dimension === `RISK`;
- destructive/system-change/credential/network/install remain `RISK`;
- permission remains `PRIVILEGE`;
- shell-ambiguity/unknown-tool/path-alias/workspace-boundary remain `EVIDENCE_QUALITY`;
- all basisFeatureIds still refer to retained RiskFeature IDs.

## 3. R2 — malformed URL userinfo fail-closed is incomplete

`redactCredentialUrls()` correctly throws for malformed URLs containing `user:password@...` or sensitive query keys, but its lexical fallback does not classify every malformed URL containing userinfo.

Example residual case:

```text
https://credential@bad[host/path
```

`new URL()` fails, and the current `hasCredentialMaterial()` can return false because it requires a colon before `@`. That permits raw URL userinfo to survive.

The Phase-5 privacy contract treats credential-bearing URL **userinfo or sensitive query material** as sensitive. The parser-failure path must therefore fail closed for any plausible URL userinfo component, not only `username:password` pairs.

### Required repair

For a matched `http://` or `https://` token that fails URL parsing:

- if the authority-like portion before the first `/`, `?`, or `#` contains `@`, treat it as userinfo-bearing and fail closed/redact;
- continue treating sensitive query keys (`token`, `key`, `secret`, `password`, `credential`, `auth`, `api_key` variants) as credential-bearing;
- do not expose raw malformed userinfo;
- do not use broad matching that redacts ordinary `@` outside URL authority.

Allowed outcome remains either deterministic lexical redaction or throwing so the seed/Judge detail is omitted.

### Required tests

- malformed `https://credential@bad[host/path` never survives raw;
- malformed `https://user:password@bad[host/path` remains fail-closed;
- malformed sensitive-query URL remains fail-closed;
- malformed URL without userinfo or sensitive query may remain ordinary non-secret data;
- valid credential URL still redacts username/password/query secrets;
- redaction remains idempotent.

## 4. Preserve previous repair closure

Do not regress:

- exact seven closed adapters;
- own-data-property/no-accessor reads;
- unknown-tool no raw traversal;
- A1 independent of ReviewerPayload;
- successful A1 removes `ASSESSOR_NOT_IMPLEMENTED`;
- strict duplicate-key JSON validation;
- post-redaction bounds;
- Judge-facing positive-proof false → unknown qualification;
- policy flags;
- scheduler timeout/saturation/cancellation/fencing tests;
- A1→A2 immutability;
- Native Approval non-interference;
- no Phase 6+.

## 5. Validation

Because executable source and tests change, create a new final Tested SHA.

Required order:

1. implement R1–R2 only;
2. run Phase-5 focused tests;
3. run P4/P3/P2 regressions;
4. run P1B/P1C/R4 regressions;
5. typecheck;
6. build;
7. Host/Client export smoke;
8. declaration/pack audit;
9. diff/scope/privacy/secret audit;
10. Harness mutation=0 verification;
11. rerun Phase-5 R5 smoke/full local follow-up;
12. commit executable/test repair;
13. run exactly one fresh complete `pnpm test` on that exact SHA.

After passing Full, no executable/test/config/package semantic drift. Only Execution Report and bounded R5 evidence may change.

## 6. Report

Update `Execution_Report.md` with a distinct residual R1–R2 section and record:

- residual repair start SHA;
- new executable/Tested SHA;
- R1 finding-dimension proof;
- R2 malformed-userinfo privacy proof;
- focused/regression/static/R5 results;
- exact fresh Full count;
- Tested→remote docs/evidence-only diff;
- inherited OPEN/PARTIAL/NOT_RUN/NOT_VALIDATED fields unchanged.

## 7. Allowed handoff

Return only:

`PHASE5_RESIDUAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE5_ACCEPTED` and do not start Phase 6.