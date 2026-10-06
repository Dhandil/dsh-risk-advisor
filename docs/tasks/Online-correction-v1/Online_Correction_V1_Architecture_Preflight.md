# Risk Advisor Online Correction V1 — Architecture Preflight

## Outcome

`RISK_ADVISOR_ONLINE_CORRECTION_V1_PREFLIGHT_COMPLETE`

This preflight authorizes architecture discussion only. It does not authorize implementation.

## 1. Baseline

- Risk Advisor `main`: `7faa93d5c9c441f95eab4ca0adc3a1627c448942`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Phase 11 is closed at this baseline.
- No existing Phase 11.5 or Phase 12 Online Correction implementation was found.

## 2. V1 product boundary

Online Correction V1 should remain a deterministic, live advisory capability.

Allowed:
- live runtime evidence only;
- deterministic Finding / Diagnosis;
- fixed advisory wording;
- user-visible read-only presentation;
- dispositions `OBSERVE` and `ADVISE`.

Forbidden:
- LLM or embeddings in trigger, diagnosis, wording, or disposition;
- Pattern/Guidance as trigger, diagnosis, or disposition evidence;
- Agent-context injection;
- tool-input rewriting;
- automatic retry, replan, cancel, block, or new Run creation;
- Approval or Risk Assessment mutation;
- Harness Core modification.

Historical Pattern/Guidance exclusion is a V1 evidence-isolation rule, not a permanent architecture rule. Any future use as correction authority requires a separate Freeze.

## 3. Existing deterministic signals

### 3.1 Retry / failure relation

`RetryEscalationAnalyzer` already provides a bounded, process-local deterministic relation layer.

It captures:
- execution identity;
- exact operation fingerprint for supported read/write/bash/pwsh operations;
- nearest prior execution with the same fingerprint;
- retry count and recent failure count;
- structured failure kind / error code;
- deterministic failure signature;
- `sameRootCause`;
- permission escalation;
- TTL/capacity/truncation/degraded status.

The retry edge is frozen at the later attempt's capture boundary only when the prior same-fingerprint attempt had already settled as failure. A settled success for that exact fingerprint intentionally blocks the retry chain.

Important limitation: the current retry relation is **exact-fingerprint scoped**. It does not relate semantically similar but different operations such as:

```
npm install
npm install --force
npm install --legacy-peer-deps
```

unless those invocations produce the same frozen fingerprint, which they normally do not.

Therefore Online Correction V1 must not claim general semantic "same root cause" detection across changed commands. The current system is sufficient only for a conservative exact-operation retry finding.

### 3.2 Postcondition verification

`PostconditionVerifier` already emits sanitized deterministic `VerificationRecordV1` records.

A trustworthy postcondition failure is available when:
- `status === 'MISMATCHED'`;
- `semanticSuccess === false`;
- evidence quality is high or medium;
- reason includes `POSTCONDITION_MISMATCH`;
- the record came from the existing supported tool-contract / known-adapter path.

Direct write/edit verification is synchronous inside `tools/result`. Shell-known-adapter verification may complete asynchronously through `VerificationScheduler`.

The existing `onRecord` callback is already the correct post-verification intervention seam. It is observational and runs only after the sanitized record is stored in the process-local verification store.

### 3.3 Tool-result lifecycle

Current result ordering in `src/index.ts` is:

```
tools/result
  -> failureChain.observeResult(...)
  -> verifier.observeResult(...)
  -> experience.observeResult(...)
  -> foundation.retire(...)
```

This gives two safe finding points:

1. immediately after `failureChain.observeResult` for settled explicit/process failures;
2. from verifier `onRecord` for postcondition findings, including delayed asynchronous verification.

No pre-tool interception is required for V1.

## 4. Frozen candidate Finding families

### F1 — REPEATED_FAILURE_WITHOUT_PROGRESS

V1 can support this only with a deliberately narrow meaning.

Trigger all of the following:
- the current execution has a `FailureChainSummary.status === 'READY'`;
- evidence is not truncated or degraded;
- `retryCount >= 1`;
- `recentFailureCount >= 2`;
- `sameRootCause === true`;
- current and captured-prior failures belong to the existing exact-fingerprint retry chain.

"Without progress" in V1 means:

> no settled successful execution has broken this exact operation-fingerprint retry chain.

It does **not** mean that the overall user goal made no progress.

Recommended deterministic diagnosis:
- `REPEATED_SAME_SIGNATURE_FAILURE`

Recommended fixed advisory:
- `The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.`

Disposition:
- `ADVISE`

Conservative non-trigger cases:
- changed operation fingerprint;
- unknown failure signature;
- degraded/truncated relation;
- expired relation;
- unsupported tool shape;
- a successful same-fingerprint attempt breaks the chain.

This V1 definition intentionally gives up recall in exchange for deterministic precision.

### F2 — POSTCONDITION_NOT_SATISFIED

Trigger only on a sanitized supported verifier record satisfying:
- `MISMATCHED`;
- `semanticSuccess === false`;
- quality high or medium;
- exact supported verifier source/adapter;
- no conflict/unknown condition.

Recommended deterministic diagnosis:
- `VERIFIED_POSTCONDITION_MISMATCH`

Recommended fixed advisory:
- `The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.`

Disposition:
- `ADVISE`

`UNKNOWN`, `UNAVAILABLE`, low-quality evidence, process failure without postcondition verification, and verification conflict do not trigger F2.

## 5. Diagnosis and wording authority

V1 should contain no generative model.

The complete authority chain is:

```
Live Signal
  -> deterministic predicate
  -> deterministic Finding code
  -> deterministic Diagnosis code
  -> fixed Advisory template
  -> OBSERVE | ADVISE
```

There is no free-form diagnosis and no free-form correction proposal.

`OBSERVE` may be used for retained diagnostics or insufficient-to-notify states, but it must not be exposed as an execution action.

There is no `REQUEST_REPLAN` action in V1. A fixed advisory may recommend replanning in human-readable wording, but the system does not send a replan command or inject Agent context.

## 6. Runtime state and persistence recommendation

Do **not** add a durable Online Correction store in V1.

Recommended state:
- process-local;
- bounded;
- session/execution scoped;
- immutable finding records once emitted;
- short TTL aligned with existing live verification/failure-chain evidence;
- deterministic finding identity from execution ID + finding kind;
- duplicate observation is idempotent;
- conflicting evidence for the same finding identity fails closed / suppresses presentation.

Rationale:
- V1 validates live correctness, not long-term historical learning;
- Phase 11 already owns durable historical evidence;
- persistence would introduce recovery, provenance, retention, migration, and stale-advice semantics before they are needed;
- findings must not silently become a new historical authority.

A restart may lose Online Correction findings in V1. That should be explicit product behavior rather than reconstructed from Phase 11 history.

## 7. User-visible surface: existing blocker

The current Browser bridge is approval/assessment-centric.

Existing endpoints:
- `active`: keyed by `sessionId + callId`;
- `assessment`: keyed by `assessmentId`.

Existing bridge views represent approval-associated operation/risk/failure context. They are not a generic post-execution notification surface.

Therefore **there is no existing user-visible surface that can correctly host post-execution Online Correction findings without conflating advisory findings with Approval/Risk Assessment authority.**

V1 should not place Online Correction findings inside the existing approval assessment object.

Recommended new surface:
- a separate read-only Online Correction bridge contract/endpoint;
- independent Finding DTO;
- no Approval recommendation fields;
- no Risk Assessment fields;
- no mutation endpoint;
- browser/client can poll/read latest bounded findings for a session;
- presentation clearly labels findings as advisory.

A minimal UI may render a non-blocking advisory card/toast/history strip. It must not look like an approval gate.

This is the main product-surface addition required for V1.

## 8. Privacy

Persist nothing in V1.

Runtime Finding DTO must not expose:
- raw command/arguments;
- path/cwd/file content;
- stdout/stderr;
- tool result body;
- prompt/user/model content;
- approval justification;
- credentials/secrets.

Allowed browser-safe fields should be bounded enums and counts, for example:
- finding ID;
- finding kind;
- diagnosis code;
- disposition;
- execution-scoped opaque reference;
- retry count / recent failure count;
- verifier adapter class if necessary;
- bounded reason codes;
- observedAt;
- fixed rendered advisory text.

Do not expose the internal operation fingerprint or raw failure-signature material.

## 9. Capacity and lifecycle

Recommended V1 bounds should follow the existing live-runtime scale:
- bounded per-session findings;
- bounded global findings;
- short TTL;
- no eviction of pending computation;
- settled finding eviction is allowed because V1 is explicitly non-durable live diagnostics.

If capacity is exhausted:
- suppress new advisory findings;
- report diagnostic degradation/capacity;
- never affect Tool execution, verifier, Failure Chain, Approval, Risk Assessment, or Phase 11.

Lifecycle:
- finding runtime is observational;
- session disposal drops session findings;
- plugin generation disposal clears all findings;
- async verifier callback after disposal is ignored/fenced through existing verifier lifecycle;
- browser reads after state loss return unavailable/not-found, never reconstructed stale advice.

## 10. Key open questions resolved by this preflight

### Q1. Can V1 detect modified-command same-root retries deterministically with current code?

No.

The existing retry relation is exact-fingerprint based. Supporting changed-command retry families would require a new deterministic relation/family model and should not be smuggled into V1.

### Q2. Can F1 still be useful?

Yes, if explicitly frozen as exact-operation repeated failure rather than general semantic root-cause detection.

### Q3. Can F2 be implemented without new semantic infrastructure?

Yes.

The verifier already exposes the exact trustworthy signal and timing seam required.

### Q4. Is Phase 11 Pattern/Guidance required?

No.

V1 should not read them.

### Q5. Is a durable Finding store required?

No. It is not recommended for V1.

### Q6. Can the existing Approval Browser bridge be reused directly?

No. Reusing the approval view would blur advisory and approval/risk authority.

A separate read-only Online Correction surface is required if findings are genuinely user-visible.

## 11. Recommended phase structure

The work is now sufficiently bounded to justify a new top-level phase, but implementation should be split.

Recommended:

### Phase 12.1 — Live Correction Finding Core

- process-local bounded Finding runtime;
- F1 exact-operation repeated failure;
- F2 verified postcondition mismatch;
- deterministic codes and fixed wording;
- Host-side read-only diagnostics;
- no Browser/UI yet;
- no Agent context or execution authority.

### Phase 12.2 — User Advisory Surface

- separate read-only bridge contract;
- browser/client advisory presentation;
- no Approval/Risk Assessment coupling;
- no mutation/action endpoint;
- stale/capacity/session-disposal behavior.

Do not combine historical Pattern/Guidance evidence into Phase 12.1 or 12.2.

Any later historical-evidence correction or active intervention should be a separately frozen follow-on phase.

## 12. Required proofs before implementation acceptance

At minimum:

- F1 exact fingerprint retry + same deterministic failure signature triggers once;
- changed fingerprint does not trigger F1;
- successful same-fingerprint attempt breaks retry chain;
- degraded/truncated/expired/unsupported chains do not advise;
- F2 supported high/medium mismatch triggers once;
- MATCHED/UNKNOWN/UNAVAILABLE/low-quality/conflict do not trigger F2;
- async verifier completion can create F2 after tool result;
- duplicate signals are idempotent;
- capacity degrades only correction diagnostics;
- session disposal/generation disposal leaves no retained finding;
- privacy sentinels never reach browser DTO;
- no tool/approval/risk/retry/run behavior changes;
- no Pattern/Guidance access;
- no LLM/model calls;
- bridge/UI advisory surface remains read-only and independent from approval.

## 13. Preflight conclusion

Online Correction V1 is feasible without LLMs and without historical Pattern/Guidance.

The strongest immediately implementable finding is `POSTCONDITION_NOT_SATISFIED`.

`REPEATED_FAILURE_WITHOUT_PROGRESS` is also implementable, but only under the conservative exact-operation retry semantics already provided by `RetryEscalationAnalyzer`. General same-root-cause detection across changed commands is **not** supported by the current deterministic architecture and should be deferred.

The only material product blocker is presentation: the existing Browser bridge is approval-centric, so a separate read-only Online Correction surface is required to satisfy the "user-visible only" V1 boundary without contaminating Approval/Risk Assessment authority.

Recommendation: establish Phase 12 and split it into 12.1 Finding Core and 12.2 User Advisory Surface. Do not start implementation until those two freezes are written.
