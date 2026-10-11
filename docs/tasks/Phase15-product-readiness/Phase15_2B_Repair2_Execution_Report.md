# Risk Advisor Phase 15.2B Repair2 — Artifact Provenance and Activation

**Result:** RISK_ADVISOR_PHASE15_2B_REPAIR2_ACTIVATION_READY_FOR_ARCHITECTURE_REVIEW
**Execution baseline:** 32f66994c3f989e189d529b7cdb1783d3728cc41
**Accepted product-source ancestor:** ab3e17c1834b9ae2082369e35178d7006efb9e35
**Pinned Harness:** ddefc45fbc7f8e46dd73185e68295696d1297887
**Target:** existing web Profile

This records a bounded activation-only execution for independent architecture review. It does not claim acceptance.

## P1 — existing-artifact provenance: PASS

No build was repeated in Repair2. The existing candidate outputs were produced by the direct TypeScript and tsdown invocation recorded in the Repair1 report. The Repair2 investigation tied those exact bytes to the currently accepted source lineage:

| Artifact | SHA-256 |
|---|---|
| Host bundle, lib/index.js | 9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd |
| Host source map | 076c6a3a194271626757f29731ed566aa3afc2f799f503a55b1e4063c27c4c1 |
| Client bundle, lib/client.js | 06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735 |
| Client source map | c6b18e1fc02beb693a89f80284e996f8f3329803ff558587ba86b752ecad4d2b |

The Host source map contains 54 module sources and the Client map 37. Every embedded source body exactly matched its corresponding current lib/types file. All 85 TypeScript emission maps resolve to tracked Risk Advisor src files; none is missing, untracked, or outside src. A read-only TypeScript input enumeration listed 728 files: 86 Risk Advisor source files, 335 pinned Harness files, 73 TypeScript library files, and 234 project dependency/type files, with no other input roots. The enumeration left lib/types unchanged.

The current tracked diff from the accepted product executable contains 20 files, all under docs/. Product source, package manifest, lockfile, tsconfig, and tsdown configuration remain unchanged. The repository is on main at the requested baseline; Harness remains at its pinned SHA with a clean tracked tree.

Observed tool/environment inputs were Node v24.21.0, TypeScript 6.0.3, tsdown 0.22.14, and pnpm 11.7.0. NODE_ENV and NODE_OPTIONS were unset; tsdown’s checked-in define therefore selects production. Direct package versions for TypeScript, tsdown, zod, React, React DOM, React types, and Harness UI primitives matched the tracked lock importer. The prior Repair1 audit recorded the compiler/bundler dependency closure against the project lock; Repair2 found no used version mismatch. The preserved zod link resolves to the lock’s zod 4.6.5 package.

The source maps use relative types/... source identifiers. The four CSS source files are embedded byte-for-byte in the Client bundle. Client externals are only react, react/jsx-runtime, and @deepseek-ai/dsh-client-ui-primitives, all declared in the checked-in module table. The bundle has the expected window.__ModuleLoader__.load registration envelope, the fixed package ID, the approval-detail slot, and the two input-dock entries. It contains no Node builtin imports, fetch/XHR/WebSocket/EventSource calls, or provider request code. The Host bundle passed Node module loading without calling apply; its apply export was a function.

The bounded offline Client module-loader smoke used Node v24.21.0, a three-second VM limit, the installed React and JSX runtime, an in-memory UI-primitives proxy, and a synthetic document. It invoked the bundle factory but did not invoke the product apply function:

~~~js
node <<'NODE'
const fs=require('fs'),vm=require('vm'),nodeRequire=require;
const code=fs.readFileSync('lib/client.js','utf8'),registrations=[],styles=[],imports=[];
const primitives=new Proxy({}, {get:(_o,k)=>typeof k==='symbol'?undefined:function Primitive(){}});
const permitted={react:nodeRequire('react'),'react/jsx-runtime':nodeRequire('react/jsx-runtime'),'@deepseek-ai/dsh-client-ui-primitives':primitives};
const document={querySelectorAll:()=>[],createElement:()=>({dataset:{},setAttribute(){},getAttribute(){return null},textContent:''}),head:{appendChild:x=>styles.push(x)}};
const window={__ModuleLoader__:{load:r=>{registrations.push(r);r.exports=r.factory(spec=>{imports.push(spec);if(!Object.hasOwn(permitted,spec))throw Error('undeclared external '+spec);return permitted[spec]})}}};
const forbidden=()=>{throw Error('unexpected network/timer operation in module-load smoke')};
vm.runInNewContext(code,{window,document,console:{log(){},warn(){},error(){}},fetch:forbidden,XMLHttpRequest:forbidden,WebSocket:forbidden,EventSource:forbidden,setTimeout:forbidden,setInterval:forbidden,clearTimeout(){},clearInterval(){}},{timeout:3000,filename:'lib/client.js'});
const r=registrations[0];
const out={registrationCount:registrations.length,moduleId:r?.id,factoryType:typeof r?.factory,applyExportType:typeof r?.exports?.apply,externalImports:[...new Set(imports)].sort(),allImportsAllowed:imports.every(x=>Object.hasOwn(permitted,x)),stylesAdded:styles.length,styleIds:styles.map(s=>s.dataset.pluginCss),productApplyInvoked:false,providerAgentToolCalls:0,networkOrTimerAttempted:false};
console.log(JSON.stringify(out));
if(registrations.length!==1||r?.id!=='@dhandil/dsh-risk-advisor'||typeof r?.exports?.apply!=='function'||styles.length!==4||!imports.every(x=>Object.hasOwn(permitted,x)))process.exitCode=1;
NODE
~~~

Result: one registration for @dhandil/dsh-risk-advisor, callable apply export, exactly four namespaced CSS insertions, only the three declared externals, and no network or timer attempt.

The Repair1 Client SHA differs from the historical Phase 14.6 smoke artifact SHA. The historical SHA remains attached to that prior build. Repair2 did not claim byte identity or invent an exact cause for the historical difference; the current candidate passed source-to-output provenance.

## P2 — package: PASS

The exact command pnpm pack exited 0. The package defines no prepack, prepare, postpack, or install lifecycle hook. pnpm requested no module removal, repair, or reinstall.

| Candidate artifact | Result |
|---|---|
| dhandil-dsh-risk-advisor-0.1.0-r1.tgz | SHA-256 cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5; 203,930 bytes |
| Tar members | 90 files; no source maps included |
| package/lib/index.js | Matches Host SHA above |
| package/lib/client.js | Matches Client SHA above |

The package name and version are @dhandil/dsh-risk-advisor 0.1.0-r1. The artifact remains in the repository root because the Profile now refers to that exact local tarball; it is untracked and was not added to Git.

## P3 — existing web Profile install and activation-only check: PASS

### Backup and target safety

The existing private backup at ~/.dsh/backups/risk-advisor/phase15-2b-web-20261011T052436Z/ retained manifest SHA-256 8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4. All 270 backup manifest entries were rechecked. Before installation, all 80 targeted Profile entries were compared with the saved copies; all 71 file/symlink entries matched. The backup-only node_modules/.pnpm directory is intentionally mode 0700 and is not a restore target; the Profile’s source directory stayed at its original mode and timestamp. The Profile package, lock, workspace, patch, bundle order, and installed Risk Advisor matched the saved baseline. The prior tarball remained intact at SHA-256 4dd3c86d62ca106be670c7c6c73215d6c00b31cd1618473318ac293cd1f8cf35.

The Profile and installed package resolved to their expected real paths, were owned by the current user, and were not symlinks. No Host was running and no process had the installed package open.

### Scoped install and write-set comparison

The pinned Harness built CLI’s supported plugin command was used with offline resolution and scripts disabled:

~~~text
npm_config_offline=true node apps/cli/lib/bin.js plugin --profile web add --offline --ignore-scripts <candidate-local-tarball>
~~~

pnpm v11.7.0 reported one package added, one reused, zero downloaded. The Profile bundle order stayed base, web-app, Risk Advisor. Its only dependency change was the Risk Advisor tarball path. The Profile workspace policy and Cordis patch stayed byte-identical. The lockfiles changed only the Risk Advisor local tarball reference and its integrity; the new integrity matches the candidate tarball SHA-512. The pnpm modules metadata changed only the Risk Advisor file-package key, and workspace state changed only its validation timestamp. No other package selection or dependency graph changed.

All 90 installed tar members matched the candidate tarball. Installed Host and Client SHA-256 values are respectively 9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd and 06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735.

### Runtime activation-only observation

The normal pinned Harness built-mode command was started once:

~~~text
node apps/cli/lib/bin.js --profile web --no-open
~~~

A task-created Playwright tab navigated to the local Harness URL in memory; the URL/token is intentionally omitted. The browser loaded the web application at local origin 127.0.0.1:3080. Runtime inspection returned the normal window.__ModuleLoader__.load function and four Risk Advisor style registrations:

- @dhandil/dsh-risk-advisor/RiskAdvisorCard.module.css
- @dhandil/dsh-risk-advisor/ApprovalHistoricalContext.module.css
- @dhandil/dsh-risk-advisor/OnlineCorrectionDock.module.css
- @dhandil/dsh-risk-advisor/RuntimeRiskAwarenessDock.module.css

The browser’s request metadata showed successful HTTP 200 POSTs to both /api/risk-advisor/online-correction and /api/risk-advisor/runtime-risk. Only URL paths, methods, and status metadata were inspected; request/response headers and bodies were not read. The exact installed Client source registers conversation.approval.detail and the conversation.input.dock entries risk-advisor-online-correction and risk-advisor-runtime-risk-awareness. The public observation did not expose a white-box SlotRegistry listing; live Client module loading plus successful calls from both dock clients are the runtime evidence for activation.

No Agent, Tool, Provider, Session task, native approval, synthetic Finding, or risk-detection exercise was started. No finding, accuracy, recall, or user-facing risk behavior is claimed.

### Cleanup

The task-created browser tab was closed, leaving the one pre-existing tab untouched. The task-owned Harness Host was stopped normally with Ctrl-C (exit 130); port 3080 has no listener and no process holds the installed package files. The backup and original tarball remain intact. Existing .vitest-cache/, lib/, and node_modules/ were preserved.

## Gate summary

| Gate | Result |
|---|---|
| P1 — source-bound provenance and offline module-loader check | PASS |
| P2 — pnpm pack and tar member identity | PASS |
| P3 — existing web Profile install and activation-only observation | PASS |
| Agent / Tool / Provider / native approval / Canonical Full | NOT RUN |

Only this execution report is intended as a tracked change. No product source, test, package manifest, lockfile, Harness source, or user configuration was changed in the Risk Advisor repository.
