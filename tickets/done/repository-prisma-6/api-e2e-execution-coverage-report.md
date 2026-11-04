# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (code `7047cdf`, handoff/evidence `72ef918`), direct route
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-11 was added during execution. `release.yml` is unchanged, but its `npm ci` now reads the new `allowScripts`, a derived consumer the plan missed.
  - The skill was updated mid-run: the project had no testing guideline, so `TESTING.md` and an `AGENTS.md` line were created (see Project Documents).
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/evidence/` (`API-*.log`; scripts in `API-scripts/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | worktree at `7047cdf` (HEAD `72ef918`); base `5a73159` via `git archive` + `npm ci` in `/tmp/rp6-e2e/base` | macOS 26.5.2 arm64 | Node v22.23.1; npm 10.9.8, and npm 12.2.1 from a temp prefix first on `PATH` | uid 501 |
| ENV-2 | `git archive HEAD` | Docker `node:24-bookworm` `--platform linux/amd64` (emulated x86_64) | Node v24.22.2, npm 11.19.1 (the GitHub runner's exact versions, API-05); npm 11.21.1 after the release step's upgrade (API-11) | `CI=true`; `--user node` (uid 1000) or root |
| ENV-3 | published `repository_prisma@2.0.0` + README at `7047cdf` | macOS (pnpm 11.28.9 temp prefix); Docker x86_64 (npm 12.2.1, user `node`) | Node 22.23.1 / Node 24.22.2 | ticket probes (schema, config, app); pnpm: test-only `minimumReleaseAgeExclude` |
| ENV-4 | GitHub (read only) | CI run 41872190680 on `main@5a73159` | `ubuntu-latest` x64 | toolchain reference |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..AC-004, AC-006 | IR checks | Reused: IMP-01, IMP-02, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10, IMP-11 | (implementation handoff) | Pass | (implementation handoff Checks Run) | (implementation handoff) | IMP-08/09 ran on `b87252c` and IMP-10/11 on `7047cdf`; `b87252c..72ef918` outside `tickets/` changes only README/CHANGELOG. IMP-06 (b, c) ran on `8ef7b77`; `b87252c` changed only the pack-JSON parsing (API-03). Key reused facts: npm 12.2.1 macOS/Linux green with 0 warnings (IMP-08, IMP-09 C); strict npm 11.19.1 passes, and a stale pin gives `ESTRICTALLOWSCRIPTS` (IMP-09 A/B); README consumers on npm 12, pnpm 12, pnpm 10 (IMP-10). |
| API-02 | AC-001 | output equivalence at HEAD (after the npm 12 parsing fix) | `npm run test:package` in the base tree and the worktree, npm 10.9.8; HEAD again with npm 12.2.1; normalize (`normalize.sh`) and compare (`compare.sh`: tsup build lines as a sorted set, everything after exactly); base with npm 12.2.1 | ENV-1 | Pass | `evidence/API-02-output-equivalence.log` | npm 10 base vs HEAD: `build section (sorted) diff:` `identical`, `smoke section (exact) diff:` `identical (5 lines)`. npm 12 HEAD vs npm 10 HEAD: smoke `identical`; build-section differences are only npm 12's `npm notice run ...` banners. Final JSON `"readonlyWal":"pass"` in all. Base on npm 12: `SyntaxError: Unexpected end of JSON input`, `exit=1` | Confirms the recorded deviation was required for AC-003 and changes no output. |
| API-03 | AC-001 (REQ-001 move-only) | source | `python3 move-check.py 5a73159 8ef7b77`; `git diff 8ef7b77 b87252c -- scripts/`; `git diff b87252c HEAD -- scripts/`; `wc -l` | ENV-1 | Pass | `evidence/API-03-move-only-check.log` | `old-only lines ...: 1` (`const repoRoot = path.resolve(__dirname, '..');`); 91 glue lines, all requires/exports/destructuring/step calls/doc comments; `template-literal lines (exact, with indentation): old 303, missing in split 0`; later script change = the pack-JSON parse only; largest file `222 scripts/package-smoke/logging-policy.js` | Independent of the IR's check. |
| API-04 | AC-002 | the 4 steps the IR did not mutate | `mutate.py M1..M4` on the built `dist`, then `node scripts/run-package-smoke.js`; `npm run build` restores; control run | ENV-1 | Pass | `evidence/API-04-step-mutations.log` | M1 (CJS entry loads `.env`): `actual: 'repository-prisma-import-canary'` `at checkImportSafety (...import-safety.js:70:27)`. M2 (default log levels include `query`): `at checkLoggingPolicy (...logging-policy.js:180:7)`. M3 (ESM entry skips WAL): `SQLite WAL mode could not be verified.` `at checkEsmRuntime (...esm-runtime.js:40:21)`. M4 (declarations reject `enableWAL: true`): `error TS2322` `at checkConsumerTypes (...consumer-types.js:67:3)`. Each `smoke-exit=1`; control `"result":"pass"`, `control smoke-exit=0`; `git status` clean | With IMP-06 (b) `checkCjsRuntime` and (c) `checkPackedArtifact`, every check step has a demonstrated failure. |
| API-05 | AC-005 (assumption), AC-004 | GitHub runner toolchain | `gh run view 41872190680 --log` | ENV-4 | Pass | `evidence/API-05-github-runner-toolchain.log` | `Found in cache @ /opt/hostedtoolcache/node/24.22.2/x64`, `node: v24.22.2`, `npm: 11.19.1` | npm 11.19.1 ≥ 11.16 supports `--strict-allow-scripts`; the same version passes it in API-06. |
| API-06 | AC-004, AC-005 (pre-merge), AC-001 (root, Linux) | CI job at HEAD, non-root x86_64; root `test:package` | `ci-node24.sh ci` as `--user node`: `npm ci --strict-allow-scripts`, typecheck, test, build, `test:package`; `ci-node24.sh root` as root | ENV-2 | Pass | `evidence/API-06-ci-x86_64-nonroot-and-root.log` | non-root: `user=uid=1000(node)`, `exit=0 (npm ci --strict-allow-scripts)`, `install-script warning lines: 0`, `native module: node_modules/better-sqlite3/build/Release/better_sqlite3.node`, `Tests  113 passed (113)`, `exit=0 (npm run build)`, `"readonlyWal":"pass"`, `ALL-STEPS-FAILED=0`; root: `skip: read-only WAL case (...)`, `"readonlyWal":"skipped-root"`, `ALL-STEPS-FAILED=0` | IMP-09 A ran the strict install as root; CI runs non-root. |
| API-07 | AC-006 | pnpm 11.28.9 consumer, README only, published 2.0.0 | `consumer-pnpm.sh`: A without the release-age exclusion; B README steps with the test-only exclusion; C without `pnpm approve-builds` | ENV-3 (macOS) | Pass | `evidence/API-07-pnpm11-consumer.log` | B: `+ repository_prisma 2.0.0`, `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: better-sqlite3@12.11.1` (`exit=1`, as the README warns), `better-sqlite3 install: Done`, `✔ Generated Prisma Client (v7.10.1)`, `count 0`, `RESULT ok`. C: `native module: ... No such file or directory`, `diagnostic CONNECTION_FAILED Could not locate the bindings file`. A: `+ repository_prisma 1.0.10` (release age; FU-003) | README names pnpm 11+; IR covered pnpm 10 and 12 only. |
| API-08 | AC-006 | npm 12.2.1 consumer on Linux x64, README only, published 2.0.0 | `consumer-npm12.sh 1` and `0` in x86_64 container as `node` | ENV-3 (Linux) | Pass | `evidence/API-08-npm12-consumer-linux-x64.log` | approve=1: `Approved better-sqlite3:` `added better-sqlite3@12.11.1`, `rebuilt dependencies successfully`, native module present, `package.json allowScripts: {"better-sqlite3@12.11.1":true}`, `RESULT ok`; approve=0: `diagnostic CONNECTION_FAILED Could not locate the bindings file`, `RESULT failed CONNECTION_FAILED` | |
| API-09 | AC-007 | docs review | README setup + Testing; CHANGELOG `## Unreleased`; `version`; tags | ENV-1 | Pass | (this report, Docs review below) | `version` `2.0.0`; `git tag --contains 7047cdf` -> `0` | |
| API-10 | AC-005 | GitHub CI on `main` after merge | — | — | Not Tested (post-merge; delivery) | — | Delivery: in the merge commit's CI run, step `Run npm ci --strict-allow-scripts` succeeds; job green | Branch not pushed; no PR. Toolchain identity (API-05) and emulation (API-06) cover everything provable before the merge. |
| API-11 | REQ-002 (derived consumer), AC-004 | `release.yml` steps with `allowScripts` | `release-steps.sh` in x86_64 container (root, global npm): `npm i -g npm@^11.5.1`, `npm ci`, build, container-only `npm version 2.0.1-e2e.0`, `npm publish --dry-run --tag e2e` | ENV-2 | Pass | `evidence/API-11-release-steps-allowscripts.log` | `11.19.1` -> `11.21.1`; `exit=0 (npm ci)`, `install-script warning lines: 0`, native module present; `exit=0 (npm run build)` (esbuild's denied postinstall is not needed); `Publishing to https://registry.npmjs.org/ with tag e2e and public access (dry-run)`, `exit=0`; `packed allowScripts: {"better-sqlite3@12.11.1":true,...}`; `ALL-STEPS-FAILED=0` | The packed manifest carries `allowScripts`, which npm ignores for dependencies (requirements "Consumer Reach"). API-08's consumer `allowScripts` contains only its own approval, consistent with that. |

### Docs review (API-09)

- README setup:
  - The wrong "pnpm installs the peers automatically" wording is replaced. npm 7+ is still said to install the peers. pnpm users get `pnpm add repository_prisma @prisma/client@7` plus `pnpm add -D prisma@7`.
  - The "Allow the native SQLite build" paragraph states the default (npm 12+, pnpm 10+) and the symptom (`CONNECTION_FAILED`, "Could not locate the bindings file"), and gives the fix per package manager.
  - Every fix was executed as written: npm 12 (API-08, IMP-10 A), pnpm 11 (API-07), pnpm 12 (IMP-10 D), pnpm 10 (IMP-10 E). The `ERR_PNPM_IGNORED_BUILDS` aside matches pnpm 11's behavior exactly (API-07 B). This matches REQ-004.
- README Testing: it gives the approval policy (only `better-sqlite3`, pinned; the four denials with reasons), strict CI, and the re-approve command after an upgrade. This matches REQ-005.
- CHANGELOG `## Unreleased` has three new bullets: the README guidance, the repository policy with strict CI, and the smoke split with npm 12 parsing. This matches REQ-005. `version` is still 2.0.0 (AC-007).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-03, API-06 (root + non-root Linux), API-01 (IMP-01..05) | Proven | — |
| AC-002 | Yes | API-04 (4 steps), API-01 (IMP-06 b, c) | Proven | — |
| AC-003 | Yes | API-01 (IMP-08 macOS, IMP-09 C Linux x64), API-02 (npm 12 `test:package` at HEAD) | Proven | — |
| AC-004 | Yes | API-06 (non-root strict, CI's toolchain), API-01 (IMP-09 A/B: strict pass, stale pin `ESTRICTALLOWSCRIPTS`), API-11, API-01 (IMP-11 npm 10) | Proven | — |
| AC-005 | Yes | Pre-merge: API-05 (runner toolchain = npm 11.19.1), API-06 (same toolchain, non-root, strict). Post-merge: API-10 | Proven up to the merge. The GitHub run on `main` is a post-merge check for delivery (not user-only). | — |
| AC-006 | Yes | API-07 (pnpm 11), API-08 (npm 12 Linux), API-01 (IMP-10: npm 12, pnpm 12, pnpm 10 macOS) | Proven | — |
| AC-007 | No | API-09 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 94% | API-01..09, API-11 | AC-005's GitHub run happens only after merge | Delivery's post-merge run |
| Changed-boundary execution directness | 92% | 96% | `test:package` runs through every step; real installs with each package manager | — | — |
| Cross-boundary integration realism and mock gap | 85% | 94% | Real registry and package managers (npm 10/11/12, pnpm 10/11/12); published 2.0.0; Linux x64 emulation | GitHub-hosted runner not executed; Windows not run | GitHub run |
| Environment, configuration, identity, and fixture fidelity | 85% | 96% | Runner toolchain measured (API-05) and reproduced non-root with `CI=true` (API-06) | Emulated x86_64 | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 97% | Mutations in all 6 check steps; stale pin; symptom controls for npm 12 and pnpm 11; root skip; npm 12 base failure reproduced | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI surface | — | — |
| Durable regression coverage quality and relevance | 92% | 95% | The smoke's assertions are proven live by mutation in every step; strict CI guards the approval | `harness`/`consumer-install` are setup, not checks (no mutation needed) | — |

- Overall post-repository confidence: 89%
- Overall final confidence: 95%
- Calculation method: simple average of the six applicable categories (94+96+94+96+97+95)/6 = 95.3%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` for everything provable before the merge. AC-005's trigger (push to `main`) occurs at delivery's merge and is handed over as a post-merge check.
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - the GitHub CI run with the strict install (post-merge, delivery);
  - pnpm 11+/12 minimum release age after each release (FU-003);
  - no Windows consumer.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `CLI` + `Lifecycle`: containerized CI and release steps on x86_64, plus fresh consumers with npm 12 and pnpm 11.
- Confidence gap or residual risk it addresses, and the expected gain:
  - the IR's strict install ran as root, not as CI's non-root user;
  - the IR's output diff predated the npm 12 parsing fix;
  - pnpm 11 was unverified;
  - the release workflow's interaction with `allowScripts` was unverified.
  All four are closed.
- Browser validation needed, and why or why not: No (no browser surface).
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The two `npm pack --json` shapes are both current supported toolchains (npm 10/11 and npm 12), not legacy retention.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (the smoke split is the implementation's change; it was validated here, not modified)
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Project Documents

- `TESTING.md` was missing and is created at `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/TESTING.md` from the team template. It records what this and the earlier validations established:
  - setup and the install-script policy;
  - the four layers and their commands;
  - what the package smoke cannot prove, and when a fresh consumer is needed;
  - Linux x64 non-root container parity;
  - package-manager behaviors (npm 12 blocked scripts and pack JSON; pnpm release age);
  - the root skip;
  - the move-only output comparison;
  - evidence and never-commit rules.
- `AGENTS.md` gains one line naming it.
- Open decisions for the user: none introduced. Test data is limited to SQLite files the tests create, which was the observed practice.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub-hosted runner | `node:24-bookworm` amd64 emulation with the runner's exact Node/npm versions, non-root, `CI=true` | Needs a push/merge (delivery) | Runner image not executed |
| npm publish | `--dry-run` with a container-only version | No release in this Task | OIDC/provenance not exercised |
| pnpm release age | test-only `minimumReleaseAgeExclude` for 2.0.0 | 2.0.0 is younger than pnpm's default age | None for the README steps; the timing pitfall is FU-003 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/rp6-e2e` (base tree, npm 12 and pnpm 11 prefixes, consumers, logs) | Yes | `rm -rf` after copying evidence | Done |
| Docker containers | Yes | `--rm` | Removed |
| `dist` mutations M1..M4 in the worktree | Yes | `npm run build` after each; control pass; `git status` clean (dist is gitignored) | Restored |
| `test.db` / `dist` in the worktree | gitignored outputs | not committed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None user-only. AC-005's GitHub run on `main` is a post-merge check for delivery (API-10).
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: delivery engineer (direct low-risk route)
- Notes:
  - FU-003 added (pnpm release-age pitfall).
  - `TESTING.md` created, and `AGENTS.md` updated, for delivery's docs sync.
  - The IR's note that the tsup `external` entry for the adapter is redundant was observed but not acted on (outside scope).
