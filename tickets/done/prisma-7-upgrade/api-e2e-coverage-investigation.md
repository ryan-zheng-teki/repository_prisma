# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md` (Approved, SR-005)
- Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md` (SR-005, D7)
- Supplemental Task Artifacts: `probes/README.md` and the probe files (evidence only), notably `probes/datetime-continuity-write-p5.cjs` and `probes/datetime-continuity.schema.prisma`
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer pass CRR-002 (implementation review round 2), code commit `e5d2371`, handoff commit `f91b676`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Prisma 5.22 -> 7.10.1. The library builds its one root client through a library-owned, gated better-sqlite3 driver adapter (opened path excludes the URL query; `:memory:` for memory targets; `timestampFormat: 'unixepoch-ms'`). The connection gate (D7) gives the single connection one FIFO lock: plain queries hold it per call, a transaction holds it from start to commit/rollback. Non-SQLite URLs reject with `UNSUPPORTED_DATASOURCE_PROVIDER` for explicit and lazy binding. Peers: `@prisma/client ^7.10.1` and `@prisma/adapter-better-sqlite3 ^7.10.1`; `prepare: prisma generate`; `engines.node ^20.19 || ^22.12 || >=24`; CI drops `--skip-generate`. Version stays 1.0.10.

Must be proven: AC-001..AC-013 (SR-005). Main open items from the handoff and review: AC-012 fresh-consumer install without `--legacy-peer-deps` following only the README (ESM + CJS, plus the SQLite-only message), the CI commands on Node 20, AC-013 through the packed ESM entry and under concurrent load, AC-005 against a database actually written by Prisma 5.22, AC-004 through the packed package (relative, spaces, `%20`, symlink), and Windows paths if a host is available.

Known documented behavior, not failures: SCN-007 (root client inside its own transaction callback -> P2028) and a transaction queued past `maxWait` -> P2028 "Unable to start a transaction in the given time".

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001, SCN-002, SCN-003, SCN-004, SCN-005.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RUS-01 A new consumer project installs the published package with plain `npm install` (npm 10, default peer handling) and copies the README setup snippets verbatim, then writes ordinary application code (ESM `import` or CJS `require`) with repositories and `runInTransaction`. Trigger: the README setup section (AC-012).
  - RUS-02 A server handles many concurrent requests on one process: most do plain repository/`prisma`/`rootPrismaClient` reads and writes, some run short transactions that commit or roll back (the known consumer is an HTTP server). Trigger: concurrent request handlers sharing the root client (AC-013 under load). Optionally with `enableWAL: true`, as the README startup example shows.
  - RUS-03 An existing application database created and written by Prisma 5.22 (the 1.0.x line) is opened unchanged by the upgraded library. Trigger: the consumer upgrade (AC-005 with real Prisma-5 output, not a raw-SQL imitation).
  - RUS-04 A CI runner on Node 20 Linux runs the workflow commands from a clean checkout (AC-010). Trigger: push / pull request.
  - RUS-05 A TypeScript consumer type-checks the README code with the documented minimum TypeScript 5.4 (REQ-014 / AC-011).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested as failures): SCN-007 (observed only to confirm the documented outcome, never as a failure basis), SCN-006 (`prisma-client` generator, out of scope).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 peers/versions | Changed | REQ-001/002, DEC-002 | AC-001 via fresh `npm ci` (IMP-01 reused) and consumer `npm ls` |
| BEH-002 adapter-built root client | Changed | REQ-003, D1 | Existing suites + packed-consumer CRUD (ESM/CJS) |
| BEH-003 memory targets | Preserved | REQ-003 | Existing suites |
| BEH-004 readiness/WAL/codes | Preserved | REQ-006 | Existing suites + smoke (reused); WAL in the load probe |
| BEH-005 query string excluded from opened file | Changed | REQ-004, DEC-006 | Existing tests + packed-package path probe |
| BEH-006 DateTime INTEGER ms | Preserved (by pinning) | REQ-005, DEC-005 | Existing raw-SQL test + real Prisma 5.22 database probe |
| BEH-007 non-SQLite rejected | Changed | REQ-008, DEC-001 | Existing tests + packed ESM/CJS consumer message check |
| BEH-009 transactions incl. isolation | Preserved (gate added) | REQ-007, AC-013, D7 | Existing isolation tests + new durable load test + packed ESM probe |
| BEH-010 ESM/CJS entrypoints, externals | Changed | REQ-009 | Smoke (reused) + real consumer installs |
| BEH-011/012 toolchain | Changed | REQ-010/011 | CI commands on Node 20 in Linux |
| BEH-013 engines/TS minimum | Added | REQ-014 | Consumer typecheck with TS 5.4 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | target resolution, adapter policy, gate | 112 vitest tests (IMP-11), mutation checks (IMP-07, IMP-16) | Gate under sustained concurrent load | Durable load test + packed probe |
| API / transport / contract | Yes | public package API, peers, error codes | smoke with symlinked peers and `--legacy-peer-deps` (IMP-12) | Real registry install with default peer resolution; README accuracy | CLI: fresh consumer install |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | (consumer Electron packaging is FU-001) | — | — | — |
| Process / lifecycle | Yes | npm lifecycle (`prepare`), Node runtime minimum | IMP-01 on Node 22 macOS | Node 20 + Linux CI | Docker `node:20-bookworm` |
| Persisted-data transition | Yes | DateTime representation | raw-SQL fixture test | DB actually written by Prisma 5.22 | Prisma 5.22 scratch writer + packed consumer reader |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | npm registry, native `better-sqlite3` build/prebuild | IMP-01 (macOS) | Linux native install via peer auto-install | Docker consumer install |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade`, branch `codex/prisma-7-upgrade`
- Project type and runtime stack: TypeScript library (tsup CJS+ESM), Prisma 7.10.1 + better-sqlite3, vitest 4, npm
- Project testing guideline path(s), or `No project testing guideline found`: No project testing guideline found (no `TESTING*.md` in the repository). Choices derived from `AGENTS.md`, `README.md` § Testing and § Requirements and Setup, `package.json` scripts and `.github/workflows/ci.yml`.
- Conflicting, missing, or unclear project instructions: none. README § Setup does not say how tables are created; a consumer uses its normal Prisma workflow (`prisma db push`/`migrate`), which the journey uses with `DATABASE_URL` read by `prisma.config.ts`.
- Required environment variables or secrets available: `N/A` (no secrets; registry access is anonymous)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `AGENTS.md` | repo instructions | README is the usage guide; releases are tag-based (no release here) |
| `README.md` § Requirements and Setup (Prisma 7) | consumer setup (AC-012 journey source) | `npm install repository_prisma`; `npm install -D prisma@7`; schema generator/datasource snippet; `prisma.config.ts` snippet; `npx prisma generate`; unchanged `initializePrisma({ datasourceUrl: 'file:./app.db' })` |
| `README.md` § Testing | repo test flow | `npm install` (prepare generates), `npm test` (db push + generate + vitest on `test.db`) |
| `package.json` | scripts | `typecheck`, `test`, `build`, `test:package`, `prepare: prisma generate`, engines |
| `.github/workflows/ci.yml` | CI | ubuntu-latest, Node 20, `npm ci`, `npm run typecheck`, `npm test`, `npm run build` |
| `scripts/run-package-smoke.js`, `scripts/run-esm-cjs-interop.js` | package smoke | uses `--legacy-peer-deps` + symlinked peers, so it does not prove AC-012's install |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repo checks (macOS) | worktree | `npm run typecheck`, `npm test` | Node 22.23.1, npm 10.9.8 | exit 0 | none (creates gitignored `test.db`) |
| Linux Node 20 CI emulation | container `/work` from `git archive HEAD` | `docker run --rm node:20-bookworm` | Node 20.20.2, npm 10.8.2, arm64 (CI is x64; amd64 emulation attempted if available) | exit 0 per step | `--rm` container; nothing on host |
| Packed tarball | `/tmp/rp-e2e/pack` | `npm pack --pack-destination` | from the worktree build of HEAD | tarball present | `rm -rf /tmp/rp-e2e` |
| Fresh consumers (ESM, CJS, TS) | `/tmp/rp-e2e/consumer-*` | `npm install <tgz>`, `npm install -D prisma@7` (no `--legacy-peer-deps`) | registry access | `npm ls` | `rm -rf` |
| Prisma 5.22 writer | `/tmp/rp-e2e/p5-writer` | `npm install prisma@5.22.0 @prisma/client@5.22.0` | probe schema with `url` | `db push` ok | `rm -rf` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| SQLite files | created per case in temp dirs | no shared or user data touched; shared checkout untouched | deleted with the temp root; outputs copied to evidence |
| Prisma-5 DateTime rows | `probes/datetime-continuity-write-p5.cjs` + extra rows written by Prisma 5.22 | scratch file `/tmp/rp-e2e/p5/dt.db` | deleted after the run |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: a SQLite file created by `prisma db push` 5.22 and written by `@prisma/client` 5.22 (several `DateTime` rows, including `@default(now())`). Opened through the packed library on 7.10.1: reads return the same instants; `gt`/`lt`/`orderBy` return the expected rows across old and new rows; new rows are stored as `integer`.
- Evidence planned: API-09 (plus reverse read of 7-written rows by Prisma 5.22, to show the file stays readable by the 1.0.x line).
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `src/tests/transaction-isolation.test.ts` | CR-01 shape, two concurrent tx, nested/batch concurrent, SCN-007, queued `maxWait` | AC-013, AC-007 | Still Valid | IMP-14, IMP-16 | Add one load case (API-02) |
| `src/tests/sqlite-connection-gate.test.ts` | gate release paths with a fake adapter | AC-013 (D7) | Still Valid | IMP-14, IMP-16 | none |
| `src/tests/datetime-continuity.test.ts` | raw INTEGER-ms row + new row; gt/lt/orderBy | AC-005 | Still Valid | IMP-07a, IMP-11 | none (complemented by API-09) |
| `src/tests/public-initialization.test.ts` | real-file init, relative/space/`%20`/query, no `?` file, symlink, memory, non-SQLite explicit+lazy, WAL, rebind, existing data | AC-002/003/004/006/008 | Still Valid | IMP-07b, IMP-11 | none |
| `src/tests/client-lifecycle.test.ts` | lifecycle incl. AC-008 cases 1-5 + initializing | AC-008, REQ-006 | Still Valid | IMP-08, IMP-11 | none |
| `src/tests/datasource-readiness.test.ts` | target normalization (incl. mocked win32), readiness parsing | AC-004, AC-006 | Still Valid | IMP-11 | none |
| `src/tests/logging-policy.test.ts` | logging policy on `file::memory:` | REQ-006 | Still Valid | IMP-11 | none |
| `src/tests/integration.test.ts`, `transaction-context.test.ts`, `forwarding-proxy.test.ts`, `database-filter.test.ts` | repositories, decorators, ALS, proxies, filters | AC-002, AC-007 | Still Valid | IMP-11 | none |
| `scripts/run-package-smoke.js`, `scripts/run-esm-cjs-interop.js` | packed tarball import (ESM/CJS), externals, no dlopen on import, CJS non-SQLite rejection, no `?` file | AC-009, AC-012 (message, CJS) | Still Valid | IMP-12 | none (install path differs from AC-012 by design: symlinked peers) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-003, AC-006, AC-007, AC-008, AC-009 | repo suites, smoke, mutations | Reused | IMP-01, IMP-07, IMP-09, IMP-12, IMP-13, IMP-14, IMP-16 | Ran on `e5d2371` or on `a092a60` with no change since to the code they exercise (handoff Checks Run); `git diff --name-only e5d2371 f91b676` touches only `tickets/` |
| API-02 | AC-013 | gate under concurrent load, public API, real file | Durable | add `keeps concurrent plain requests isolated and loses no writes while transactions commit and roll back` to `src/tests/transaction-isolation.test.ts`; `npx vitest run src/tests/transaction-isolation.test.ts --reporter=verbose` | RUS-02 is the server's normal shape; no existing test runs many plain requests across several transactions |
| API-03 | AC-010 (repo side), all suites | macOS repo checks after API-02 | Existing Test | `npm run typecheck`; `npm test` | Suite must stay green with the new test |
| API-04 | AC-010, AC-001 | CI commands on Node 20 Linux, clean checkout | Journey (CLI) | `git archive HEAD` -> container `node:20-bookworm`: `npm ci` (no `DATABASE_URL`), `npm ls`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:package` | Handoff "Not run": no Node 20 locally; CI is Linux |
| API-05 | AC-012, AC-008, AC-009, REQ-015 | fresh ESM consumer from the packed tarball, macOS Node 22 | Journey (CLI) | empty dir; `npm install <tgz>` (no `--legacy-peer-deps`); `npm install -D prisma@7`; README schema + `prisma.config.ts`; `npx prisma generate`; `DATABASE_URL=file:./app.db npx prisma db push`; `node app.mjs` (init, repository CRUD, `runInTransaction` commit + rollback, `prisma` proxy, shutdown); non-SQLite explicit + lazy messages | AC-012 exact journey; registry install cannot be a durable repo test (network, publishes nothing) |
| API-06 | AC-012, AC-008 | fresh CJS consumer from the tarball, macOS | Journey (CLI) | same as API-05 with a CommonJS project and `require` | AC-012 requires both module systems |
| API-07 | REQ-014, AC-011, AC-012 | TypeScript consumer typecheck | Temporary Probe | in the ESM consumer: `npx -p typescript@5.4.5 tsc --noEmit` and with the latest TypeScript 5.x on README-style code | Documented TS minimum; consumer-side only |
| API-08 | AC-013, AC-007 | packed ESM entry: CR-01 shape + load probe (DELETE and WAL) | Temporary Probe | `node load-probe.mjs` in the ESM consumer | Through the shipped `dist/index.mjs` with real peers; larger scale than a unit-suite test should carry |
| API-09 | AC-005, REQ-005 | database written by Prisma 5.22 opened by the packed library on 7.10.1 | Temporary Probe | Prisma 5.22 scratch project + probe schema: `db push`, `datetime-continuity-write-p5.cjs` + extra rows; consumer on 7 reads/filters/orders/creates; Prisma 5.22 reads back | Needs two Prisma majors side by side; not suited to the repo suite |
| API-10 | AC-004, REQ-004 | packed package path handling | Temporary Probe | in the ESM consumer: relative path with spaces + query, literal `%20` + query, symlink alias + query, absolute with spaces; `PRAGMA database_list`; scan for `?` names | Through the shipped package; existing durable tests cover the source |
| API-11 | AC-012, AC-008, AC-013 | fresh ESM + CJS consumer on Node 20 Linux (native better-sqlite3 auto-installed as a peer) | Journey (CLI) | run the API-05/06/08 scripts in `node:20-bookworm` with the same tarball | Node 20 runtime + Linux native addon via default peer install |
| API-12 | AC-004 (Windows) | Windows path handling | Not Tested (planned) | needs a Windows host | see Not Tested |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02 | `src/tests/transaction-isolation.test.ts` (one new `it`) | Guards the gate's main promise in the shape real servers produce: many plain requests through repositories, `prisma` and `rootPrismaClient` interleaved with committing and rolling-back transactions. Asserts no rolled-back row is ever seen, no plain or committed write is lost, rolled-back rows are absent, and every request settles. |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: build + `npm pack` from the worktree at HEAD -> consumers in `/tmp/rp-e2e/*` -> Docker runs mount the tarball and scripts read-only.
- Environment choices that materially affect the run: no `--legacy-peer-deps`; `DATABASE_URL` unset during install/generate; Node 22.23.1 (macOS arm64) and Node 20.20.2 (Linux arm64 container).
- Health / readiness checks: command exit codes; `npm ls` peer versions.
- Seed data / fixtures: created by each script in its own temp directory; Prisma-5 rows written by Prisma 5.22 itself.
- Test identities, authentication, permissions, or session state: N/A.
- Requirement-linked journeys or scenarios: RUS-01..05 above.
- Evidence to capture: full command logs with headers in `evidence/API-*`; the probe scripts are copied next to their logs.
- Owned processes and temporary state to clean up: `/tmp/rp-e2e`, `--rm` containers.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Windows path behavior on a real Windows host (API-12) | No Windows host or VM is available here; CI has no Windows job | Low: path code is unchanged apart from the binding-key lowercase (unit-tested with mocked `win32`); the adapter receives `path.resolve` output | No (any Windows machine or a Windows CI runner can run it) | Record as residual risk; delivery decides |
| Linux x64 exactly as `ubuntu-latest` | Host is arm64; covered by an amd64-emulated `node:20-bookworm` run (API-04, ENV-2x), not the hosted runner image | Low | No | GitHub Actions CI on the PR |
| `release.yml` | No release in this Task | — | No | release decision |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (add API-02)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: SCN-007 and queued-`maxWait` P2028 are documented outcomes, not failures.
