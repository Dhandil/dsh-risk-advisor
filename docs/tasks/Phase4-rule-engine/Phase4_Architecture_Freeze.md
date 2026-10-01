# Risk Advisor — Product Phase 4: Rule Engine | Architecture Freeze

**Status:** FROZEN FOR IMPLEMENTATION; final acceptance belongs to ChatGPT Web.  
**Date:** 2026-10-01  
**Task directory:** `docs/tasks/Phase4-rule-engine/`  
**Architecture checkpoint:** `4e87d52663460d441955125974cc93422328c76c` (Phase-4 preflight publication).  
**Accepted pre-Phase-4 product baseline:** `d7fe111d9dee35073a3e11d0ad456c1030593803`.  
**Last accepted executable SHA:** `620ed7b7293b9186aed1067bbe0d4187cc73a34b`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY.

## 1. Objective

Implement the frozen V1 roadmap's **Phase 4 — Rule Engine** as a deterministic Host-side fact layer.

Phase 4 owns:

```text
closed operation adapters
shell fail-closed analysis
destructive facts
system-change facts
permission facts
credential/secret facts
network/external-effect facts
install facts
workspace/path evidence gaps
reversibility concern facts
Phase-3 failure/escalation context
sanitized RuleFinding[]
```

Phase 4 does **not** own final Risk, Authorization, Necessity, Privilege, Alternatives, EvidenceQuality, Recommendation, RiskAssessment, Browser UI or Native Approval behavior.

## 2. Authority hierarchy

1. Product behavior: `docs/baseline/risk-advisor-v1-spec-v1.2-r1.md`.
2. Technical implementation Source of Truth: `docs/baseline/risk-advisor-v1-architecture-v1.2.md`.
3. Downstream consumer constraints: `docs/baseline/risk-engine-contract-v1.0-r1.md`.
4. This Phase-4 freeze specializes those documents for the roadmap's Rule Engine slice without advancing later phases.

The Risk Engine Contract does not authorize Phase 4 to implement Context Builder, RiskFeatureSet, DimensionEvaluators or Aggregator.

## 3. Non-negotiable ownership boundaries

- Phase 1 remains the sole `ExecutionId` mint owner.
- Phase 4 never mints, rewrites, recovers or guesses an ExecutionId.
- Phase 2 remains the structured explicit-failure/process evidence authority.
- Phase 3 remains the retry/root-cause/permission-escalation relation authority.
- Phase 4 does not create a second raw-operation snapshot store.
- Native Approval remains authoritative and unchanged.
- Phase 4 owns no Browser route, no model/provider call and no subagent.
- F-006/F-013 remain PARTIAL; Phase 4 may not repair them by heuristic correlation.

## 4. Exact-live integration point

Use the existing single pre-execute correlation path.

Frozen ordering inside the existing capture hook:

```text
ActiveExecutionIndex.observePreExecute
        ↓
OperationFoundation.capture
        ↓
RetryEscalationAnalyzer.observePreExecute
        ↓
RuleEngine.observePreExecute
```

`RuleEngine.observePreExecute` receives the exact current ToolExecution and the already-minted ExecutionId. It may query the Phase-3 read-only summary for that same ExecutionId after Phase-3 capture.

Do not add a second independent `tools/pre-execute` authority path whose correctness depends on listener ordering.

Phase 4 is observational. A Rule Engine fault must be caught locally and must still allow the native tool/approval flow to continue.

## 5. RuleInput capture and raw-data lifetime

Phase 4 may inspect exact live `ToolExecution.arguments` once at pre-execute because this is the only point where the frozen architecture permits operation normalization before raw input is discarded.

Required rules:

- closed adapters only;
- own data properties only;
- plain object/null-prototype inputs only;
- no getters/accessors;
- bounded strings/arrays/keys/bytes;
- unknown key/value shape fails closed;
- no arbitrary recursive traversal;
- no file/network/process/model access;
- secret matching occurs only in this ephemeral window;
- after evaluation, raw command/path/content/query/url/justification must not be retained.

Recommended hard safety budget:

```text
max argument bytes: 16 KiB
max keys: 64
max string length: 8192
max array items: 32
max nesting for controlled adapters: 3
```

An otherwise valid Harness call that exceeds a Risk Advisor safety budget becomes `UNSUPPORTED`/`DEGRADED`; Phase 4 must not widen its parser budget dynamically.

## 6. Closed Phase-4 adapter set

Freeze the first adapter set to:

```text
read
write
edit
bash
pwsh
web_fetch
web_search
```

Any other tool is unsupported by Phase 4 and must produce an `unknown-tool` finding rather than a low-risk inference.

### 6.1 read

Recognized fields:

```text
file_path
offset?
limit?
```

Mirror the pinned value-level facts Phase 3 already proved where publicly knowable:

- non-blank file path;
- supplied offset/limit positive integers;
- Phase-4 local upper safety bound may be stricter than deployment config but must fail closed rather than normalize a rejected value into a valid one.

Facts:

- kind = filesystem-read;
- mutating = false;
- externalEffect = false;
- scan requested path only for lexical credential-resource indicators;
- do not read file content.

### 6.2 write

Recognized fields:

```text
file_path
content
sandbox_permissions?
justification?
```

Require the pinned escalation pairing semantics:

- neither permission nor justification: valid;
- both present: permission in `workspace-write | danger-full-access` and justification trims non-empty;
- exactly one present: unsupported.

Facts:

- kind = filesystem-write;
- mutating = true;
- externalEffect = false;
- requestedPermission may retain only the closed enum value;
- scan path/content ephemerally for rule indicators;
- never retain content or justification.

### 6.3 edit

Recognized fields:

```text
file_path
old_string
new_string
replace_all?
sandbox_permissions?
justification?
```

Mirror pinned public value constraints:

- non-blank `file_path`;
- non-empty `old_string`;
- `old_string !== new_string`;
- supplied `replace_all` is boolean;
- same escalation pairing contract as write.

Facts:

- kind = filesystem-edit;
- mutating = true;
- scan path and old/new strings ephemerally;
- never retain old/new content or justification.

### 6.4 bash / pwsh — two pinned variants

The pinned Harness ships two model-facing compositions under the same names.

**Persistent variant**:

```text
{ command }
```

with a non-blank command only.

**One-shot variant**:

```text
command
description
timeoutMs?
workdir?
run_in_background?
sandbox_permissions?
justification?
```

with the value constraints accepted in Phase 3 repair:

- non-blank command;
- required non-blank description;
- supplied timeout positive and bounded;
- supplied workdir bounded string;
- supplied background boolean;
- escalation fields paired and validated.

Phase 4 must accept both variants. A `{command}` call must not be rejected simply because Phase 3 intentionally fingerprinted only the one-shot shape.

Facts:

- kind = shell;
- command is analyzed ephemerally then discarded;
- one-shot requested permission may retain only the closed enum;
- persistent variant has no invented requested permission;
- workdir may be used only ephemerally as lexical input; it is never a canonical target.

### 6.5 web_fetch

Closed field:

```text
url
```

Require a bounded non-empty string and a parseable HTTP(S) URL for a high-confidence adapter; otherwise degrade/unsupported.

Facts:

- kind = network-read;
- mutating = false;
- externalEffect = true;
- networkEffect = read;
- URL is scanned ephemerally for credential-bearing indicators;
- URL is not retained in the public RuleEvaluation.

### 6.6 web_search

Closed field:

```text
queries
```

Require a non-empty bounded array of non-empty bounded strings. The Phase-4 local item cap is a safety cap, not a claim about deployment `searchMaxQueries`.

Facts:

- kind = network-read;
- mutating = false;
- externalEffect = true;
- networkEffect = read;
- queries are scanned ephemerally for credential indicators and then discarded.

## 7. Sanitized Phase-4 public contract

Freeze a read-only Context seam, recommended:

```text
riskAdvisorRules.get(executionId)
```

Recommended DTO semantics:

```ts
type RuleEvaluationStatus =
  | 'READY'
  | 'DEGRADED'
  | 'UNSUPPORTED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'CAPACITY_EXCEEDED'

type RuleParserConfidence = 'high' | 'medium' | 'low'

type RuleOperationKind =
  | 'filesystem-read'
  | 'filesystem-write'
  | 'filesystem-edit'
  | 'shell'
  | 'network-read'
  | 'unknown'

interface RuleFinding {
  readonly id: string
  readonly severity: 'info' | 'medium' | 'high' | 'critical'
  readonly category:
    | 'destructive'
    | 'system-change'
    | 'credential'
    | 'network'
    | 'install'
    | 'permission'
    | 'workspace-boundary'
    | 'path-alias'
    | 'shell-ambiguity'
    | 'unknown-tool'
    | 'reversibility'
  readonly summary: string
  readonly hard: boolean
}

interface RuleEvaluation {
  readonly schemaVersion: 1
  readonly rulesetVersion: 'phase4-v1'
  readonly executionId: string
  readonly status: RuleEvaluationStatus
  readonly operationKind: RuleOperationKind
  readonly parserConfidence: RuleParserConfidence
  readonly mutating: boolean | 'unknown'
  readonly externalEffect: boolean | 'unknown'
  readonly networkEffect: 'none' | 'read' | 'write' | 'unknown'
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access'
  readonly workspaceContained: 'unknown'
  readonly sandboxCovered: 'unknown'
  readonly reversible: 'unknown'
  readonly failureContext: {
    readonly isRetry: boolean
    readonly retryCount: number
    readonly recentFailureCount: number
    readonly sameRootCause: boolean | 'unknown'
    readonly permissionEscalation: boolean | 'unknown'
    readonly degraded: boolean
  }
  readonly findings: readonly RuleFinding[]
  readonly reasonCodes: readonly string[]
}
```

Exact property names may vary only if semantics stay identical and the Execution Report records the mapping.

Important Phase-4 decision:

```text
workspaceContained = unknown
sandboxCovered = unknown
reversible = unknown
```

for this phase's public DTO.

Those are deliberate evidence gaps, not placeholders to be guessed from lexical text.

DTOs must be detached and deeply frozen.

## 8. RuleFinding identity and hard semantics

Phase-4 deterministic findings are facts. Every finding produced by the `phase4-v1` ruleset uses:

```text
hard = true
```

`hard=true` means a later model cannot erase the deterministic fact. It does **not** mean Harness must reject the operation.

One code appears at most once per RuleEvaluation. If multiple segments prove the same code, deduplicate it. Do not put segment text or counts into the summary.

`id` should equal the stable rule code for V1.

Summaries are static strings mapped by code. They must not interpolate command/path/secret/tool output.

## 9. Frozen `phase4-v1` rule matrix

| Code | Category | Severity | Meaning |
| --- | --- | --- | --- |
| `UNKNOWN_TOOL` | unknown-tool | medium | tool is outside the closed Phase-4 adapter set |
| `SHELL_SEMANTICS_AMBIGUOUS` | shell-ambiguity | medium | bounded parser cannot fully understand executable semantics |
| `SHELL_DYNAMIC_EXECUTION` | shell-ambiguity | high | dynamic interpreter/eval/wrapper semantics are present |
| `SHELL_ENCODED_EXECUTION` | shell-ambiguity | high | encoded/obfuscated execution form is present |
| `SHELL_ENVIRONMENT_INJECTION` | shell-ambiguity | high | execution semantics are modified through sensitive environment injection |
| `DESTRUCTIVE_RECURSIVE_DELETE` | destructive | high | recognized recursive deletion form |
| `DESTRUCTIVE_DISK_WIPE` | destructive | critical | recognized format/wipe/disk-destructive form |
| `DESTRUCTIVE_GIT_RESET_HARD` | destructive | high | recognized `git reset --hard` |
| `DESTRUCTIVE_GIT_CLEAN` | destructive | high | recognized destructive `git clean` form |
| `DESTRUCTIVE_FORCE_PUSH` | destructive | high | recognized forced remote Git update |
| `SYSTEM_LOCATION_MUTATION` | system-change | high | mutation targets a well-known system-location lexical pattern |
| `SYSTEM_REGISTRY_MUTATION` | system-change | high | recognized registry mutation form |
| `SYSTEM_SERVICE_MUTATION` | system-change | high | recognized system-service mutation form |
| `PERMISSION_DANGER_FULL_ACCESS` | permission | high | exact requested permission is `danger-full-access` |
| `PERMISSION_PRIVILEGE_ELEVATION` | permission | high | recognized sudo/admin/elevation form |
| `PERMISSION_ACCESS_CONTROL_MUTATION` | permission | high | recognized ACL/ownership/permission mutation |
| `PERMISSION_ESCALATION_RETRY` | permission | high | accepted Phase-3 summary proves permissionEscalation=true |
| `CREDENTIAL_SECRET_MATERIAL_PRESENT` | credential | high | bounded local detector proves secret-like material is present in operation input |
| `CREDENTIAL_RESOURCE_ACCESS` | credential | high | requested lexical target matches a closed credential-resource indicator |
| `NETWORK_EXTERNAL_READ` | network | info | known web adapter performs external retrieval |
| `NETWORK_EXTERNAL_WRITE` | network | high | recognized shell form writes/publishes/uploads to a remote target |
| `INSTALL_PACKAGE_MUTATION` | install | medium | recognized package installation mutation |
| `INSTALL_GLOBAL_SCOPE` | install | high | recognized global/system-wide package installation form |
| `REVERSIBILITY_EVIDENCE_UNAVAILABLE` | reversibility | medium | a destructive/system/remote-write fact exists but recovery evidence is not available in Phase 4 |

No Phase-4 V1 rule emits a positive `workspace-boundary` or `path-alias` finding because canonical evidence is not owned by this phase.

`workspace-boundary` and `path-alias` stay in the architecture union for later evidence-backed use.

## 10. Shell fail-closed scanner

Implement a bounded local lexical scanner, not a general shell parser.

### 10.1 Scanner invariants

- never invoke a shell to parse a shell;
- never import an external parser dependency merely for Phase 4;
- never execute substitutions;
- never normalize unknown syntax into a safe form;
- balanced simple quoting may be recognized;
- unbalanced/unsupported escaping or syntax degrades;
- token/segment buffers are ephemeral;
- no command text is stored in RuleEvaluation.

### 10.2 Top-level separators

Recognize outside inert quoting:

```text
;
&&
||
|
&
newline
```

When the scanner can safely segment, analyze **every** segment.

`git status && rm -rf build` must produce the recursive-delete finding.

Simple chaining itself is not a finding if all segments are understood.

### 10.3 Quoting

Text in inert quotes is data, not executable syntax.

Do not fire destructive rules merely because quoted data contains strings such as `rm -rf`.

If a quoting mode permits expansion/substitution in the selected dialect and the scanner encounters unsupported executable substitution, emit ambiguity rather than treating the content as inert.

### 10.4 Mandatory ambiguity/dynamic forms

At minimum detect/fail closed around:

```text
$()
backticks
unsupported nested substitution
unsupported/unbalanced quoting or escaping
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
dynamic command invocation
```

Dynamic execution produces `SHELL_DYNAMIC_EXECUTION`; encoded command forms additionally produce `SHELL_ENCODED_EXECUTION`.

Unsupported substitution/quoting that is not otherwise classified produces `SHELL_SEMANTICS_AMBIGUOUS`.

### 10.5 Environment injection

At minimum detect semantic environment preambles/assignments for:

```text
PATH
LD_PRELOAD
NODE_OPTIONS
```

when they affect command execution.

Emit `SHELL_ENVIRONMENT_INJECTION`. Do not silently discard a generic `KEY=value command` preamble when doing so would change command semantics; unsupported forms degrade.

### 10.6 Redirection and unsupported shell surface

Phase 4 does not need to prove arbitrary redirection target semantics.

If a redirection form changes state and the scanner cannot safely classify its target/effect within the frozen grammar, treat the shell semantics as ambiguous rather than ignoring the operator.

## 11. High-confidence destructive rules

Freeze token-aware recognition for the following representative forms.

### Bash/common

- `rm` with recursive flags (`-r`, `-R`, combined forms containing r/R, `--recursive`) → recursive delete.
- obvious filesystem format/wipe commands such as `mkfs*` or an explicitly recognized disk-wipe form → disk wipe.
- `git reset --hard` → hard reset.
- `git clean` with force/destructive options → destructive clean.
- `git push` with `--force`, `-f` or `--force-with-lease` → force push + external write.

### PowerShell/common Windows

- `Remove-Item`/recognized alias with `-Recurse` → recursive delete.
- `Format-Volume`, `Clear-Disk` and equivalent closed first-ruleset disk-destructive tokens → disk wipe.
- Git rules above apply equally when invoked from pwsh.

Do not generalize beyond the closed tokens. Unknown aliases/wrappers stay ambiguous/unknown.

## 12. System-change rules

Phase 4 may use lexical requested-target indicators but must describe them honestly.

For mutating filesystem adapters or safely understood mutating shell forms, a well-known absolute system-location pattern may produce `SYSTEM_LOCATION_MUTATION`.

Initial lexical indicator families may include:

- Windows root `Windows`, `Program Files`, `Program Files (x86)`, `ProgramData` locations;
- POSIX `/etc`, `/usr`, `/bin`, `/sbin`, `/System`, `/Library` families.

This is a fact about the requested lexical location, not canonical containment. Do not set `workspaceContained=false` from it.

Recognized registry mutation forms may produce `SYSTEM_REGISTRY_MUTATION`.

Recognized service create/config/update/delete forms may produce `SYSTEM_SERVICE_MUTATION`.

Read-only inspection of those locations/services does not become a system-change finding merely because the target is system-related.

## 13. Permission rules

### Explicit sandbox request

`sandbox_permissions === 'danger-full-access'` → `PERMISSION_DANGER_FULL_ACCESS`.

`workspace-write` by itself is not a Phase-4 finding; it remains a safe enum fact in RuleEvaluation.

### Shell elevation

Recognized explicit elevation forms (e.g. sudo/admin/RunAs class) → `PERMISSION_PRIVILEGE_ELEVATION`.

Recognized chmod/chown/ACL/ownership mutation forms → `PERMISSION_ACCESS_CONTROL_MUTATION`.

Do not decide whether requested privilege is minimal/proportionate/excessive in Phase 4.

### Phase-3 escalation

If the accepted exact-live Phase-3 summary proves:

```text
permissionEscalation = true
```

emit `PERMISSION_ESCALATION_RETRY`.

`false` produces no finding. `unknown` remains unknown and must not be coerced.

## 14. Credential / secret rules

Credential analysis is local and ephemeral.

### Secret-material detector vocabulary

At minimum include bounded local patterns corresponding to the architecture's later Redactor vocabulary:

- `sk-...`-style API-key material;
- `github_pat_...`;
- `ghp_...`;
- `Authorization: Bearer ...`;
- private-key block markers;
- `password=...`, `token=...`, `api_key=...`-style assignments;
- credential-bearing URL userinfo/query indicators.

A hit emits only `CREDENTIAL_SECRET_MATERIAL_PRESENT`.

Do not store the match, capture group, surrounding text or a hash of the secret.

### Credential-resource indicators

Use a small closed lexical target list for well-known credential resources, such as SSH private-key names, AWS credentials, `.npmrc`/`.pypirc` and equivalent explicitly frozen entries.

A lexical hit emits `CREDENTIAL_RESOURCE_ACCESS`.

Do not open/read the target to confirm its contents in Phase 4.

## 15. Network and install rules

### Known web tools

`web_fetch` and `web_search` emit `NETWORK_EXTERNAL_READ` only.

They do not emit external-write merely because a network provider is used.

### External writes

Closed shell recognition may emit `NETWORK_EXTERNAL_WRITE` for high-confidence operations such as:

- normal `git push`;
- package publish (`npm`/`pnpm` closed forms);
- explicit upload or non-read HTTP mutation forms understood by the frozen scanner.

Force push emits both `NETWORK_EXTERNAL_WRITE` and `DESTRUCTIVE_FORCE_PUSH`.

### Package installation

Closed `npm`/`pnpm` install/add/ci-style mutation forms emit `INSTALL_PACKAGE_MUTATION`.

Recognized explicit global scope emits `INSTALL_GLOBAL_SCOPE` in addition.

Do not claim package lifecycle-script execution occurred; Phase 4 only records the install mutation/risk surface.

Other package managers are not automatically equivalent in `phase4-v1`; unsupported manager-specific semantics remain shell-understood-but-unclassified or ambiguous as appropriate.

## 16. Workspace-boundary and path-alias freeze

Phase 4 owns **no filesystem evidence collection**.

Therefore:

```text
workspaceContained = unknown
sandboxCovered = unknown
```

for every Phase-4 RuleEvaluation.

Do not:

- call `realpath`, stat or directory listing;
- resolve symlink/junction state;
- infer canonical containment from lexical `..` elimination alone;
- emit a positive path-alias finding;
- claim outside-workspace solely from lexical path comparison.

Lexical system/credential indicators remain separate facts and must not be mislabeled canonical evidence.

Phase 8 owns canonical path/symlink/junction/workspace evidence.

## 17. Sandbox-policy decision

Phase 4 does **not** add `@deepseek-ai/dsh-sandbox-policy` as a required/optional product dependency and does not add a new inject dependency.

Reason:

- current Phase-4 rules already receive explicit requested-permission facts where the tool exposes them;
- policy presence still would not prove per-operation sandbox coverage;
- introducing the service is not necessary to satisfy the frozen Phase-4 core.

Thus current standing sandbox mode is not a Phase-4 public fact.

Future Context/Evidence work may consume the pinned public service separately if its scope requires it.

## 18. Reversibility freeze

Phase 4 does not have git-tracked/checkpoint/backup/canonical-target evidence.

Frozen Phase-4 public value:

```text
reversible = unknown
```

for all operations.

This deliberately chooses **unknown**, not false, even for destructive/system/remote operations. Phase 4 can prove the hazardous operation class, but it cannot prove that no recovery path exists.

When any finding in these classes exists:

```text
destructive
system-change
NETWORK_EXTERNAL_WRITE
```

emit `REVERSIBILITY_EVIDENCE_UNAVAILABLE` once.

Do not emit it for ordinary read-only web/filesystem operations or every ordinary write/edit.

Phase 8 may later replace unknown with evidence-backed yes/no facts.

## 19. Failure-context freeze

At capture, query the accepted Phase-3 `FailureChainSummary` for the same exact execution.

Project only safe bounded values:

- `retryOf` presence → `isRetry=true`;
- retryCount;
- recentFailureCount;
- sameRootCause;
- permissionEscalation;
- summary degraded/non-ready state → `failureContext.degraded=true`.

Do not copy recent error codes/failure kinds into RuleFinding summaries in Phase 4 unless a future frozen rule explicitly needs them.

Repeated failure alone emits **no** destructive/risk finding.

Only proven `permissionEscalation=true` emits a Phase-4 finding.

Do not parse approval reason, error text, stdout/stderr or durable call proximity.

## 20. RuleEvaluation status semantics

### READY

Known adapter, bounded valid arguments, and no material unsupported executable syntax.

Findings may still be high/critical. READY means parser/evidence path is coherent, not safe.

### DEGRADED

Known adapter with useful proven facts but material shell ambiguity or degraded Phase-3 relation context.

Keep independently proven findings. Do not erase a destructive fact merely because another segment is ambiguous.

### UNSUPPORTED

Unknown tool, malformed/unsupported argument shape, accessor/hostile value, or Phase-4 safety-budget overflow that prevents reliable normalization.

Unknown tool still carries the `UNKNOWN_TOOL` finding.

### NOT_FOUND / EXPIRED / CAPACITY_EXCEEDED

Query/lifecycle states only. Never map them to a low-risk empty finding set.

## 21. Storage, TTL and lifecycle

Use one Rule Engine instance per Host generation.

Required bounds:

- max 512 retained evaluations;
- absolute TTL 5 minutes from pre-execute capture;
- query does not refresh TTL;
- do not retain raw operation data after evaluation;
- prefer evicting expired entries;
- if all retained entries are live/within contract and capacity is exhausted, fail the advisory capture with `CAPACITY_EXCEEDED` rather than evicting an arbitrary current record;
- dispose/HMR clears state and late callbacks are inert.

Use an injectable monotonic clock for deterministic tests.

## 22. Privacy boundary

RuleEvaluation may expose only:

- executionId;
- fixed enums/booleans/counts;
- closed requestedPermission enum;
- sanitized status/reason codes;
- static RuleFinding ids/category/severity/summary/hard;
- bounded Phase-3 numeric/tri-state context.

Never expose or persist through Phase 4:

- operationFingerprint or operationHash;
- raw args;
- command;
- file path / URL / query;
- write/edit content;
- justification or approval reason;
- secret value or secret hash;
- stdout/stderr/tool result;
- Session/event/ToolExecution/Agent;
- raw exception text.

Privacy tests must search both DTO serialization and retained instance state reachable through supported diagnostics.

## 23. Public/package export boundary

Package root may export only Phase-4 DTO/service **types** required by later consumers.

Do not export:

- scanner/tokenizer;
- secret matcher;
- adapter functions;
- ruleset evaluator;
- RuleEngine mutators;
- raw RuleInput;
- caller-constructible authority/projector functions.

The runtime-owned Context read-only query is the supported product seam.

## 24. Performance

Architecture target:

```text
Rule Engine < 20 ms
```

Focused validation must include a local bounded worst-case smoke for the pure rule path.

Do not make acceptance depend on an unstable single microbenchmark threshold across all machines. Report observed distribution/max for a fixed bounded fixture and fail only on gross architectural regressions (I/O, async provider/process work, unbounded growth) unless a stable repository benchmark harness can enforce `<20 ms` reliably.

Provider/model/network/destructive side effects remain zero.

## 25. Mandatory focused tests

At minimum cover:

1. read valid/invalid bounded adapter.
2. write valid/invalid + escalation pairing.
3. edit pinned value constraints + escalation pairing.
4. one-shot bash valid adapter.
5. persistent `{command}` bash valid adapter.
6. one-shot pwsh valid adapter.
7. persistent `{command}` pwsh valid adapter.
8. web_fetch valid HTTP(S) network-read adapter.
9. web_search bounded queries network-read adapter.
10. unknown tool → UNSUPPORTED + UNKNOWN_TOOL.
11. accessor/non-plain/oversized/unknown-key input fail-closed.
12. simple shell command parses without ambiguity.
13. each frozen top-level separator is recognized.
14. benign first segment + destructive later segment preserves destructive finding.
15. inert quoted `rm -rf` text does not trigger destructive finding.
16. substitution/backtick/unsupported quote produces ambiguity.
17. dynamic interpreter forms produce dynamic-execution finding.
18. encoded PowerShell form produces encoded-execution finding.
19. PATH/LD_PRELOAD/NODE_OPTIONS injection finding.
20. recursive delete forms in bash/pwsh.
21. disk wipe/format closed forms.
22. git reset --hard.
23. destructive git clean.
24. normal git push external-write without force-destructive.
25. force push emits external-write + destructive.
26. danger-full-access requested permission.
27. sudo/admin elevation.
28. ACL/ownership mutation.
29. system-location mutation lexical indicator without workspaceContained claim.
30. registry mutation.
31. service mutation.
32. package install.
33. global package install.
34. package publish external write.
35. web_search/web_fetch never become external write by tool name alone.
36. secret patterns produce credential finding with zero value leakage.
37. credential-resource lexical indicator.
38. no canonical evidence → workspaceContained unknown.
39. no path-alias positive finding.
40. sandboxCovered remains unknown.
41. reversible always unknown in Phase 4.
42. destructive/system/remote-write → one reversibility-evidence-unavailable finding.
43. Phase-3 proven permission escalation → permission finding.
44. permission escalation false/unknown produces no escalation finding.
45. repeated failure alone produces no destructive/high-risk finding.
46. degraded Phase-3 context degrades RuleEvaluation without fabricating certainty.
47. same exact existing ExecutionId is reused.
48. TTL/capacity/query-no-refresh.
49. dispose/HMR old generation inert.
50. DTO deeply frozen/detached.
51. public DTO/retained-state privacy scan.
52. actual pinned Context + ToolRuntime local deterministic integration.
53. Native Approval remains unchanged/non-blocked.
54. inherited Phase-1/2/3/R4 suites remain green.

Tests may be parameterized. Do not inflate counts for their own sake.

## 26. Explicitly out of scope

Do NOT implement:

- full RiskContextSnapshot / Context Builder;
- full RiskFeatureSet;
- six DimensionEvaluators;
- AssessmentAggregator / P0–P9;
- final RiskAssessment or recommendation;
- user-message authorization analysis;
- minimum-required permission / excessive privilege conclusion;
- safer-alternative generation;
- SecretRedactor reviewer payload;
- Fast Judge / `ctx.llm`;
- Browser Phase-4 risk UI;
- filesystem Evidence Collector;
- canonical path/stat/symlink/junction/git/checkpoint reads;
- ExpectedEffect / semantic verification;
- Deep Judge;
- generic multi-step behavior-chain analysis;
- durable guessed relation recovery;
- Native Approval change;
- Harness Core modification.

## 27. STOP conditions

Stop with `PHASE4_ARCHITECTURE_DECISION_REQUIRED` if implementation would require:

- a second ExecutionId owner;
- a second raw-operation store;
- filesystem/network/process/LLM work to make a Phase-4 rule conclusive;
- canonical workspace/path-alias claims without evidence;
- positive reversibility without evidence;
- treating sandbox-policy presence as operation coverage;
- broad substring matching that cannot distinguish inert quoted data;
- retaining or echoing a secret;
- parsing approval reason/error/stdout/stderr for risk facts;
- guessing relation history by callId/time/tool;
- implementing ContextBuilder/DimensionEvaluator/Aggregator/Judge to complete the rule layer;
- changing Native Approval;
- modifying Harness Core;
- weakening accepted Phase-2/3 conflict/privacy boundaries.

Unknown/degraded is the required fallback.

## 28. Inherited OPEN / NOT_RUN gates

Phase 4 completion does not promote:

- F-006 exact live↔durable positive confirmation: PARTIAL;
- F-013 exact replay/live cross-plane witness: PARTIAL;
- general guard-returned-denial attribution: PARTIAL/UNKNOWN without complete proof;
- true disk/process restart: NOT_RUN;
- real native PTC producer: NOT_RUN;
- deployed Live Browser/profile: NOT_RUN;
- WebWorker: NOT_VALIDATED;
- newer Harness/V4: NOT_VALIDATED;
- T05 production Assessment latency budgets: UNDETERMINED;
- semanticSuccess verification: not implemented;
- canonical path/git/checkpoint Evidence Collector: not implemented.

## 29. Acceptance semantics

Codex may report an implementation handoff only, such as:

- `PHASE4_PUBLISHED_READY_FOR_REVIEW`;
- `PHASE4_ARCHITECTURE_DECISION_REQUIRED`;
- `PHASE4_BLOCKED`.

Codex must not self-declare Phase 4 accepted.

ChatGPT Web independently reviews the remote executable diff, rule semantics, shell fail-closed behavior, privacy, Phase-3 integration, frozen evidence gaps, fresh complete regression and report-only publication relationship before any `PHASE4_ACCEPTED` decision.