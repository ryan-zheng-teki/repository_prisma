# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `.../repository-prisma-6/investigation-notes.md`
- Solution Revision Record: `.../repository-prisma-6/solution-revision-record.md`
- Design Spec (required on every route): `.../repository-prisma-6/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `probes/` (consumer schema/config/app, pnpm workspace files, `repo-allowScripts.json`), evidence only
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../repository-prisma-6/implementation-handoff.md` (IR-001, includes the lightweight self-review and the recorded design deviation)
- Implementation Revision Record: `.../repository-prisma-6/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (commits `8ef7b77`, `23b23f3`, `b87252c`, `7047cdf`; handoff `72ef918`), direct route Medium/Low
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Two items, no `src/` change:
1. `scripts/run-package-smoke.js` (739 lines) is split into a runner plus 8 step modules. It must run the same checks in the same order, with the same final JSON and markers, and every file must be under 500 lines.
2. The install-script policy:
   - `package.json` `allowScripts` approves only `better-sqlite3@12.11.1` and denies `esbuild`, `prisma`, `@prisma/engines` and `fsevents`;
   - CI runs `npm ci --strict-allow-scripts`;
   - the README tells npm 12 and pnpm consumers how to allow the native build, and pnpm users to add `@prisma/client` directly;
   - the maintainer policy and CHANGELOG are documented.

Recorded deviation: npm 12's `npm pack --json` object shape is now read by the packed-artifact step (`b87252c`). To prove: AC-001..AC-007.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (`test:package`), SCN-002 (`npm ci` on npm 10/11/12), SCN-003 (consumers on npm 12 / pnpm).
- Real-use scenarios added:
  - RUS-01: GitHub's CI job runs as the non-root `runner` user on x86_64. Its toolchain is Node v24.22.2 / npm 11.19.1, measured from the latest `main` run (API-05). CI runs `npm ci --strict-allow-scripts`, typecheck, test, build from a clean checkout. The IR's strict run was as root.
  - RUS-02: a maintainer runs `npm run test:package` at the branch HEAD. The IR's output diff (IMP-05) predates the npm 12 parsing fix, so it needs re-diffing at HEAD.
  - RUS-03: a pnpm 11 consumer (the README names "pnpm 11+"; IR ran pnpm 10 and 12 only), and an npm 12 consumer on Linux x64.
  - RUS-04: a maintainer upgrades `better-sqlite3` and forgets to re-approve. CI then fails loudly (IMP-09 B, reused).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 smoke structure | Changed (structure), Preserved (checks/output) | REQ-001 | Output diff at HEAD vs base; independent move check; mutations in the 4 steps the IR did not mutate |
| BEH-002 `allowScripts` | Added | REQ-002 | Reuse IMP-07/08/09/11; CI-identical non-root strict install at HEAD |
| BEH-003 strict CI install | Changed | REQ-003 | CI emulation non-root x86_64; GitHub run post-merge |
| BEH-004 README consumer guidance | Changed | REQ-004 | Reuse IMP-10; add pnpm 11 and Linux npm 12 consumers |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | 113 tests unchanged | — | — |
| API / transport / contract | Yes (docs contract) | README consumer setup | IMP-10 (npm 12, pnpm 12, pnpm 10 on macOS) | pnpm 11; Linux | CLI consumers |
| Frontend / browser / auth / desktop | No | — | — | — | — |
| Process / lifecycle | Yes | test harness structure; npm install policy; CI install | IMP-01..11 | non-root strict install at HEAD; output equivalence at HEAD; 4 steps unmutated | Docker x86_64 non-root; local diffs; mutations |
| Persisted-data transition | No | — | — | — | — |
| External integration | Yes | npm 11/12 and pnpm 10/11/12 install-script behavior; GitHub runner npm | IMP-08/09/10 | GitHub runner npm version (measured in API-05) | GitHub CI post-merge |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6`, branch `codex/repository-prisma-6-smoke-split-install-scripts` (not pushed)
- Project type and runtime stack: TypeScript library; Prisma 7.10.1; better-sqlite3 12.11.1; vitest; tsup; npm; GitHub Actions
- Project testing guideline path(s), or `None found` and the `TESTING.md` you create: None found (no `TESTING*.md`; `AGENTS.md` names none). Choices derived from `AGENTS.md`, `README.md` (§ Testing, § Requirements and Setup), `package.json`, `.github/workflows/ci.yml`. Created: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/TESTING.md` (from the team template, with what this and the earlier validations established), plus one line in `AGENTS.md` (skill update of 2026-11-04, `references/project-documents.md`).
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `.github/workflows/ci.yml` | CI | Node 24, `npm ci --strict-allow-scripts`, typecheck, test, build |
| `README.md` § Requirements and Setup | consumer journey source (AC-006) | npm: install, `install -D prisma@7`, `install-scripts approve better-sqlite3`, `rebuild better-sqlite3`, generate. pnpm: `pnpm add repository_prisma @prisma/client@7`, `pnpm add -D prisma@7`, pnpm 11+ `pnpm approve-builds better-sqlite3` / pnpm 10 `onlyBuiltDependencies` |
| `README.md` § Testing | maintainer policy (AC-007) | approve only better-sqlite3, deny the rest; strict CI; re-approve after upgrade |
| `package.json` | scripts, `allowScripts` | `test:package` = build + smoke + interop |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Base tree for the output diff | `/tmp/rp6-e2e/base` (`git archive 5a73159`) | `npm ci` (npm 10.9.8) | macOS | exit 0 | `rm -rf` |
| x86_64 Node 24 container | `$HOME/work` from `git archive HEAD` | `docker run --platform linux/amd64 node:24-bookworm` | emulated; `--user node` (CI) and root | exit codes | `--rm` |
| npm 12.2.1 / pnpm 11.28.9 | temp prefixes under `/tmp/rp6-e2e` | `npm install -g --prefix` | first on `PATH` for their cases only | `--version` | `rm -rf` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Consumer projects | ticket probes (`consumer-schema.prisma`, `consumer-prisma.config.ts`, `consumer-app.mjs`) | temp dirs; published 2.0.0 from the registry | removed |
| Pre-release age for pnpm 11+ | test-only `minimumReleaseAgeExclude: [repository_prisma@2.0.0]` (as IMP-10) | not a README step; recorded | removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/run-package-smoke.js` + `scripts/package-smoke/*.js` | all package smoke checks (moved) | AC-001, AC-002 | Still Valid (structure changed by the implementation) | IMP-03..06, IMP-08, IMP-09, IMP-11 | Re-diff at HEAD; mutate the 4 unmutated steps |
| `scripts/run-esm-cjs-interop.js` | interop | — | Out Of Scope (unchanged) | — | runs inside `test:package` |
| `src/tests/*` (113) | library | AC-003/004 (green on each npm) | Still Valid | IMP-08/09/11 | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..AC-004, AC-006 | IR checks | Reused | IMP-01, IMP-02, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10, IMP-11 | IMP-08/09 ran on `b87252c` and IMP-10/11 on `7047cdf`. `git diff --name-only b87252c 72ef918` outside `tickets/` = README/CHANGELOG only. IMP-06 (b, c) ran on `8ef7b77`; `b87252c` changed only pack-JSON parsing, not the mutated checks. |
| API-02 | AC-001 | output equivalence at HEAD | Existing Test | base `5a73159` (archive, `npm ci`) vs HEAD worktree: `npm run test:package` on npm 10.9.8 non-root; normalize temp paths, durations and build lines; `diff`. Plus HEAD on npm 12.2.1 (normalized JSON keys/values vs base) | IMP-05 compared `8ef7b77`, before `b87252c` |
| API-03 | AC-001 (REQ-001 move-only) | source | Temporary Probe | independent check: multiset of non-blank lines of the old file vs the new files; list new-only lines (glue) and old-only lines | Independent of the IR's script |
| API-04 | AC-002 | 4 unmutated steps | Temporary Probe | product-level breaks in the built `dist` (then `node scripts/run-package-smoke.js`), one at a time, restored by rebuilding: M1 CJS entry reads `.env` on import -> `checkImportSafety`; M2 default log levels include `query` -> `checkLoggingPolicy`; M3 ESM entry WAL statement changed -> `checkEsmRuntime`; M4 declarations make `enableWAL` unusable -> `checkConsumerTypes` | IR mutated only `cjs-runtime` and `packed-artifact` |
| API-05 | AC-005 (assumption), AC-004 | GitHub runner toolchain | Temporary Probe | `gh run view 41872190680 --log` (latest `main` CI): Node/npm versions | Confirms npm 11.19.1 (≥ 11.16) on the runner |
| API-06 | AC-004, AC-005 (pre-merge), AC-001 (root) | CI job on x86_64 Node 24 non-root at HEAD; root test:package | Journey (CLI) | `git archive HEAD` -> `docker run --platform linux/amd64 -e CI=true --user node node:24-bookworm`: `npm ci --strict-allow-scripts`, warning count, typecheck, test, build, `test:package`; then root: `npm ci --strict-allow-scripts`, `test:package` | CI is non-root; IMP-09 A ran as root |
| API-07 | AC-006 | pnpm 11.28.9 consumer, README only, published 2.0.0 | Journey (CLI) | README pnpm steps with pnpm 11 first on `PATH`: `pnpm add repository_prisma @prisma/client@7`, `pnpm add -D prisma@7`, `pnpm approve-builds better-sqlite3`, schema/config, `prisma generate`, app. Symptom control without approval. | README names pnpm 11+; not run by IR |
| API-08 | AC-006 | npm 12.2.1 consumer on Linux x64 | Journey (CLI) | container non-root: `npm i -g npm@12.2.1` into a user prefix; README npm steps; app | Linux consumer (handoff hint) |
| API-09 | AC-007 | docs | Review | README setup + Testing text, CHANGELOG; version 2.0.0 | review criterion |
| API-11 | REQ-002 (derived consumer), AC-004 | `release.yml` steps with the new `allowScripts` (added during execution) | Journey (CLI) | x86_64 container as root (global npm): `npm i -g npm@^11.5.1`, `npm ci`, warning count, native module, `npm run build`, container-only `npm version 2.0.1-e2e.0`, `npm publish --dry-run --tag e2e` | `release.yml` is unchanged, but its `npm ci` now reads `allowScripts`, and the denial of esbuild's postinstall must not break the build. Added after the first cases: a derived consumer the plan missed. |
| API-10 | AC-005 | GitHub CI on `main` after merge | Not Tested pre-merge (delivery) | merge-commit CI run: `Run npm ci --strict-allow-scripts` succeeds, job green | Trigger exists only after merge |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The change is to the smoke's structure; its assertions are the durable coverage and are exercised here.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: base archive + `npm ci`, then local diffs; containers from `git archive HEAD`; temp npm/pnpm prefixes for consumers.
- Environment choices that materially affect the run: package manager versions first on `PATH`; non-root vs root; `CI=true`.
- Health / readiness checks: exit codes; `better_sqlite3.node` present.
- Seed data / fixtures: ticket probes.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys or scenarios: RUS-01..04.
- Evidence to capture: logs with headers in `evidence/API-*`; scripts in `evidence/API-scripts/`.
- Owned processes and temporary state to clean up: `/tmp/rp6-e2e`, `--rm` containers.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-005 GitHub CI run (API-10) | Needs the merge (delivery); branch not pushed | Low: identical toolchain measured (API-05) and emulated (API-06) | No | Delivery post-merge |
| Windows consumer | No host | Low (README steps are package-manager commands) | No | — |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —
