# Risk Advisor — Phase 4 Final Architecture Review Repair Instructions

**Review verdict:** `PHASE4_REPAIR_REQUIRED`  
**Date:** 2026-10-01  
**Reviewed executable/Tested SHA:** `dbf6f075b1509b8975a0b4096af4231e7ebf3591`  
**Reviewed report-only remote SHA:** `66a2d36e090e8b3f1c897e2c48abeecc213000cf`  
**Frozen authority:** `Phase4_Architecture_Freeze.md @ 55566056952454286c00133ab891f173e24137ab`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Review result

Phase 4 is close but not accepted yet.

Independent review confirmed the following are correct:

- Tested SHA → final remote is docs-only (`Execution_Report.md` only);
- no Full-after executable drift;
- one existing Phase-1 ExecutionId owner is reused;
- no Browser / ContextBuilder / Judge / Evidence Collector / Phase-5+ implementation;
- closed adapter set exists;
- both one-shot and persistent `bash`/`pwsh` shapes are accepted;
- RuleEvaluation keeps workspaceContained/sandboxCovered/reversible unknown;
- secret values are not intentionally retained in the public DTO;
- Phase-3 exact failure-context seam is reused;
- package root exposes safe Rule Engine types rather than RuleEngine/scanner/projector mutators;
- fresh full report is 20 files / 146 tests on the reviewed Tested SHA.

Four bounded correctness repairs remain. They are all inside the frozen Phase-4 Rule Engine contract.

Do not redesign Phase 4 and do not enter Phase 5.

## 2. F1 — shell fail-closed status/confidence is incomplete

### Root cause

Current `scanShell()` distinguishes `split.ambiguous` from deterministic rule codes.

Dynamic/encoded/environment-altering forms such as:

```text
bash -c ...
powershell -EncodedCommand ...
eval ...
PATH=... command
```

can produce `SHELL_DYNAMIC_EXECUTION`, `SHELL_ENCODED_EXECUTION`, or `SHELL_ENVIRONMENT_INJECTION` while `scan.ambiguous === false`.

`evaluateOperation()` currently sets:

```text
status = READY
parserConfidence = high
```

whenever `scan.ambiguous` is false.

That violates the frozen fail-closed boundary. A Rule Engine that deliberately refuses to parse nested/dynamic/encoded semantics cannot simultaneously report high-confidence complete understanding of that shell operation.

### Required repair

Introduce an explicit scanner confidence/degradation result rather than deriving confidence only from quote/split ambiguity.

At minimum:

- `SHELL_DYNAMIC_EXECUTION` → evaluation DEGRADED;
- `SHELL_ENCODED_EXECUTION` → DEGRADED;
- `SHELL_ENVIRONMENT_INJECTION` → DEGRADED unless the scanner can prove the assignment is semantically irrelevant (do not add such a proof in this repair);
- `SHELL_SEMANTICS_AMBIGUOUS` → DEGRADED;
- parserConfidence for those paths must be lower than high;
- independently proven destructive/system/permission/network/install findings remain present.

Do not erase deterministic facts simply because the overall shell evaluation is degraded.

### Unsupported shell grammar must fail closed

The current scanner also leaves several unsupported control constructs looking like ordinary READY commands.

Add a small explicit unsupported-control detector for at least:

```text
bash/POSIX: if/then/elif/else/fi, for/while/until, do/done, case/esac, function, { }, ( ), here-doc/process-substitution forms
PowerShell: if/elseif/else, foreach/for/while/do, switch, function, try/catch/finally, script blocks { }, here-strings
variable command invocation such as $cmd / ${cmd} when executable position is dynamic
source/dot-source or equivalent dynamic wrapper forms when the nested program is not analyzed
```

The objective is not full grammar support. The objective is:

```text
unsupported executable control semantics
→ DEGRADED + shell ambiguity/dynamic finding
```

rather than READY with an empty finding set.

Add comment handling/fail-closed behavior so text after an unquoted shell comment marker is never scanned as executable code. A case such as:

```text
echo safe # ; rm -rf build
```

must not produce a recursive-delete finding from the comment. It may be handled as a recognized comment or as degraded/ambiguous, but comment text must not become an executable segment.

## 3. F2 — deterministic findings must be based on semantic token roles, not arbitrary token presence

### Root cause

Current scanner has several role-insensitive checks.

Examples:

```ts
tokens.some(token => ['chmod', ...].includes(token))
tokens.some(token => isSystemLocation(token))
isSystemLocation(segment)
tokens.some(token => /^-verb:runas$/i.test(token))
tokens.some(token => hasCredentialResource(token))
```

This can mint deterministic facts from inert command arguments/data.

Concrete false-positive examples that the repaired focused suite must cover:

```text
echo chmod
echo /etc/passwd
echo "C:\Windows\System32"
echo -Verb:RunAs
echo /home/user/.ssh/id_rsa
web_search query containing '.ssh/id_rsa'
write content that merely mentions '/home/user/.ssh/id_rsa'
```

These inputs may contain sensitive words/paths as data, but they do not prove the corresponding mutation/resource-access fact.

### Required repair

Separate **secret-material scanning** from **target/action-role scanning**.

Secret-material detection is intentionally content-wide and may inspect bounded ephemeral strings because the fact is simply “secret-like material is present in operation input.”

Other deterministic findings require semantic roles:

#### Access-control mutation

Emit `PERMISSION_ACCESS_CONTROL_MUTATION` only when the executable/action itself is a recognized access-control mutation, or through one explicitly understood bounded privilege wrapper whose nested literal executable is recognized.

Do not emit because an arbitrary argument token equals `chmod`, `chown`, `set-acl`, etc.

#### Privilege elevation

For PowerShell `Start-Process`, require an actual understood `-Verb RunAs` pair / closed equivalent. Do not fire merely because `runas` or `-Verb:RunAs` appears as unrelated data.

#### System location mutation

Emit `SYSTEM_LOCATION_MUTATION` only when:

1. a known mutating operation/action is independently proven; and
2. a target-role lexical operand matches a frozen **absolute** system-location indicator.

Do not infer system mutation from:

- workdir alone;
- the raw whole shell segment;
- an arbitrary data token;
- read-only inspection such as `cat /etc/passwd`, `Get-Content C:\Windows\...`, or `echo /etc/...`.

Tighten `isSystemLocation` so relative workspace paths such as `Windows/foo` do not become Windows-system facts merely by spelling.

Filesystem `write`/`edit` may continue treating their validated `file_path` as the target role.

#### Credential resource

`CREDENTIAL_RESOURCE_ACCESS` requires a target/access role.

For `read`/`write`/`edit`, the validated `file_path` is a valid lexical target.

For shell, emit only for a frozen recognized file/resource-access command/target role if implemented. It is acceptable in this repair to omit shell credential-resource inference rather than guess.

For `web_search` queries and write/edit content, only secret-material scanning applies; merely mentioning a credential path is not credential-resource access.

## 4. F3 — shell external/network effect must fail closed and remote-write direction must be proven

### Root cause A: false certainty

Current shell EvaluationParts default to:

```text
externalEffect = false
networkEffect = none
```

before only known external writes override them.

Arbitrary shell commands can perform external I/O outside the closed ruleset, so absence of a recognized external-write rule does not prove no external effect.

### Required repair A

For shell operations default to:

```text
externalEffect = unknown
networkEffect = unknown
```

Only narrow these fields when the frozen scanner proves the effect.

Recognized `NETWORK_EXTERNAL_WRITE` → `externalEffect=true`, `networkEffect=write`.

Known web adapters remain `true/read`.

Filesystem read/write/edit remain `false/none` for this Phase-4 contract.

Do not add a broad shell-network classifier just to replace unknown.

### Root cause B: unconditional scp/sftp/rsync external-write

Current code marks:

```text
scp
sftp
rsync
```

as `NETWORK_EXTERNAL_WRITE` solely from executable name.

That is not direction-safe:

- scp/rsync can download remote → local;
- rsync can be local-only;
- sftp may be interactive/read/download/upload and the command name alone does not prove a write.

This violates the frozen requirement that external-write findings require a concrete mutating signal.

### Required repair B

Remove unconditional executable-name classification.

Choose one of these bounded safe implementations:

1. implement a small direction-aware parser that proves an explicit local→remote destination before emitting `NETWORK_EXTERNAL_WRITE`; or
2. do not classify these commands as external write in `phase4-v1` unless direction is proven; mark ambiguous/unknown where semantics cannot be established.

Do not guess from the presence of `@`, `:` or a hostname substring without a closed operand rule.

Add negative tests for remote→local and local-only forms alongside any positive upload test.

Keep existing high-confidence normal/forced `git push`, frozen package publish, and understood HTTP mutation rules.

## 5. F4 — generic environment preambles must not hide the executable

### Root cause

`commandToken()` currently consumes only these leading assignments:

```text
PATH
LD_PRELOAD
NODE_OPTIONS
```

A command such as:

```text
FOO=bar rm -rf build
```

is currently tokenized with `FOO=bar` as the executable, so the recursive delete can be missed and the operation can remain READY.

The Freeze explicitly prohibited silently discarding/ignoring generic `KEY=value command` semantics.

### Required repair

For a bounded leading POSIX-style `NAME=value` preamble:

- continue identifying the following literal executable so independently provable findings are preserved;
- sensitive names (`PATH`, `LD_PRELOAD`, `NODE_OPTIONS`) emit `SHELL_ENVIRONMENT_INJECTION`;
- other generic environment assignments must at least degrade/mark ambiguous because their semantic impact is not evaluated in Phase 4;
- never allow the assignment token to hide a following destructive/permission/network/install action.

Apply the same fail-closed principle to recognized PowerShell environment assignments where applicable.

Required focused case:

```text
FOO=bar rm -rf build
→ destructive finding retained
→ evaluation not high-confidence READY
```

## 6. Dialect-aware closed tokens

The Rule Engine already knows whether the tool name is `bash` or `pwsh`; use that information for dialect-specific rules rather than treating every executable token as universally meaningful.

At minimum:

- Bash/POSIX recursive delete: `rm` family;
- PowerShell recursive delete: `Remove-Item` / frozen PowerShell aliases;
- POSIX disk-destructive: frozen `mkfs*` class;
- PowerShell/Windows disk-destructive: `Format-Volume`, `Clear-Disk`, `diskpart` / exact frozen forms;
- PowerShell-specific `Start-Process -Verb RunAs`, registry cmdlets and service cmdlets only on the pwsh dialect unless the executable is an ordinary external binary that is unambiguously cross-shell.

This repair should reduce false deterministic facts. Do not expand the ruleset with speculative aliases.

## 7. Status/confidence and finding coexistence

After the repair, preserve this invariant:

```text
overall parser/evidence degraded
does NOT erase
independently proven deterministic findings
```

Examples:

- generic env prefix + literal `rm -rf` → DEGRADED plus recursive-delete finding;
- encoded PowerShell → DEGRADED plus dynamic + encoded findings;
- understood first segment + unsupported control segment → DEGRADED, preserving findings from understood segments;
- quoted/comment data never mints a destructive fact.

Do not turn DEGRADED into UNSUPPORTED unless the adapter input itself cannot be safely bounded/read.

## 8. Mandatory repair tests

Add focused tests covering at least:

1. dynamic interpreter finding also degrades status/confidence.
2. encoded execution degrades status/confidence.
3. sensitive environment injection degrades status/confidence.
4. generic `FOO=bar command` degrades but still analyzes the following literal command.
5. `FOO=bar rm -rf build` retains recursive-delete.
6. unsupported bash control flow (`if/then/...`) is not READY-high-confidence.
7. unsupported PowerShell control/script-block form is not READY-high-confidence.
8. variable/dynamic command invocation is fail-closed.
9. comment text `# ; rm -rf` is not executed by the scanner.
10. `echo chmod` does not emit access-control mutation.
11. `echo -Verb:RunAs` does not emit privilege elevation.
12. `echo /etc/passwd` does not emit system-location mutation.
13. read-only inspection of a system path does not emit system-change.
14. relative `Windows/foo` target does not become an absolute Windows system-location finding.
15. actual mutating absolute system target still emits SYSTEM_LOCATION_MUTATION.
16. write/edit content mentioning `.ssh/id_rsa` does not emit credential-resource access unless the actual target is the credential resource.
17. web_search query mentioning credential path does not emit credential-resource access.
18. actual filesystem target `.ssh/id_rsa` still emits credential-resource access.
19. generic shell starts with `externalEffect=unknown`, `networkEffect=unknown` unless proven.
20. recognized git push remains true/write.
21. scp remote→local is not external write.
22. rsync local-only is not external write.
23. sftp executable name alone is not external write.
24. positive explicit upload direction, if implemented, is true/write.
25. independently proven finding survives a degraded scanner result.

Use parameterized cases where practical.

## 9. Preserve accepted Phase-4 behavior

Do not change unless required by F1–F4:

- exact existing ExecutionId ownership;
- one existing capture hook;
- all 7 closed tool adapters;
- persistent and one-shot shell shape support;
- bounded argument reader;
- no raw-operation store;
- `phase4-v1` finding code/category/severity/hardness matrix;
- all findings `hard=true`; hard is fact persistence, not Harness denial;
- secret values never retained;
- workspaceContained=`unknown`;
- sandboxCovered=`unknown`;
- reversible=`unknown`;
- `REVERSIBILITY_EVIDENCE_UNAVAILABLE` rule;
- Phase-3 permission escalation integration;
- repeated-failure non-upgrader;
- max 512 / five-minute absolute TTL / no refresh;
- deeply frozen detached DTO;
- package-root projector/mutator closure;
- Native Approval noninterference;
- no Phase-8 evidence collection;
- no Phase-5+ implementation;
- F-006/F-013 unchanged.

## 10. Execution Report metadata repair

The reviewed Execution Report contains checkpoint labels shifted by one commit:

- it calls `4e87d526...` the Architecture Freeze checkpoint, but that commit is the **Preflight** publication;
- it calls `555660569...` the Implementation Instructions checkpoint, but that commit is the **Architecture Freeze**;
- the actual Implementation Instructions checkpoint/start is `daed3eca6bff9352c41d15ad296ff69732be23e6`.

When publishing the repair report, correct the chronology:

```text
Preflight             = 4e87d52663460d441955125974cc93422328c76c
Architecture Freeze   = 55566056952454286c00133ab891f173e24137ab
Implementation Instr. = daed3eca6bff9352c41d15ad296ff69732be23e6
original P4 Tested    = dbf6f075b1509b8975a0b4096af4231e7ebf3591
repair Tested         = <new executable SHA>
final report remote   = <new docs-only SHA>
```

Keep historical SHAs as chronology; top-level/current Tested SHA must be the new repair executable SHA.

## 11. Validation order

Follow the existing governance:

1. implement F1–F4 only;
2. run Phase-4 focused tests;
3. run directly affected Phase-3 / Phase-2 / R4 / Phase-1 correlation/foundation tests as needed;
4. typecheck;
5. build;
6. Host export smoke;
7. Client export regression smoke;
8. declaration/root-export audit;
9. pack dry-run;
10. `git diff --check`;
11. scope/privacy/secret-retention audit;
12. Harness mutation=0 verification;
13. commit final executable/test/config/package repair;
14. run exactly one fresh complete `pnpm test` on that exact executable SHA.

If Full fails, preserve the failed attempt, repair within scope, rerun affected pre-Full gates, create a new executable SHA, then run a new fresh complete Full.

After passing Full, no executable/test/config/package semantic drift. Only report documentation may change.

## 12. Side-effect and scope limits

Required:

```text
provider/model calls = 0
external product/network calls = 0
deployed Browser/profile runs = 0
real destructive filesystem/shell effects = 0
Harness Core mutations = 0
Native Approval changes = 0
Phase-5+ implementation = 0
```

Do not add runtime parser dependencies.

Do not introduce filesystem evidence, canonical path logic, git/checkpoint evidence, ContextBuilder, RiskFeatureSet, DimensionEvaluators, Aggregator, Judge, RiskAssessment or Browser risk UI.

## 13. STOP conditions

Stop with `PHASE4_ARCHITECTURE_DECISION_REQUIRED` if a repair would require:

- full shell grammar or external parser execution;
- broad substring matching to recover findings;
- retaining raw command/path/content/secret data;
- filesystem evidence collection;
- changing the `phase4-v1` public finding matrix;
- changing Native Approval;
- Harness Core modification;
- Phase-5+ functionality;
- weakening Phase-2/3 privacy/conflict semantics.

Prefer degraded/unknown over fabricated certainty.

## 14. Repair report and handoff

Update:

`docs/tasks/Phase4-rule-engine/Execution_Report.md`

with a distinct final-repair section including:

- repair start SHA;
- F1–F4 root causes and fixes;
- role-aware deterministic-finding proof;
- shell status/confidence fail-closed proof;
- generic env/control/comment proof;
- network direction/default-unknown proof;
- focused repair test count;
- affected inherited suites;
- static/export/declaration/pack/privacy gates;
- new executable/Tested SHA;
- one fresh complete regression exact count;
- corrected checkpoint chronology;
- F-006/F-013/open gates unchanged;
- Harness mutation 0;
- no Phase 5+ work;
- Tested SHA → final remote is report-only.

Allowed handoff:

`PHASE4_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE4_ACCEPTED`.