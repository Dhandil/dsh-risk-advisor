# Phase 13.3 — Web Profile Client Artifact Reconciliation Report

Date: 2026-10-08

## Result

`RISK_ADVISOR_PHASE13_3_WEB_PROFILE_CLIENT_ARTIFACT_RECONCILED`

The existing Web profile now selects and installs a fresh archive built from the accepted Risk Advisor Product inputs. The installed Client bundle is byte-identical to the archive's `package/lib/client.js`. The package version remains `0.1.0-r1`; the new content-addressed archive path distinguishes it from the stale archive. This confirms package delivery only. It does not confirm live Harness Client activation or a first Online Correction RPC.

## Preflight provenance

- Product checkout and `origin/main`: `5619b318c21de59c26248c636dfa285ab16b28be`.
- Accepted Product executable baseline: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`.
- Product `src`, `tests`, package manifest, lockfile, TypeScript config, and tsdown config match the accepted baseline; the diff over these inputs is empty.
- Pinned Harness checkout: `/Users/tongxin/Developer/Harness/deepseek-harness`, SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked tree is unchanged.
- The unchanged offline audit report `985ee0a809ffe8122ea249cedf265ab40cb70eb7` is on the remote audit branch. The previously installed Client hash matches the audited stale archive.
- The process and listening-socket checks found no Harness Web Host before package replacement, including no listener on port 3080. No Web app, browser, Agent, provider, or Tool was started.

## Preserved rollback and prior selection

Active profile: `/Users/tongxin/.dsh/profiles/web` (`dsh-profile-web`). Before replacement, it selected bundles, in order: `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, and `@dhandil/dsh-risk-advisor`. Risk Advisor was the profile's only direct dependency.

- Prior package spec: `file:/Users/tongxin/.dsh/artifacts/risk-advisor/v1-ux-compact-risk-indicator/345a54882393da7f64584f21105fa7fc56793265/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`.
- Prior tarball SHA-256: `50dbbd883801369c9e515cbace43ce00a4d77cb412854f6492f79f31a6d77717`.
- Prior installed and archived `lib/client.js` SHA-256: `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93`.
- Prior profile fingerprints: `package.json` `e28c5776665c3675c7f237959226089cea414834c130e4141c28c077c2dae96a`; `pnpm-lock.yaml` `6729dbac3482ff8af94810058f6ca068c58192214f2470406fa834dc50b9fae4`.
- Prior `cordis.yml` SHA-256: `c300dcf2ebc5f02062d6591268d29d3db6fe45e0cb138f5467276fe2ba06076e`; prior `cordis.patch.yml` SHA-256: `ef189a8c27db6d63930aa3046a3040482e952eafcb7487c644d508e8d461f027`.
- The old tarball remains at its original path with the same digest and is the rollback package. It can be reselected through the same supported `dsh plugin --profile web add <tarball>` command if rollback is later required.

## Build and package evidence

Ran `pnpm run build` and `pnpm pack --pack-destination /Users/tongxin/.dsh/artifacts/risk-advisor/phase13-3-web-profile-reconcile-5619b318c21de59c26248c636dfa285ab16b28be` from the Product checkout. Build and pack completed successfully; no Product source or test edits were made.

- Fresh archive: `/Users/tongxin/.dsh/artifacts/risk-advisor/phase13-3-web-profile-reconcile-5619b318c21de59c26248c636dfa285ab16b28be/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`.
- Archive SHA-256: `4dd3c86d62ca106be670c7c6c73215d6c00b31cd1618473318ac293cd1f8cf35`.
- Built `lib/client.js` SHA-256: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- Archived `package/lib/client.js` SHA-256: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- The archive retains package `@dhandil/dsh-risk-advisor@0.1.0-r1`, `exports["./client"].default = ./lib/client.js`, and `dsh.client.platform = web`.
- The archive's Client bundle contains the `__ModuleLoader__.load` factory registration, module identity `@dhandil/dsh-risk-advisor`, `OnlineCorrectionClient`, `risk-advisor-online-correction`, and `conversation.input.dock` registration.
- The archived bundle patch retains the `risk-advisor` row identity and package name.

## Profile replacement and verification

Used the pinned Harness management path:

`pnpm dsh plugin --profile web add /Users/tongxin/.dsh/artifacts/risk-advisor/phase13-3-web-profile-reconcile-5619b318c21de59c26248c636dfa285ab16b28be/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`

The command completed successfully. The Web profile still selects the same three bundles in the same order and still has only `@dhandil/dsh-risk-advisor` as a direct dependency. Its package spec and lockfile resolution now point to the new archive. The resulting profile fingerprints are `package.json` `02da15ae9d6704c00557e28d9151608bb1e692a12b434f76737890dd9cc45aff` and `pnpm-lock.yaml` `bbea57f1b9bd6bc7a2dd6964243ee9dad5030c4ebe475c478095348a434d0420`.

The profile's `cordis.yml` and `cordis.patch.yml` hashes remain `c300dcf2ebc5f02062d6591268d29d3db6fe45e0cb138f5467276fe2ba06076e` and `ef189a8c27db6d63930aa3046a3040482e952eafcb7487c644d508e8d461f027`, respectively. The installed package metadata retains the expected name, version, `./client` export, Web platform, and Client inject dependencies. Installed `lib/client.js` SHA-256 is `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`; byte comparison with the archive's `package/lib/client.js` succeeded.

No tests, browser, Web Host, Agent, provider, or Tool were run. User model configuration and credentials were not read or changed. Existing `.vitest-cache/` and `node_modules/` remain untouched; the authorized build left generated `lib/` output in the checkout. The only tracked change in this report commit is this document.

This is not Phase 13.3 acceptance and does not start Phase 13.4. A separate safe native Client activation and first-read verification remains necessary before live Agent evaluation.
