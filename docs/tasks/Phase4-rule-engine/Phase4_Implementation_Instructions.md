# Risk Advisor — Phase 4: Rule Engine | Implementation Instructions

**Authority:** `Phase4_Architecture_Freeze.md` is frozen and authoritative for this task.  
**Architecture checkpoint:** `55566056952454286c00133ab891f173e24137ab`.  
**Accepted pre-Phase-4 product baseline:** `d7fe111d9dee35073a3e11d0ad456c1030593803`.  
**Last accepted executable:** `620ed7b7293b9186aed1067bbe0d4187cc73a34b`.  
**Preflight publication:** `4e87d52663460d441955125974cc93422328c76c`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY.  
**Final acceptance authority:** ChatGPT Web.

## 1. Start safely

1. Sync `Dhandil/dsh-risk-advisor` `main` normally.
2. Record exact local HEAD, `origin/main`, `git ls-remote origin refs/heads/main`, current branch and full status before any write.
3. Confirm HEAD contains architecture checkpoint `55566056952454286c00133ab891f173e24137ab` and the Phase-4 task directory contains Preflight, Architecture Freeze and these instructions.
4. Preserve all unrelated user/untracked drift.
5. Do not use `reset --hard`, `clean`, destructive checkout, rebase of user work, force push or broad formatting.
6. Keep pinned Harness strictly read-only. Do not modify, checkout, reset, clean, install into or build Harness Core merely to implement this plugin.

If remote history advanced beyond the instruction publication, inspect the delta. Continue only if it is docs-only or otherwise demonstrably compatible; record the evidence. Otherwise stop with `PHASE4_BLOCKED_REMOTE_DRIFT`.

## 2. Implement exactly Product Phase 4

Implement the frozen deterministic Rule Engine only:

```text
closed adapters
bounded shell fail-closed analysis
phase4-v1 deterministic RuleFinding rules
sanitized RuleEvaluation
exact ExecutionId-owned Rule Engine store
Phase-3 failure/escalation context projection
read-only Context query
```

Do not implement the Phase-5+ Risk Engine pipeline.

Expected primary files:

```text
src/host/rule-engine.ts
src/index.ts
tests/p4-rule-engine.unit.spec.ts
tests/p4-runtime.integration.spec.ts
package.json
docs/tasks/Phase4-rule-engine/Execution_Report.md
```

A narrowly scoped internal helper file is allowed when it materially improves scanner/testability, but do not split Phase 4 into a new framework or dependency tree.

Do not change Browser/Client product behavior.

## 3. Implement one generation-local RuleEngine

Recommended runtime shape:

```ts
class RuleEngine {
  observePreExecute(exec, executionId, failureSummary): void
  diagnostics: { get(executionId): RuleEvaluation }
  dispose(): void
}
```

Exact method names may vary.

Required ownership:

- uses only Phase-1 `ExecutionId`; no new ID mint;
- one instance inside `apply(ctx)`;
- max 512 retained evaluations;
- absolute 5-minute TTL from capture;
- query never refreshes TTL;
- monotonic injectable clock for tests;
- generation-local only;
- dispose clears state and makes late observations inert.

Do not create a persistent store or replay historical RuleEvaluations from durable events.

## 4. Integrate through the existing capture hook

Extend only the existing internal capture plumbing.

Required order:

```text
foundation.capture(exec, executionId, parentExecutionId)
failureChain.observePreExecute(exec, executionId)
ruleEngine.observePreExecute(exec, executionId, failureChain.diagnostics.get(executionId))
```

or an equivalent call sequence that preserves the same semantics.

Do not add a second listener whose correctness depends on Cordis listener ordering.

Wrap Rule Engine observation faults so they never block `next()` / native tool execution / Native Approval.

Provide the read-only service on Context, e.g.:

```text
riskAdvisorRules.get(executionId)
```

Package root may export only the safe Phase-4 DTO/service types needed by later consumers.

## 5. Bounded argument access

Implement a small Phase-4-specific bounded reader or safely reuse an existing package-internal bounded helper without weakening its accepted semantics.

Required fail-closed rules:

- plain/null-prototype object only;
- own data properties only;
- accessor/getter = unsupported;
- max total argument budget 16 KiB;
- max keys 64;
- max string length 8192;
- max array items 32;
- controlled nesting only;
- unknown adapter keys rejected;
- malformed values rejected;
- no silent dropping of fields to create a simpler safe-looking operation.

Do not retain the bounded clone after RuleEvaluation has been constructed.

## 6. Implement the frozen closed adapters

### 6.1 read

Closed keys:

```text
file_path
offset?
limit?
```

Validate:

- non-blank file_path;
- supplied offset/limit positive integers;
- local safety cap if needed.

Set:

```text
operationKind=filesystem-read
mutating=false
externalEffect=false
networkEffect=none
```

Scan only the requested lexical path for credential-resource indicators. Do not read the target.

### 6.2 write

Closed keys:

```text
file_path
content
sandbox_permissions?
justification?
```

Validate file path/content and exact permission+justification pairing.

Retain at most:

```text
requestedPermission = workspace-write | danger-full-access
```

and semantic findings.

Never retain content or justification.

### 6.3 edit

Closed keys:

```text
file_path
old_string
new_string
replace_all?
sandbox_permissions?
justification?
```

Mirror pinned value constraints:

- non-blank path;
- old_string non-empty;
- old_string != new_string;
- replace_all boolean when supplied;
- exact escalation pairing.

Inspect old/new strings only ephemerally for credential material; never retain them.

### 6.4 standard one-shot bash/pwsh

Recognize the frozen one-shot shape:

```text
command
description
timeoutMs?
workdir?
run_in_background?
sandbox_permissions?
justification?
```

Apply the Phase-3-repair value constraints:

- non-blank command;
- required non-blank description;
- positive bounded timeout when present;
- bounded workdir when present;
- background boolean when present;
- permission+justification paired;
- permission only in `workspace-write | danger-full-access`.

### 6.5 persistent bash/pwsh

Also recognize the pinned persistent shape:

```text
{ command }
```

with non-blank bounded command.

Do not require description, timeout, workdir or escalation fields on this variant.

Do not invent requestedPermission for persistent shell calls.

### 6.6 web_fetch

Closed shape:

```text
{ url }
```

Accept bounded parseable `http:`/`https:` URL only for the high-confidence adapter.

Set network-read facts and emit `NETWORK_EXTERNAL_READ`.

Inspect URL ephemerally for credential-bearing indicators, then discard it.

### 6.7 web_search

Closed shape:

```text
{ queries: string[] }
```

Require non-empty strings and Phase-4 bounded item/byte budget.

Set network-read facts and emit `NETWORK_EXTERNAL_READ`.

Inspect queries ephemerally for credential patterns; discard them.

### 6.8 unknown tool

For any other tool:

```text
status=UNSUPPORTED
operationKind=unknown
parserConfidence=low
UNKNOWN_TOOL finding
```

Do not special-case arbitrary catalog names based only on English meaning.

## 7. Implement a bounded shell scanner, not a shell runtime

Keep the scanner synchronous and local.

### Required top-level controls

Outside inert quoting, recognize:

```text
;
&&
||
|
&
newline
```

When safe segmentation succeeds, evaluate every segment independently and union/dedupe findings.

Example invariant:

```text
git status && rm -rf build
→ DESTRUCTIVE_RECURSIVE_DELETE
```

### Quoting invariant

Quoted inert data cannot trigger destructive findings merely because dangerous words appear inside the data.

Add a direct negative test for quoted `rm -rf` text.

### Dynamic/ambiguous forms

Detect at minimum:

```text
$()
backticks
unsupported substitution
unsupported/unbalanced quoting or escape
eval
Invoke-Expression
bash -c
sh -c
node -e
python -c
perl -e
powershell -Command
powershell -EncodedCommand
cmd /c
dynamic invocation
```

Use:

- `SHELL_DYNAMIC_EXECUTION` for dynamic code/wrapper execution;
- `SHELL_ENCODED_EXECUTION` additionally for encoded execution;
- `SHELL_SEMANTICS_AMBIGUOUS` for other unsupported executable semantics.

Never recursively execute or fully parse the nested program.

### Environment injection

Detect execution-affecting assignments/preambles for at least:

```text
PATH
LD_PRELOAD
NODE_OPTIONS
```

Emit `SHELL_ENVIRONMENT_INJECTION`.

Do not strip arbitrary `KEY=value` prefixes and then classify the remainder as definitely safe when semantics are not fully understood.

### Redirection

If redirection changes state and cannot be classified within the frozen small grammar, emit ambiguity rather than ignoring it.

## 8. Implement the exact `phase4-v1` finding matrix

Do not invent new RuleFinding codes during normal implementation.

Required codes:

```text
UNKNOWN_TOOL
SHELL_SEMANTICS_AMBIGUOUS
SHELL_DYNAMIC_EXECUTION
SHELL_ENCODED_EXECUTION
SHELL_ENVIRONMENT_INJECTION
DESTRUCTIVE_RECURSIVE_DELETE
DESTRUCTIVE_DISK_WIPE
DESTRUCTIVE_GIT_RESET_HARD
DESTRUCTIVE_GIT_CLEAN
DESTRUCTIVE_FORCE_PUSH
SYSTEM_LOCATION_MUTATION
SYSTEM_REGISTRY_MUTATION
SYSTEM_SERVICE_MUTATION
PERMISSION_DANGER_FULL_ACCESS
PERMISSION_PRIVILEGE_ELEVATION
PERMISSION_ACCESS_CONTROL_MUTATION
PERMISSION_ESCALATION_RETRY
CREDENTIAL_SECRET_MATERIAL_PRESENT
CREDENTIAL_RESOURCE_ACCESS
NETWORK_EXTERNAL_READ
NETWORK_EXTERNAL_WRITE
INSTALL_PACKAGE_MUTATION
INSTALL_GLOBAL_SCOPE
REVERSIBILITY_EVIDENCE_UNAVAILABLE
```

Use exactly the category/severity matrix in `Phase4_Architecture_Freeze.md`.

All Phase-4 deterministic findings have:

```text
hard=true
id=code
```

Deduplicate findings by code.

Finding summaries are static lookup strings. Do not interpolate raw values.

## 9. Destructive rules

Implement token-aware closed recognition for at least:

- recursive `rm` flags;
- PowerShell `Remove-Item`/closed alias + `-Recurse`;
- closed disk format/wipe forms from the freeze;
- `git reset --hard`;
- forced/destructive `git clean` forms;
- `git push --force`, `-f`, `--force-with-lease`.

Normal `git push` is external write but not a destructive-force-push finding.

Do not use `command.includes('rm -rf')`-style matching across raw command text.

## 10. System-change rules

For a known mutation, detect only frozen lexical system-location patterns.

Do not convert that fact into canonical workspace containment.

Implement closed registry/service mutation tokens sufficient for the frozen focused tests.

Read-only system inspection does not produce system-change.

## 11. Permission rules

Emit:

- `PERMISSION_DANGER_FULL_ACCESS` only from validated exact requested permission;
- `PERMISSION_PRIVILEGE_ELEVATION` only from recognized explicit elevation token forms;
- `PERMISSION_ACCESS_CONTROL_MUTATION` from recognized ACL/ownership/permission mutation forms;
- `PERMISSION_ESCALATION_RETRY` only when the Phase-3 exact summary equals true.

`workspace-write` alone is a fact, not a finding.

Do not decide minimal/proportionate/excessive privilege.

## 12. Credential / secret rules

Implement local bounded matching for the frozen vocabulary.

On hit, store only the boolean/code-level fact.

Forbidden:

- matched secret;
- partial secret;
- surrounding text;
- secret hash;
- original URL/query/content in the finding;
- raw credential path in public DTO.

Credential-resource matching is lexical only and must use a closed list.

Do not read the resource.

## 13. Network/install rules

`web_fetch`/`web_search` emit external-read only.

Closed shell external-write recognition must include:

- normal/forced `git push`;
- frozen npm/pnpm publish forms;
- any explicitly implemented upload/HTTP mutation form only when the scanner fully understands the relevant tokens.

Closed npm/pnpm install/add/ci forms emit `INSTALL_PACKAGE_MUTATION`.

Explicit global form additionally emits `INSTALL_GLOBAL_SCOPE`.

Do not claim that lifecycle scripts actually executed.

## 14. Workspace, sandbox and path-alias limits

Hard-code the Phase-4 public evidence values to:

```text
workspaceContained='unknown'
sandboxCovered='unknown'
```

Do not add filesystem probing, `realpath`, stat, symlink/junction or git calls.

Do not add sandbox-policy as a new injected/peer dependency in Phase 4.

Do not infer path-alias or outside-workspace facts from lexical normalization.

No positive `path-alias` finding is expected in Phase 4.

## 15. Reversibility

Public Phase-4 value:

```text
reversible='unknown'
```

always.

If at least one destructive/system-change/NETWORK_EXTERNAL_WRITE finding exists, add exactly one:

```text
REVERSIBILITY_EVIDENCE_UNAVAILABLE
```

Do not add this finding for ordinary read-only operations or every ordinary write/edit.

Do not guess `false` merely because an action looks difficult to undo.

## 16. Consume Phase-3 failure context exactly

After Phase-3 `observePreExecute`, query its read-only summary using the same ExecutionId.

Project only:

```text
isRetry = retryOf !== undefined
retryCount
recentFailureCount
sameRootCause
permissionEscalation
degraded = summary.status not READY where context is incomplete
```

Do not copy raw fingerprint, requested permission history, command/path, reason, error text, stdout/stderr or recent entry contents into the Phase-4 public DTO.

Repeated failure alone emits no risk/destructive finding.

Only `permissionEscalation === true` emits `PERMISSION_ESCALATION_RETRY`.

## 17. RuleEvaluation status

Implement the freeze exactly:

- READY = supported adapter + coherent bounded parse;
- DEGRADED = useful proven facts plus material shell ambiguity and/or degraded relation context;
- UNSUPPORTED = unknown tool or unsupported/malformed/hostile/over-budget adapter input;
- NOT_FOUND/EXPIRED/CAPACITY_EXCEEDED = lifecycle/query states.

A READY result with critical findings is valid. READY is not a safety verdict.

A DEGRADED result keeps independently proven findings.

An UNSUPPORTED result must not be represented as a safe empty READY result.

## 18. Privacy and DTO freeze

The supported RuleEvaluation must be deeply frozen/detached.

Run explicit tests/grep/audit proving the public DTO and retained Rule Engine state do not contain:

```text
command
file_path
workdir
url
queries
content
old_string
new_string
justification
approval reason
secret material
stdout
stderr
tool output
operationFingerprint
operationHash
Session
ToolExecution
Agent
raw exception text
```

Field/property names in internal source may mention adapter schema names; the privacy gate concerns retained/public **values** and public DTO surface. Do not weaken this into a naive source-text prohibition.

## 19. Required focused tests

Implement focused unit/component tests matching the Architecture Freeze's mandatory matrix.

Use parameterized tables for rule families rather than inflating test count.

At minimum prove:

1. all 7 adapters, including both shell variants;
2. unknown/malformed/accessor/over-budget fail-closed behavior;
3. separators and quote-safe segmentation;
4. dangerous later segment;
5. quoted inert dangerous words do not fire;
6. dynamic/encoded/substitution/environment ambiguity;
7. destructive rule family;
8. system-change family;
9. permission family;
10. credential/secret family with no leakage;
11. network read vs external write;
12. install/global install;
13. workspace/path/sandbox unknown preservation;
14. reversibility unknown + concern finding;
15. Phase-3 escalation integration;
16. repeated failure non-upgrader;
17. TTL/capacity/query behavior;
18. frozen DTO/privacy;
19. dispose/HMR;
20. exact existing ExecutionId reuse.

## 20. Genuine pinned runtime integration

`tests/p4-runtime.integration.spec.ts` must exercise the real pinned package composition available to the plugin tests, not only hand-built DTOs.

Prove at least:

- actual Context + ToolRuntime pre-execute produces one Phase-4 evaluation under the existing ExecutionId;
- a harmless known tool still executes normally;
- a local deterministic approval-triggering fixture, where applicable, is not blocked/answered by Risk Advisor;
- no duplicate pre-execute identity path exists;
- Rule Engine disposal does not break native runtime;
- unknown/degraded advisor state leaves Native Approval/tool behavior available.

Do not make real external network calls or destructive shell/filesystem effects.

## 21. Performance smoke

Add a deterministic local bounded fixture that repeatedly evaluates a worst-case **allowed-size** shell input.

Record observed timing in the Execution Report.

Do not call filesystem/network/process/model providers.

The architecture target is `<20 ms` for one Rule Engine evaluation, but do not create a flaky wall-clock release gate unless measurements are stable in the repository environment.

A design that performs I/O, spawns processes or grows with Session length is a blocker regardless of a single measured number.

## 22. Package/public-surface changes

Add:

```text
test:p4
```

to `package.json` and include it in the full `test` chain.

Recommended focused files:

```text
tests/p4-rule-engine.unit.spec.ts
tests/p4-runtime.integration.spec.ts
```

Export only RuleEvaluation/RuleFinding/service type vocabulary needed by future consumers.

Do not export scanner/adapter/matcher/rule evaluator mutation helpers from the package root.

Run declaration/root-export audit to prove this.

## 23. Iteration tests before final gates

While implementing, run only the smallest affected suites first.

Recommended order while iterating:

1. `test:p4` focused;
2. directly affected Phase-3 focused;
3. directly affected Phase-2/R4 tests when shared Host plumbing changes;
4. Phase-1 correlation/foundation tests if capture wiring changes.

Do not repeatedly run the full suite during implementation.

## 24. Pre-Full quality-gate order

After focused behavior is complete, run all cheap/static gates **before** the final full:

1. Phase-4 focused suite;
2. directly affected inherited suites;
3. TypeScript typecheck;
4. build;
5. Host export smoke;
6. Client export regression smoke;
7. declaration/root-export audit;
8. `pnpm pack --dry-run --json`;
9. `git diff --check`;
10. scope audit;
11. privacy/secret-retention audit;
12. Harness mutation=0 verification.

Repair any failure now and rerun the directly affected focused/static gates.

Only after every pre-Full gate is green may you freeze the executable/test/config/package state.

## 25. Final executable commit and exactly one fresh complete regression

Commit the final executable/test/config/package state.

Record that exact SHA as the candidate Tested SHA.

Then run exactly one fresh complete:

```text
pnpm test
```

against that exact SHA.

Current accepted baseline before Phase 4 is:

```text
18 test files / 133 tests
```

Do not hard-code an expected final test count. Report the actual final count.

If the fresh full passes:

- that executable SHA becomes the Phase-4 Tested SHA candidate;
- do not modify executable code, tests, config, package scripts or dependency semantics afterward.

If the fresh full fails:

- preserve/report that failed attempt;
- repair only within frozen Phase-4 scope;
- rerun required focused/static gates;
- create a new executable SHA;
- run a new fresh final full on the new SHA.

Never claim a Full run still covers later semantic executable drift.

## 26. Side-effect limits

Required counts for this task:

```text
real provider/model calls = 0
real external product/network calls = 0
deployed Browser/profile runs = 0 unless separately authorized
real destructive filesystem/shell actions = 0
Harness Core mutations = 0
Native Approval authority changes = 0
Phase-5+ implementation = 0
```

Local deterministic fixture tools and in-memory test data are allowed.

Do not add new runtime dependencies solely to parse shell or satisfy lint/publint.

## 27. Preserve inherited open gates

Do not promote these without separate evidence:

```text
F-006 = PARTIAL
F-013 = PARTIAL
general guard-returned denial = PARTIAL/UNKNOWN when full witness absent
true disk/process restart = NOT_RUN
real native PTC producer = NOT_RUN
deployed Live Browser/profile = NOT_RUN
WebWorker = NOT_VALIDATED
newer Harness/V4 = NOT_VALIDATED
T05 production assessment budgets = UNDETERMINED
semantic verification = NOT_IMPLEMENTED
Phase-8 canonical path/git/checkpoint evidence = NOT_IMPLEMENTED
```

## 28. Prohibited scope

Do not implement:

- Context Builder / RiskContextSnapshot;
- full RiskFeatureSet;
- Risk/Authorization/Necessity/Privilege/Alternatives/EvidenceQuality evaluators;
- AssessmentAggregator or P0–P9;
- final RiskAssessment;
- recommendation/safer alternative;
- authorization inference from user messages;
- minimum permission/excessive privilege;
- Fast Judge/LLM/provider route;
- SecretRedactor reviewer payload;
- Browser risk UI;
- postcondition/semantic verification;
- Evidence Collector;
- Deep Judge;
- canonical path/stat/symlink/junction/git/checkpoint reads;
- durable retry reconstruction;
- generic behavior-chain analysis;
- Native Approval answerer/override;
- Harness Core changes.

## 29. STOP conditions

Stop with `PHASE4_ARCHITECTURE_DECISION_REQUIRED` instead of improvising if:

- implementation needs a second ExecutionId owner;
- implementation needs a second raw-operation store;
- safe rule matching requires executing an external parser/shell;
- quoted/untrusted data cannot be distinguished without broad substring heuristics;
- a rule requires retaining/echoing a secret;
- workspace/path-alias correctness requires filesystem evidence;
- reversibility requires git/checkpoint/backup evidence;
- sandbox coverage requires assuming policy presence equals enforcement;
- failure context requires callId/time/tool guessing;
- Phase 5+ components are required to make Phase 4 appear complete;
- Native Approval must change;
- Harness Core must change;
- accepted Phase-2/3 conflict/privacy semantics would be weakened.

## 30. Execution Report

After the passing fresh full, make only report documentation changes.

Create:

`docs/tasks/Phase4-rule-engine/Execution_Report.md`

Report at minimum:

1. handoff outcome token;
2. implementation start SHA;
3. Architecture Freeze checkpoint;
4. final executable/Tested SHA;
5. final report-only remote SHA;
6. exact HEAD/origin/main/ls-remote verification;
7. Harness pinned SHA and mutation=0;
8. changed executable/test/config manifest;
9. implemented closed adapter set;
10. one-shot vs persistent shell support;
11. shell scanner grammar/ambiguity boundary;
12. exact `phase4-v1` rule-code matrix implemented;
13. RuleEvaluation DTO/status semantics;
14. workspaceContained/sandboxCovered/reversible unknown policy;
15. no Phase-8 evidence collection proof;
16. Phase-3 failure-context integration proof;
17. privacy/secret-retention proof;
18. focused Phase-4 test count/result;
19. affected inherited suite counts/results;
20. observed local rule-engine performance smoke;
21. typecheck/build/export/declaration/pack/diff/scope/privacy gates;
22. fresh final complete regression exact file/test count;
23. F-006/F-013 and inherited NOT_RUN/NOT_VALIDATED states unchanged;
24. provider/network/browser/destructive side-effect counts;
25. Phase-5+ non-implementation proof.

After Full, the report commit must be docs-only. Explicitly prove the Tested SHA → final remote delta contains no executable/test/config/package semantic change.

Allowed handoff:

```text
PHASE4_PUBLISHED_READY_FOR_REVIEW
PHASE4_ARCHITECTURE_DECISION_REQUIRED
PHASE4_BLOCKED
```

Do not generate an Acceptance Report.

Do not declare `PHASE4_ACCEPTED`.