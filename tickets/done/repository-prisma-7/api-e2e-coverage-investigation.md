# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/requirements-doc.md` (Approved, SR-001; Part A = REQ-001..003, AC-001..004)
- Investigation Notes: `.../repository-prisma-7/investigation-notes.md`
- Solution Revision Record: `.../repository-prisma-7/solution-revision-record.md`
- Design Spec (required on every route): `.../repository-prisma-7/design-spec.md` (SR-001, Part A Ready)
- Supplemental Task Artifacts: `probes/` (`driver-failure-inspect.mjs`, `lazy-coded-error-inspect.mjs`, `README.md`), evidence only
- Design Review Report: `.../repository-prisma-7/design-review-report.md` (uncommitted, architecture reviewer)
- Architecture Review Revision Record: `.../repository-prisma-7/architecture-review-revision-record.md` (uncommitted)
- Implementation Handoff: `.../repository-prisma-7/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../repository-prisma-7/implementation-revision-record.md`
- Code Review Report: `.../repository-prisma-7/code-review-report.md` (CRR-001 Pass, uncommitted)
- Code Review Revision Record: `.../repository-prisma-7/code-review-revision-record.md` (uncommitted)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer pass CRR-001 (code `bcf2be0`; handoff `5564eb1`/`831c407`)
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Part A only. Part B (release, AC-005) is not in this round.
- **REQ-001:** explicit `initializePrisma` whose `$connect` fails because `better-sqlite3`'s native module cannot load rejects with `SQLITE_DRIVER_UNAVAILABLE`. This covers a missing build ("Could not locate the bindings file") and a wrong ABI (`ERR_DLOPEN_FAILED`), also when nested as `cause`.
  - The message is path-free and cites the README heading "Allow the native SQLite build". The raw cause goes only to `onDiagnostic`.
  - Any other connect failure stays `CONNECTION_FAILED`.
  - The lazy path is unchanged (DEC-002): the first query throws the driver's own error.
- **REQ-002:** the new code is exported and documented (README, DESIGN.md, CHANGELOG).
- **REQ-003:** the README install lines pin `repository_prisma@2`, with a pnpm release-age paragraph and a release-guide reminder.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (app startup with an unloadable native module), SCN-002 (README install with npm and pnpm, including right after a release).
- Real-use scenarios added:
  - RUS-01: a Linux x64 server (Docker, non-root) where npm 12 blocked `better-sqlite3`'s build: explicit init in ESM and CJS, the lazy first query, then the README npm fix.
  - RUS-02: a module built for one Node ABI and run under another on Linux, as in a Docker image whose Node version changed or an Electron app. The README fix for npm users is `npm rebuild better-sqlite3`.
  - RUS-03: a pnpm project, which is the known consumer's package manager (FU-002 of repository-prisma-6). It covers the blocked build (pnpm 11/12 `pnpm approve-builds`) and the wrong ABI. With pnpm, `better-sqlite3` is a transitive dependency of `@prisma/adapter-better-sqlite3` and not hoisted to `node_modules/`, so whether the README's `npm rebuild better-sqlite3` fixes a pnpm project must be measured.
  - RUS-04: README install once the newest version is older than pnpm's minimum release age. This is the normal state for most of a release's life. It is emulated by lowering `minimumReleaseAge` in the consumer, because 2.0.0 is 15 h old at test time (published 2026-11-04T15:10Z).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 explicit init driver-load failure -> `SQLITE_DRIVER_UNAVAILABLE` | Changed | REQ-001, DEC-001, DEC-003 | Reuse IMP-02/04/05; add Linux x64 non-root (missing + ABI), pnpm (missing + ABI) |
| BEH-001 other connect failures -> `CONNECTION_FAILED` | Preserved | REQ-001 | Reuse IMP-02 (d), IMP-03 smoke missing-parent |
| BEH-002 lazy path | Preserved | DEC-002 | Lazy ESM and CJS in the Linux run |
| BEH-003 README pin + pnpm note | Changed | REQ-003, DEC-004 | Reuse IMP-06 (young version); add old-enough state |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | lifecycle connect-failure classification | IMP-02 (fake `$connect`), IMP-04 mutations | Real driver on Linux; pnpm layout | CLI consumers |
| API / transport / contract | Yes | public error-code union, message | IMP-01, IMP-03 | — | — |
| Frontend / browser / auth / desktop | No | (Electron is guidance only) | — | — | — |
| Process / lifecycle | Yes | startup failure state | IMP-02 | — | — |
| Persisted-data transition | No | — | — | — | — |
| External integration | Yes | `better-sqlite3` native load under npm 12 / pnpm 11/12; Node ABI | IMP-05 (macOS npm 12) | Linux; pnpm; README fix per package manager | Docker x86_64 non-root; macOS pnpm |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7`, branch `codex/repository-prisma-7-driver-error-and-release` (not pushed)
- Project type and runtime stack: TypeScript library; Prisma 7.10.1; better-sqlite3 12.11.1; npm; vitest
- Project testing guideline path(s), or `None found` and the `TESTING.md` you create: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/TESTING.md` (named in `AGENTS.md`). It was followed:
  - a `src/` change gets `npm run typecheck` + `npm test` (IMP-01/02);
  - consumer-facing behavior gets `npm run test:package` (IMP-03);
  - install/README setup changes get fresh consumer projects with the package manager under test, without `--legacy-peer-deps`, following only the README, in ESM and CJS;
  - Linux x64 parity: `docker run --platform linux/amd64 ... --user node node:24-bookworm`;
  - pnpm 11+ release age: a test-only `minimumReleaseAgeExclude` is the documented way to test a just-published release. Here the opposite state is needed, so `minimumReleaseAge` is lowered instead.
- Conflicting, missing, or unclear project instructions: none.
- Required environment variables or secrets available: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | as above |
| `README.md` § Requirements and Setup, § Allow the native SQLite build | consumer journey source | npm: `npm install repository_prisma@2`, `npm install -D prisma@7`, `npm install-scripts approve better-sqlite3`, `npm rebuild better-sqlite3`. pnpm: `pnpm add repository_prisma@2 @prisma/client@7`, `pnpm add -D prisma@7`, pnpm 11+ `pnpm approve-builds better-sqlite3`. Wrong ABI: `npm rebuild better-sqlite3` |
| `evidence/IMP-05-06-consumer-scripts/` | IR's consumer apps | `app.mjs [explicit|lazy]`, `app.cjs` print `RESULT ...`, message and diagnostic |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Packed tarball of `bcf2be0` | `/tmp/rp7e/pack` | `npm run build`, `npm pack` in the worktree | — | file exists | `rm -rf /tmp/rp7e` |
| Linux consumer | Docker volume `rp7e-linux` | `node:24-bookworm` amd64 `--user node` (npm 12.2.1 in a user prefix), then `node:22-bookworm` amd64 on the same volume | emulated x86_64 | exit codes | `docker volume rm` |
| macOS pnpm consumers | `/tmp/rp7e/pnpm11`, `/tmp/rp7e/pnpm12` | pnpm 11.28.9 / 12.16.1 temp prefixes; Node 22.23.1; Node 25.2.1 for the ABI case | — | — | `rm -rf` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| SQLite files | created by the apps in the consumer dirs | temp only | removed |
| Release-age state | consumer `pnpm-workspace.yaml` `minimumReleaseAge` | test-only, consumer-local | removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `src/tests/sqlite-driver-unavailable.test.ts` | AC-001 (a)-(d) with fake `$connect`; classifier cause chain, cycles, non-Error values | AC-001 | Still Valid | IMP-02, IMP-04 | reuse |
| `src/tests/prisma-client-generator/registration-recovery.test.ts` | different client after a failed connect | AC-001 (failed-state) | Still Valid | IMP-02, IMP-04 | reuse |
| `scripts/package-smoke/consumer-types.js`, `packed-artifact.js` | the new code in the declarations and consumer types | AC-003 | Still Valid | IMP-03 | reuse |
| other suites | unchanged behavior | — | Still Valid | IMP-02 (167 tests) | reuse |

No durable test can load a broken native module without corrupting the repository's own `better-sqlite3`. So the real-driver cases are E2E probes in throwaway consumers, as TESTING.md prescribes for install-shaped behavior.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-002 (macOS npm 12), AC-004 (young version) | IR checks | Reused | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06 | All ran on `bcf2be0`; `git diff --name-only bcf2be0 HEAD` outside `tickets/` is empty |
| API-02 | AC-002, BEH-002 | Linux x64, npm 12, module missing, then README npm fix | Journey (CLI) | volume consumer in `node:24-bookworm` amd64 as `node`: npm 12.2.1; `npm install <tgz>`; `npm install -D prisma@7`; schema/config; generate; `app.mjs explicit`, `app.cjs`, `app.mjs lazy`, `app-lazy.cjs`; README fix `npm install-scripts approve better-sqlite3` + `npm rebuild better-sqlite3`; rerun | Reviewer item 1 + 3 |
| API-03 | AC-002, BEH-002 | Linux x64 wrong ABI (module built under Node 24, run under Node 22), then README fix | Journey (CLI) | same volume in `node:22-bookworm` amd64 as `node`: explicit ESM/CJS, lazy; `npm rebuild better-sqlite3`; rerun | ABI on Linux; README remedy |
| API-04 | AC-002 | pnpm 11.28.9 and 12.16.1 consumers (macOS), module missing, README pnpm fix; wrong ABI (Node 25) with README's `npm rebuild better-sqlite3`, and as control `pnpm rebuild better-sqlite3` | Journey (CLI) | `pnpm add <tgz> @prisma/client@7`; `pnpm add -D prisma@7`; generate; apps; `pnpm approve-builds better-sqlite3`; apps; Node 25 apps; `npm rebuild better-sqlite3` under Node 25; apps; `pnpm rebuild better-sqlite3` under Node 25; apps | Reviewer item 2 |
| API-05 | AC-004 | README install once the version is older than the release age (emulated) | Journey (CLI) | pnpm 11/12: consumer `pnpm-workspace.yaml` `minimumReleaseAge: 60` (minutes) before the README `pnpm add repository_prisma@2 @prisma/client@7`; check installed version and that no `minimumReleaseAgeExclude` entry is added; app ESM/CJS. npm 12: `npm install repository_prisma@2`, app | Reviewer item 4 |
| API-06 | AC-002 (message), REQ-002 | message and docs | Review | the message text has no path and the cited README heading exists (anchor); README/DESIGN/CHANGELOG text | review |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None (see the inventory note).

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: build + pack -> Linux volume runs (node:24 then node:22) -> macOS pnpm runs -> AC-004 emulation.
- Environment choices that materially affect the run: non-root `node` user; `--platform linux/amd64`; package-manager versions first on `PATH`; Node 25 only for ABI cases.
- Health / readiness checks: `native module present` count; exit codes.
- Seed data / fixtures: IR consumer scripts (`app.mjs`, `app.cjs`, `schema.prisma`, `prisma.config.ts`) plus a lazy CJS app.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys or scenarios: RUS-01..04.
- Evidence to capture: logs with headers in `evidence/API-*`; scripts in `evidence/API-scripts/`.
- Owned processes and temporary state to clean up: `/tmp/rp7e`, the Docker volume, `--rm` containers.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Electron ABI | The README line is guidance only (requirements); no Electron app in scope | Low (same `ERR_DLOPEN_FAILED` class as API-03/04) | No | FU-002 of repository-prisma-6 (consumer upgrade) |
| AC-004 with 2.0.0 actually older than a day | 2.0.0 is 15 h old at test time | Low: emulated by lowering `minimumReleaseAge` (the same gate) | No | — |
| Part B / AC-005 | Not in this round | — | No | Release request |
| Windows | No host | Low | No | — |

## Ambiguities Or Reroute Triggers

None at investigation time. API-04 decides whether the README's ABI remedy holds for pnpm.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —
