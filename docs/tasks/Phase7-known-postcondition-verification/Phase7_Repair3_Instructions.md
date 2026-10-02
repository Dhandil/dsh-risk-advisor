# Phase 7 Final Review — Repair 3 Instructions

## Outcome

Independent final review of:

- Repair 2 Tested SHA: `7766d1f8dae770f01357d5e3279638f80919b80f`
- Repair 2 report-only remote SHA: `aeb9eb9be58aba4ed8f3bb4d739f1e2f762d6124`

concludes:

`PHASE7_REPAIR_REQUIRED`

Repair 2 materially closes the previously identified shell-fidelity and proof-quality blockers. In particular, the real local benchmark, product COPY_CHECKER execution matrix, policy replacement-under-load proof, per-Session 129→128 proof, and direct Phase-7 non-interference proof are accepted.

One narrow F3 correctness blocker remains.

Do not redesign Phase 7 and do not start Phase 8.

---

## 1. R3-F3 — Git branch validator still accepts ASCII DEL

### Current defect

`isValidBranchName()` currently rejects:

```ts
/[s\u0000-\u001f~^:?*[\\]/
```

but does not reject ASCII DEL:

```text
U+007F / 0x7F
```

Git ref rules reject ASCII control bytes below 0x20 **and** DEL 0x7F.

Therefore a value such as:

```text
foo\x7fbar
```

can pass the local Phase-7 branch predicate even though it is not a valid Git branch name.

That violates the Repair-2 frozen requirement:

```text
Use a conservative local branch grammar that is a strict subset of valid Git branch names.
It must never classify a known-invalid branch string as valid.
```

The same predicate is used for expected-branch capture and observed verifier stdout, so both sides must be repaired.

### Required repair

Narrow the existing shared local predicate only.

At minimum, reject U+007F / ASCII DEL in `isValidBranchName()`.

Do not replace the local closed grammar with a subprocess or network lookup.

Do not broaden accepted branch syntax.

Do not add another parser.

Preserve all already-repaired rules:

- no leading `-`;
- no leading/trailing slash;
- no consecutive slash;
- no component beginning with `.`;
- no component ending in `.lock`;
- no `..`;
- no `@{`;
- no trailing dot;
- no whitespace/control characters;
- no `~ ^ : ? * [ \\`;
- exact frozen checkout/switch grammar;
- exact Git stdout handling with at most one terminal LF/CRLF;
- polluted/multiline output -> UNKNOWN.

---

## 2. Mandatory focused proof

Add direct P7 tests proving:

1. expected branch containing U+007F is not captured as `git.branch-switch.v1`;
2. exit-0 Git verifier stdout containing U+007F produces `UNKNOWN`, never `MATCHED` or `MISMATCHED`;
3. normal valid branch capture/output remains unchanged;
4. the existing invalid-branch matrix remains green;
5. all four frozen Git forms remain green;
6. P4 parser/rule equivalence remains green.

Use a literal/escaped JavaScript test value such as:

```ts
const delBranch = `foo\u007fbar`
```

Do not depend on terminal rendering of the DEL character.

---

## 3. Preserve Repair 2 acceptance evidence

Do not rewrite or weaken the accepted Repair-2 implementation/evidence for:

- shell operand expansion fail-closed behavior;
- PowerShell quote/backslash handling;
- ExpectedEffect TTL/session/per-session/global lifecycle;
- scheduler timeout ownership/quiescence;
- shell/sandboxPolicy generation fencing;
- COPY_CHECKER classification;
- immutable captured retry relation;
- direct approval/A3/Browser/session-reader/Phase-8 non-interference;
- real local benchmark;
- provider/network/registry/Git-remote zero-call boundary;
- Harness Core read-only boundary.

No Phase 8/9 work.

---

## 4. Revalidation

Because this changes executable acceptance logic:

1. implement only the DEL rejection and its focused tests;
2. run expanded `test:p7`;
3. run `test:p4`;
4. run affected/inherited regression gates required by Phase-7 governance;
5. typecheck;
6. build;
7. export/declaration/package/static/privacy/no-network/no-custom-session-event gates;
8. Harness mutation=0 verification;
9. rerun the Phase-7 real local benchmark smoke/full;
10. commit executable/test changes;
11. record the exact new executable SHA;
12. run exactly one fresh complete `pnpm test` at that exact SHA.

If the Full fails, preserve failure evidence, repair only within this narrow Phase-7 scope, create a new executable SHA, and run a new fresh Full.

After a passing Full, no executable/test/config/package/benchmark semantic drift.

---

## 5. Report-only publication

After the passing fresh Full, update only:

`docs/tasks/Phase7-known-postcondition-verification/Execution_Report.md`

Add a distinct `Final Repair 3` section recording:

- Repair-3 start SHA;
- new executable/Tested SHA;
- U+007F capture rejection proof;
- U+007F verifier-output UNKNOWN proof;
- focused/inherited/static/benchmark results;
- fresh complete Full file/test count;
- Tested -> remote docs-only proof;
- Harness mutations = 0;
- provider/network/registry/external Git remote calls = 0;
- custom Session events = 0;
- Phase 8 not started.

Then push and verify:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

---

## 6. Allowed handoff

Return only:

`PHASE7_REPAIR3_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE7_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 8.
