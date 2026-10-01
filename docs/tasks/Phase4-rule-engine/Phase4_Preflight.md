# Risk Advisor — Phase 4: Rule Engine | Preflight

**Verdict:** `PHASE4_PREFLIGHT_READY`  
**Date:** 2026-10-01  
**Repository:** `Dhandil/dsh-risk-advisor`  
**Accepted Phase-3 product baseline:** `d7fe111d9dee35073a3e11d0ad456c1030593803`  
**Last accepted executable SHA:** `620ed7b7293b9186aed1067bbe0d4187cc73a34b`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Authority and formal scope

The governing sources are the V1 product spec, Architecture v1.2-r1, the downstream Risk Engine Contract, and the accepted Phase 1–3 implementation evidence.

The frozen roadmap defines Phase 4 as the deterministic **Rule Engine**:

- destructive
- permission
- path
- workspace
- secret / credential
- shell fail-closed
- reversibility
- failure-context rules

Phase 4 does **not** implement Context Builder, the complete RiskFeatureSet, six DimensionEvaluators, AssessmentAggregator, Fast Judge/LLM, final RiskAssessment, Recommendation policy, Browser risk UI, semantic postcondition verification, Evidence Collector, or Deep Judge.

The later Risk Engine Contract constrains downstream consumers, but does not move those roadmap phases into Phase 4.

## 2. Current repository foundation

There is no Phase-4 executable implementation yet.

Accepted Phase-1 Operation Foundation already owns the exact pre-execute capture and sole `ExecutionId` lineage, with bounded cloning, five-minute TTL, max 512 entries, and ephemeral raw arguments while an execution is active.

However, current `OperationFoundation` normalization formally supports only `read` and `write`. Its public diagnostic intentionally exposes only safe status/tool-kind/boundary information, and the current boundary projection remains unknown for canonical target, workspace containment, sandbox coverage, rollback and checkpoint.

Accepted Phase 2 provides structured exact failure/process/sandbox evidence and conflict-fail-closed behavior.

Accepted Phase 3 provides exact-live, exact-Session, generation-local `FailureChainSummary`, including `retryOf`, counts, `sameRootCause`, `permissionEscalation`, and bounded recent failure kinds/codes.

Therefore Phase 4 must reuse these owners. It must not mint a second execution identity, fork the failure taxonomy, or rebuild retry history.

## 3. Required Host-private RuleInput boundary

Phase 4 cannot be implemented by querying only current public Foundation diagnostics: shell semantics and the private normalized operation are not available there.

The safe design is to evaluate rule input at the existing exact live pre-execute capture point:

`existing correlation hook → Foundation capture → Phase-3 capture → Host-private RuleInput projection → pure Rule Engine`

The RuleInput projector may inspect the exact live `ToolExecution.arguments` once with closed, bounded, fail-closed access. It must immediately reduce them to structured semantic facts and discard raw sensitive values.

Phase 4 must **not** create a second long-lived raw-argument snapshot/store.

A later phase can consume a safe read-only service such as `riskAdvisorRules.get(executionId)`. No raw parser, projector, mutator or authority-minting helper should be exported from the package root.

## 4. Pinned Harness tool surface

The initial controlled Phase-4 adapter set should be frozen around:

- `read`
- `write`
- `edit`
- `bash`
- `pwsh`
- `web_fetch`
- `web_search`

Everything else should fail closed as unknown unless a later frozen adapter is added.

Important pinned-source facts:

- the standard filesystem suite exposes `read`, `write`, `edit`; there is no standard dedicated delete tool in that suite;
- destructive delete, git-destructive operations, package install/publish and many system mutations therefore primarily arrive through shell tools;
- `web_search` and `web_fetch` are retrieval operations, not external writes;
- both `bash` and `pwsh` exist in two shipped compositions with the **same tool name**.

The one-shot shell shape includes command/description/timeout/workdir/background/escalation fields. The persistent shell shape is only `{ command }`.

Phase 4 must recognize both pinned shell variants. It must not reject the persistent shell solely because Phase 3 deliberately used the narrower one-shot fingerprint adapter.

Persistent shell calls expose no per-call sandbox escalation fields, so Phase 4 must not invent requested-permission or sandbox-coverage facts for them.

## 5. Workspace and sandbox boundary

Pinned Harness exposes a public sandbox-policy service when mounted. `ctx.sandboxPolicy.resolve({session})` yields the current policy mode and workspace root; for normal agent calls the session workspace is based on `session.header.cwd`.

But these facts are distinct:

`sandbox policy known ≠ enforcing sandbox mounted for this tool ≠ this concrete operation is sandbox-covered`

The architecture invariant remains: `sandboxActive=true` does not imply `sandboxCovered=true`.

Phase 4 may consume current policy mode/root as policy evidence when the service is actually available, but concrete operation coverage must remain unknown unless a structured witness proves it.

## 6. Canonical paths and Phase-8 evidence boundary

Strong workspace/path-alias conclusions require canonical target evidence.

Current accepted Risk Advisor performs no filesystem stat/realpath/symlink/git/checkpoint evidence collection. The frozen roadmap assigns that class of bounded read-only investigation to Phase 8.

Therefore Phase 4 must not pull Evidence Collector work forward just to make rules look complete.

Consequences:

- lexical paths may support explicit well-known system/credential indicators;
- lexical comparison may be an internal hint but not authoritative canonical containment;
- hard `workspaceContained=true/false` stays unknown without canonical evidence;
- positive symlink/junction/path-alias findings stay unavailable without evidence;
- missing path evidence is never interpreted as safety.

This is a planned evidence gap, not a Phase-4 blocker.

## 7. Rule-category feasibility

| Category | Phase-4 status | Safe first implementation |
| --- | --- | --- |
| destructive | READY | closed, deterministic recognized shell forms; ambiguity fails closed |
| system-change | READY / PARTIAL | explicit system commands and well-known lexical path indicators only |
| permission | READY | requested sandbox mode; sudo/admin/ACL/chmod/ownership indicators; Phase-3 escalation fact |
| credential / secret | READY | bounded local pattern/category detection, never retain matched secret |
| network / external write | READY / PARTIAL | recognized shell upload/publish/push/remote mutation; web retrieval is not write |
| install | READY | known package-manager/global/lifecycle-capable install forms |
| workspace-boundary | PARTIAL | strong containment waits canonical evidence |
| path-alias | EVIDENCE-DEFERRED | no positive symlink/junction claim before Phase 8 |
| shell-ambiguity | READY | bounded fail-closed lexical analyzer |
| reversibility | PARTIAL | negative/context facts and unknown now; no unsupported positive `true` |
| failure context | READY | Phase-3 retry/failure/escalation facts; failure alone does not upgrade risk |

No architecture revision is required: Architecture v1.2 explicitly allows unknown boundary/reversibility facts.

## 8. Shell fail-closed boundary to freeze next

Phase 4 does not need a full POSIX or PowerShell grammar, but it does need a bounded conservative analyzer.

For a fully understood simple shell form, deterministic rules may fire. Unsupported, nested, dynamic or encoded semantics must generate `shell-ambiguity`, lower parser confidence, and prevent any inference of safety from the absence of another finding.

At minimum the next Architecture Freeze should cover top-level control constructs:

- `;`
- `&&`
- `||`
- `|`
- `&`
- newline

When safe top-level segmentation is possible, every segment must be inspected. A benign prefix cannot hide a destructive later segment: `git status && rm -rf build` must retain the destructive fact.

Ambiguity/fail-closed handling must cover at least command substitution/backticks, unsupported quoting/escaping, dynamic interpreters/wrappers, encoded execution, and environment-based semantic injection such as `PATH`, `LD_PRELOAD` and `NODE_OPTIONS`.

Representative dynamic forms include `eval`, `Invoke-Expression`, `bash -c`, `sh -c`, `node -e`, `python -c`, `perl -e`, `powershell -Command`, `powershell -EncodedCommand`, and `cmd /c`.

Broad substring matching over quoted data is forbidden. The text `rm -rf` inside inert quoted data must not automatically become an executable destructive fact.

## 9. First deterministic high-confidence rule families

The Architecture Freeze should define a versioned closed first ruleset covering representative forms such as:

- recursive deletion;
- disk format/wipe indicators;
- `git reset --hard`;
- destructive `git clean` forms;
- force push / force-with-lease;
- sudo/admin/ACL/ownership/permission mutation;
- registry/service/system-configuration mutation indicators;
- package install/global install/lifecycle-capable install;
- package publish;
- explicit upload/remote-write forms.

Rules should match parsed/understood token forms rather than uncontrolled substrings.

## 10. Secret and credential boundary

Phase 4 may implement a deterministic local credential/secret detector because `secret` is explicitly in the Phase-4 roadmap.

It may inspect bounded ephemeral operation input and produce only safe category facts. It must never retain or echo the matched value.

The initial vocabulary should align with the architecture's later Redactor coverage: common API/token prefixes, Authorization Bearer, private-key block indicators, password/token/api_key assignments, credential-bearing URLs and known credential-file indicators.

Phase 4 owns the local finding only. Phase 5 owns reviewer redaction/context construction.

Finding summaries must be static and sanitized, e.g. `CREDENTIAL_PATTERN_PRESENT`; never include the actual secret, raw path or command.

## 11. Reversibility boundary

Architecture requires evidence-backed reversibility.

Phase 4 can deterministically derive context flags such as remote mutation, system mutation and destructive deletion, but it does not yet own git-tracked/checkpoint/backup/canonical-target evidence.

Therefore:

- ordinary file mutation without evidence → reversible remains unknown;
- no command-shape-only `reversible=true`;
- remote/system/destructive operations may produce a bounded reversibility concern;
- theoretical recovery is not evidence.

The exact false-vs-unknown matrix for recognized irreversible-looking forms must be frozen before implementation.

## 12. Failure-context rules

Consume only accepted Phase-3 `FailureChainSummary` facts.

Allowed facts include proven retry, retry/failure counts, structured recent failure kind/code, `sameRootCause`, and `permissionEscalation`.

Product invariant: repeated failure by itself is **not** an automatic Risk upgrader.

`permissionEscalation=true` may produce a `permission` RuleFinding because it is directly within the Phase-4 permission category.

Repeated failure should remain bounded context for Phase-5 necessity/evidence reasoning rather than inventing a new RuleFinding category.

Approval justification/reason text is not user authorization evidence.

## 13. RuleFinding contract

Architecture v1.2 freezes the current RuleFinding categories: destructive, system-change, credential, network, install, permission, workspace-boundary, path-alias, shell-ambiguity, unknown-tool and reversibility.

Phase 4 should retain this union unless the next Architecture Freeze identifies a real source contradiction.

The downstream Risk Engine `RiskFeature` type is not a reason to replace RuleFinding in Phase 4. A later Context/Feature layer can map these deterministic findings and safe context into RiskFeatureSet.

RuleFinding summaries must be static/sanitized and never echo raw command, path, content, secret, justification or tool output.

## 14. Unknown tools

Unknown tools are first-class.

For any tool outside the frozen adapter set:

- normalized kind is unknown;
- parser confidence is low;
- emit an `unknown-tool` finding;
- never interpret a finding-free unknown operation as low risk.

This matters because the pinned tool catalog contains many control/state/experimental tools whose semantics cannot safely be inferred from names alone.

## 15. Web tools

`web_search` and `web_fetch` may establish external network read/access facts and may be scanned for credential-bearing input indicators.

They must not be labeled external-write/upload/publish merely because they access the web, and Phase 4 must not inspect their returned page content.

Network write findings require an actual recognized mutating signal, typically a supported shell remote-write/upload/publish form in the initial ruleset.

## 16. Storage, lifecycle and privacy

Recommended Rule Engine store:

- keyed by exact Phase-1 ExecutionId;
- max 512 entries;
- absolute TTL 5 minutes;
- no TTL refresh on query;
- generation-local;
- clear/inert on dispose/HMR;
- no durable guessed rebuild.

Persist only bounded normalized semantic facts, RuleFindings and safe reason/status codes.

Do not store or expose raw command, full path/content/edit text, secret value, approval justification, stdout/stderr/result, Session/event/ToolExecution, or raw exception detail.

When internal target identity is needed, prefer immediate evaluation or a private digest/category rather than retained raw target text.

## 17. Performance and side effects

Architecture target: Rule Engine `<20 ms`.

Phase-4 deterministic evaluation should therefore remain synchronous/pure and hard-bounded:

- no file reads or directory traversal;
- no git command;
- no child process;
- no network;
- no LLM;
- no Subagent.

A focused benchmark/smoke should measure the bounded worst-case rule path and report its environment honestly.

## 18. Assessment and Browser boundary

The existing Phase-1B `ApprovalAssessmentCoordinator` remains an unavailable lifecycle shell. Phase 4 should not prematurely implement the Phase-5 assessment pipeline.

Phase-4 acceptance requires only that a valid exact executionId can retrieve the corresponding bounded deterministic RuleEvaluation safely.

Phase 5 will own bounded Context Builder / deterministic feature organization / Fast Judge wiring. Browser remains unchanged in Phase 4.

## 19. Proposed focused validation matrix

The next Architecture Freeze should require focused coverage for:

1. read/write/edit adapters and pinned malformed values;
2. one-shot bash and persistent `{command}` bash;
3. one-shot pwsh and persistent `{command}` pwsh;
4. web_search/web_fetch as network read, not write;
5. unknown tool fail-closed;
6. simple shell command;
7. every required top-level separator;
8. benign first segment plus destructive later segment;
9. substitution/backticks/env injection/dynamic interpreter/encoded execution ambiguity;
10. unsupported/unclosed quoting ambiguity;
11. recognized danger plus independent ambiguity can coexist;
12. quoted inert data does not trigger blind substring rules;
13. recursive delete / reset-hard / destructive clean / force push;
14. privilege/ACL/ownership/system/registry/service indicators;
15. package install/global install/publish/remote mutation;
16. secret pattern detection without leakage;
17. credential-path indicator;
18. no canonical evidence → workspace containment unknown;
19. no Phase-8 evidence → no positive path-alias fact;
20. no evidence → no positive reversible=true;
21. sandbox policy presence alone never proves sandboxCovered;
22. Phase-3 permissionEscalation=true → permission finding;
23. escalation unknown remains unknown;
24. repeated failure alone does not create destructive/high-risk fact;
25. degraded relation does not become certainty;
26. frozen detached DTO and privacy scan;
27. TTL/capacity/dispose/HMR;
28. exact existing ExecutionId reused; no second mint;
29. genuine pinned Context/ToolRuntime integration;
30. Native Approval unchanged;
31. inherited 18 files / 133 accepted tests remain green.

## 20. STOP conditions

Stop with `PHASE4_ARCHITECTURE_DECISION_REQUIRED` rather than expanding scope if:

- canonical workspace/path-alias conclusions require filesystem I/O in Phase 4;
- positive reversibility requires git/checkpoint/backup evidence;
- shell analysis requires invoking an external shell/parser/child process;
- correctness requires broad substring matching over quoted/untrusted data;
- a secret must be retained or echoed;
- sandbox coverage would be inferred only from policy-service presence;
- failure history would require callId/time guessed reconstruction;
- Phase 4 would need ContextBuilder, Judge, RiskAssessment or Recommendation policy;
- Native Approval must change;
- Harness Core must change;
- a second ExecutionId owner or second raw-operation store appears necessary.

Unknown/degraded facts are preferred over scope expansion.

## 21. Inherited OPEN / NOT_RUN boundaries

Phase 4 must preserve:

- F-006 exact Live↔Durable positive confirmation: PARTIAL;
- F-013 exact replay/live positive witness: PARTIAL;
- general guard-returned-denial attribution: PARTIAL/UNKNOWN absent a complete public witness;
- true disk/process restart: NOT_RUN;
- real native PTC producer: NOT_RUN;
- deployed Live Browser/profile: NOT_RUN;
- WebWorker: NOT_VALIDATED;
- newer Harness/V4: NOT_VALIDATED;
- T05 production assessment budgets: UNDETERMINED;
- semanticSuccess verification: not implemented;
- Phase-8 canonical path/git/checkpoint Evidence Collector: not implemented.

## 22. Verdict

`PHASE4_PREFLIGHT_READY`

No pinned-source fact requires revising the frozen V1 roadmap.

Phase 4 is implementable as a bounded, synchronous, exact-live deterministic Rule Engine if the next Architecture Freeze explicitly separates **provable rule facts now** from **canonical/environment evidence deferred to Phase 8**.

The remaining Architecture Freeze decisions are:

1. exact closed adapter/tool set;
2. bounded shell analyzer grammar and ambiguity rules;
3. first versioned ruleset with codes/severity/hardness;
4. sanitized RuleEvaluation service contract;
5. exact negative-vs-unknown reversibility matrix;
6. optional sandbox-policy usage without claiming operation coverage;
7. mapping Phase-3 failure context into existing RuleFinding categories without inventing a new risk dimension.

This preflight performed source/repository inspection only. It made no executable, test, Client/Browser, Harness Core, provider/model, filesystem-evidence, or Native Approval changes.