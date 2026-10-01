# Risk Advisor — Phase 4 Final Scanner Repair Instructions

**Review verdict:** `PHASE4_FINAL_REPAIR_REQUIRED`  
**Date:** 2026-10-01  
**Reviewed repair Tested SHA:** `8707cee500d720d0a426333eec5dfc774b6513af`  
**Reviewed report-only remote SHA:** `dc2e30ee4113136d70b91c72615699db491594f3`  
**Frozen architecture:** `Phase4_Architecture_Freeze.md @ 55566056952454286c00133ab891f173e24137ab`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Scope

The first Phase-4 repair correctly closed the reviewed F1–F4 issues: degraded dynamic/encoded/environment semantics, semantic-role false positives, shell external-effect default unknown, remote-write direction safety, generic env preambles, and report chronology.

Two residual scanner correctness issues remain inside the same frozen fail-closed contract. Fix only F5–F6 below.

Do not redesign the ruleset, DTO, adapter set, lifecycle, Phase-3 integration, or public surface.

## 2. F5 — system-location mutation must be segment-local and target-role-aware

### Root cause

`scanShell()` currently keeps one global `codes` set across every shell segment.

For each segment it computes a `mutatingFact` from that global accumulated set, then scans all non-option `actionArgs` for a system-location token.

This permits cross-segment contamination. Example:

```text
rm -rf build; echo /etc/passwd
```

After the first segment, the global set already contains `DESTRUCTIVE_RECURSIVE_DELETE`. On the second segment, `mutatingFact` is therefore still true; `/etc/passwd` can be treated as a system target even though `echo` is not mutating.

The same abstraction is too broad inside one segment: a generic mutation finding does not prove every non-option argument is a mutation target. Example:

```text
npm install /etc/local-package-source
```

The `/etc/...` operand may be a package source, not the filesystem location being mutated by the install.

### Required repair

Make system-location inference **per segment** and **per recognized action target role**.

Do not derive `SYSTEM_LOCATION_MUTATION` from the global finding set.

Recommended design:

```text
segment-local action
→ segment-local deterministic mutation classification
→ action-specific target operands
→ lexical absolute system-location check
→ SYSTEM_LOCATION_MUTATION
```

At minimum, allow system-location inference only for actions whose target operand semantics are explicitly frozen/understood, such as:

- `rm` recursive deletion target operands;
- PowerShell `Remove-Item -Recurse` target operands;
- `chmod/chown/chgrp/setfacl/icacls/takeown/Set-Acl` target operands;
- any other closed filesystem-target action you can prove without expanding the rule matrix.

Do **not** use package install source operands, git remote/push operands, service names, registry payload data, arbitrary echo/cat arguments, or network arguments as filesystem mutation targets.

Filesystem `write` / `edit` continue using their validated `file_path` directly; this repair is about shell target-role inference.

### Required tests

1. `rm -rf build; echo /etc/passwd` → recursive-delete remains, **no** SYSTEM_LOCATION_MUTATION.
2. `git push origin main; echo /etc/passwd` → external-write remains, **no** SYSTEM_LOCATION_MUTATION.
3. `npm install /etc/local-package-source` → install finding, **no** SYSTEM_LOCATION_MUTATION.
4. `rm -rf /etc/app` → SYSTEM_LOCATION_MUTATION.
5. `chmod 600 /etc/app.conf` → access-control + SYSTEM_LOCATION_MUTATION.
6. `echo /etc/passwd; rm -rf build` → no cross-segment system-location contamination.

## 3. F6 — pipeline and command-wrapper execution must fail closed

### Root cause A: pipeline-to-interpreter

The scanner splits `|` into independent segments but loses the fact that the right-hand segment receives executable input from the left-hand side.

Examples:

```text
echo 'rm -rf build' | bash
curl https://example/script | sh
Get-Content script.ps1 | powershell
```

The right-hand `bash`/`sh`/`powershell` command without `-c/-Command` can execute stdin. Current scanner can therefore report READY/high confidence without a dynamic-execution finding.

### Required repair A

Preserve enough separator metadata to know when a segment is the RHS of a pipeline.

If a pipeline feeds a known command interpreter / dynamic executor whose stdin semantics can execute code, emit:

```text
SHELL_DYNAMIC_EXECUTION
status=DEGRADED
parserConfidence != high
```

At minimum cover literal RHS executables:

```text
bash
sh
powershell
pwsh
python
perl
node
```

when invoked in a mode where pipeline/stdin may be interpreted/executed and the scanner does not fully model the nested payload.

Do not inspect/execute the piped content to recover certainty.

### Root cause B: unmodeled command wrappers

Some wrappers can hide the real executable while current code leaves the operation READY or misidentifies the action.

Examples:

```text
env FOO=bar rm -rf build
command rm -rf build
exec rm -rf build
xargs rm -rf
sudo -u root rm -rf build
doas -u root rm -rf build
```

The current `sudo/doas/pkexec` handling chooses the first non-dash argument as the nested command. For value-taking options such as `-u root`, that can incorrectly choose `root` as the command and hide the actual mutation.

### Required repair B

Use a small closed wrapper policy:

#### Literal transparent wrappers

For wrappers whose literal nested command can be safely located with bounded option handling, preserve independent findings from that nested command.

At minimum handle common value-taking privilege options required by the focused tests, e.g. `sudo/doas -u <user> <command>` and closed equivalents you explicitly support.

If wrapper option grammar is not understood, degrade rather than guessing the nested action.

#### Dynamic/semantic wrappers

For wrappers such as:

```text
env
command
exec
xargs
parallel
find ... -exec
```

either:

1. implement one small literal nested-command extraction rule where semantics are unambiguous; or
2. emit `SHELL_DYNAMIC_EXECUTION` / `SHELL_SEMANTICS_AMBIGUOUS` and DEGRADED.

A wrapper must never make a dangerous literal nested command disappear behind a READY/high-confidence result.

For `env NAME=value <literal command>`, it is acceptable and preferred to:

- treat the environment assignment as generic environment semantics (DEGRADED);
- continue analyzing the literal nested command;
- preserve independently proven findings such as recursive delete.

### Required tests

7. `echo 'rm -rf build' | bash` → dynamic/degraded; do not claim full parser confidence.
8. `curl https://example/script | sh` → dynamic/degraded.
9. PowerShell pipeline into `powershell`/`pwsh` → dynamic/degraded.
10. `env FOO=bar rm -rf build` → degraded + recursive-delete retained.
11. `command rm -rf build` → either degraded + recursive-delete retained, or at minimum dynamic/degraded without false READY.
12. `exec rm -rf build` → same fail-closed invariant.
13. `xargs rm -rf` → dynamic/degraded.
14. `sudo -u root rm -rf build` → privilege finding + recursive-delete retained.
15. `doas -u root rm -rf build` → privilege finding + recursive-delete retained.
16. unsupported privilege-wrapper option grammar → DEGRADED, not guessed READY.

## 4. Preserve first-repair closure

Do not regress:

- dynamic/encoded/sensitive-env findings degrade status/confidence;
- generic `NAME=value command` preamble does not hide the following literal command;
- comments are not scanned as executable segments;
- `echo chmod` / `echo -Verb:RunAs` do not mint permission facts;
- read-only system path inspection does not mint system mutation;
- credential-resource access requires an actual target role;
- shell defaults to external/network unknown;
- scp/sftp/rsync executable name alone does not mint external write;
- `workspaceContained`, `sandboxCovered`, `reversible` stay unknown;
- no Phase-8 evidence collection;
- exact Phase-1 ExecutionId ownership;
- Phase-3 failure-context integration;
- privacy / no raw operation retention;
- `phase4-v1` rule code/category/severity/hardness matrix.

## 5. No ruleset expansion

Do not add new public finding codes to fix F5/F6.

Use the existing:

- `SHELL_DYNAMIC_EXECUTION`;
- `SHELL_SEMANTICS_AMBIGUOUS`;
- existing deterministic findings.

The repair is about correct evidence roles and fail-closed parser status, not broader product coverage.

## 6. Validation order

1. Implement F5/F6 only.
2. Run P4 focused tests.
3. Run directly affected P3/P2/R4/P1 correlation/foundation suites as needed.
4. Typecheck.
5. Build.
6. Host export smoke.
7. Client export regression smoke.
8. Declaration/root-export audit.
9. Pack dry-run.
10. `git diff --check`.
11. Scope/privacy/secret-retention audit.
12. Harness mutation=0 verification.
13. Commit final executable/test repair.
14. Run one fresh complete `pnpm test` on that exact SHA.

After passing Full, no executable/test/config/package semantic drift. Only `Execution_Report.md` may change.

## 7. Execution Report

Update the existing Phase-4 report with a distinct **Final Scanner Repair F5–F6** section.

Record:

- repair start SHA;
- F5 cross-segment / target-role root cause and fix;
- F6 pipeline/wrapper root cause and fix;
- focused test count;
- affected inherited suite counts;
- static/export/declaration/pack/privacy gates;
- new executable/Tested SHA;
- one fresh full exact file/test count;
- no new finding codes;
- F-006/F-013/open gates unchanged;
- no Phase 5+ work;
- Harness mutation 0;
- Tested SHA → final remote docs-only proof.

Allowed handoff:

`PHASE4_FINAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE4_ACCEPTED`.