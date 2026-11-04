# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (`architectural_risk = High`). ARCH-REV-002 `Pass` at SR-004; the architecture reviewer handed off to implementation.
- Requirements doc: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md` (Approved, SR-004)
- Investigation notes: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md` (SR-004, Ready)
- Supplemental task artifacts: `probes/README.md`, the probe files and `probes/feasibility-patch.diff` (evidence only)
- Design review report: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-review-report.md` (ARCH-REV-002)
- Architecture review revision record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)
- Workspace: worktree `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade`, branch `codex/prisma-7-upgrade`. Implementation commit `a092a60` (on `614bac4`; base `f2ffd5c`, released 1.0.10). This handoff and the `evidence/` files are in the following ticket commit.
- Not committed by me, left for their owners: the architecture reviewer's round-2 edits to `design-review-report.md` and `architecture-review-revision-record.md`, and the Solution Designer's edits to `design-spec.md` (AC-008 header now says case 5 expects `CLIENT_NOT_READY`) and `solution-revision-record.md` (records the review pass).

## Current Implementation Summary

Prisma 5.22 -> 7.10.1. The library builds its one root client through a library-owned better-sqlite3 driver adapter. The adapter opens the resolved physical path (never the query string) or `:memory:`, and stores `DateTime` as INTEGER unix ms. Non-SQLite URLs are rejected at target resolution with the new code `UNSUPPORTED_DATASOURCE_PROVIDER`, for both explicit initialization and lazy binding. The `other` target kind and `clientUrl` are removed. The manifest, lockfile, schema, build, test, smoke/interop scripts, CI and docs are on Prisma 7. The version is unchanged (1.0.10); nothing was tagged or published.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 4 runtime files (1 new) + manifest/lockfile/schema/tsup/3 scripts/CI + 5 test files (1 new) + 3 docs, all within existing ownership; no new subsystem; the lifecycle state machine is unchanged (Medium). The public contract changes as designed: peers 5 -> 7, a new native-addon peer, a new error code, SQLite only, `engines.node`. A persisted-data invariant (DateTime) holds (High). None of the escalation triggers fired: the state machine, public options and existing codes' meanings are unchanged, REQ-005/REQ-006 hold on 7.10.1 (IMP-03, IMP-07), and the CJS entry loads with `@prisma/client` 7 (IMP-05).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review` (High risk)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | 7.10.1 in manifest and lockfile; peers per DEC-002 | `package.json` (peers `@prisma/client` + `@prisma/adapter-better-sqlite3` `^7.10.1`; dev `prisma`, `@prisma/client`, adapter `^7.10.1`), `package-lock.json` | `npm ls` shows 7.10.1 for all three (IMP-01). Caret ranges exclude 8.x. |
| BEH-002 | Adapter-built root client from the same inputs | `lifecycle.ts:68-72` `defaultClientFactory` -> `new PrismaClientRuntime({ adapter: createSqliteDriverAdapter(target), log })`; `sqlite-driver-adapter.ts` | Explicit and lazy paths share the factory. Selection order, cwd resolution, binding, conflict and shutdown/rebind are unchanged (IMP-03, IMP-05). |
| BEH-003 | Memory targets on 7 | `sqlite-driver-adapter.ts` maps `sqlite-memory` -> `{ url: ':memory:' }` | New real-adapter test: `file::memory:` opens, queries work, `main` file is `''`, no file is created in cwd (IMP-08). Memory + WAL -> `WAL_UNSUPPORTED_PROVIDER` unchanged. |
| BEH-004 | Identity, strict WAL, codes unchanged for SQLite | `lifecycle.ts` `performInitialization` unchanged | All readiness tests pass, plus the packaged read-only WAL -> `WAL_ACTIVATION_FAILED` and missing directory -> `CONNECTION_FAILED` smoke cases (IMP-05). The non-SQLite row of the WAL test moved to AC-008. |
| BEH-005 | Opened file excludes the query; binding key unchanged | `sqlite-driver-adapter.ts` uses `target.expectedPath`; `datasource-target.ts` `bindingKey` keeps `file:<path><query>` | AC-004 tests assert no file name contains `?` (relative, symlink, absolute with `connection_limit`/`socket_timeout`). The packaged ESM smoke uses `?connection_limit=1` and checks the whole temp tree. Mutation (b) makes 3 tests fail (IMP-07). |
| BEH-006 | DateTime stored/compared as INTEGER ms | `sqlite-driver-adapter.ts` `{ timestampFormat: 'unixepoch-ms' }` | `datetime-continuity.test.ts`: Prisma-5-format row + new row both `integer`; `gt`, `lt` and `orderBy` return the expected rows. Mutation (a) fails with `"storage": "text"` (IMP-07). |
| BEH-007 | Non-SQLite rejected with `UNSUPPORTED_DATASOURCE_PROVIDER` | `datasource-target.ts` `resolveDatasourceTarget` throws `InitializationStageFailure('UNSUPPORTED_DATASOURCE_PROVIDER', Error('The selected datasource is not SQLite.'))`; carried by the existing `failureFrom` in `initialize`/`bindLazyClient`; `initialization-error.ts` adds the code and message | AC-008 cases 1-5, plus the `initializing` state that AC-008 names (IMP-08). The factory is never called, a bound client stays bound, and there is no URL/credential in the message, `String(error)` or the diagnostic cause. Shutting down -> `CLIENT_NOT_READY`. Public explicit and lazy (`rootPrismaClient.user`) tests and the packaged CJS smoke too. |
| BEH-008/009 | Logging and transactions unchanged | — | Logging-policy suite (lazy/conflict/rebind test now on `file::memory:`), transaction tests, and the smoke policy and transaction-option probes pass. |
| BEH-010 | ESM/CJS load; both peers external; no native load on import | `tsup.config.ts` `external` adds the adapter; `sqlite-driver-adapter.ts` named ESM import | `dist` has `require("@prisma/adapter-better-sqlite3")` / `from "@prisma/adapter-better-sqlite3"` and 0 bundled markers (IMP-04). The smoke asserts 0 `process.dlopen` calls on CJS and ESM import (IMP-05); the spy is shown to count a real open (IMP-09). |
| BEH-011/012 | Toolchain on 7 | `package.json` `prepare: prisma generate`; `prisma/schema.prisma` without `url` (+ `Event` test model); `scripts/run-tests.js` `db push`; `.github/workflows/ci.yml` without the removed step and env | Fresh `npm ci` with no `DATABASE_URL` generates the client (IMP-01); typecheck, test, build and test:package pass (IMP-02..05). |
| BEH-013 | `engines.node`; TS >= 5.4 documented | `package.json` `engines.node: "^20.19 \|\| ^22.12 \|\| >=24"`; README | — |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No consumer upgrade, no `prisma-client` generator, no Node change in workflows, no version bump/tag/publish, no data conversion. The `Event` model is a test-schema addition the design specifies for AC-005.

## Key Files Or Areas

- Runtime: `src/lib/client/sqlite-driver-adapter.ts` (new), `src/lib/client/datasource-target.ts`, `src/lib/client/lifecycle.ts` (import + factory only), `src/lib/client/initialization-error.ts`.
- Manifest/toolchain: `package.json`, `package-lock.json`, `prisma/schema.prisma`, `tsup.config.ts`, `scripts/run-tests.js`, `scripts/run-package-smoke.js`, `scripts/run-esm-cjs-interop.js`, `.github/workflows/ci.yml`.
- Tests: `src/tests/client-lifecycle.test.ts`, `datasource-readiness.test.ts`, `logging-policy.test.ts`, `public-initialization.test.ts`, `datetime-continuity.test.ts` (new).
- Docs: `README.md`, `DESIGN.md`, `CHANGELOG.md`.

Decisions taken within the design, for the reviewer to check:

1. `resolveDatasourceTarget` now tests only `inferDatabaseProviderFromUrl(url) !== 'sqlite'`. The former `/^file:/i.test(url) ||` was redundant, because that function lower-cases the URL and returns `sqlite` for any `file:` prefix or `.db` suffix (`src/lib/database.ts:33-40`). The set of URLs accepted as SQLite is unchanged.
2. `normalizeClientPath` is renamed `normalizeBindingPath` and now also lower-cases on win32. Its only remaining use is the binding key, and the key value is identical to before (the former code lower-cased `clientPath` inline). The Windows binding-key test is unchanged apart from the removed `clientUrl` lines.
3. Smoke/interop harness changes beyond the design's row:
   - Their policy probes and the interop consumer used `postgresql://` URLs with fake clients. These now reject (BEH-007), so they use SQLite memory URLs. The marker `repository-prisma-synthetic` is kept in the URL, so the "no URL in output" assertions still mean something.
   - npm 10.9.8 runs `prepare` (prisma generate) during `npm pack`, even with `--ignore-scripts` (tried; it still ran). Its output precedes the `--json` array, so the smoke parses from the line where the array starts.
   - Added: packaged CJS non-SQLite rejection (AC-012's failure outcome), a `process.dlopen` counter on import (AC-009), a query string on the ESM smoke URL so the no-`?`-file check means something, and a type-smoke line for the new code.
   - The synthetic interop peer now reports version 7.10.1 and resolves the real adapter.
4. AC-008: the five planned cases are implemented (1 and 2 as one `it.each`). An `initializing`-state case is added because AC-008 names that state. Public-facade explicit and lazy rejection is also tested.
5. README release section: the only change replaces the 1.0.10-specific tag commands (`v1.0.10`, "do not run `npm version patch`") with `vX.Y.Z` placeholders, plus one sentence that the Unreleased changes need a major version. That text would otherwise tell the next releaser to re-create the already published `v1.0.10` tag. It is not a rewrite of the release flow.

## Important Assumptions

- Consumers keep `prisma-client-js` (ASM-001); the README setup section says so.
- The README's consumer setup (install, schema, `prisma.config.ts`, `prisma generate`, unchanged code) has not been exercised in a fresh consumer by me. AC-012 assigns that to API/E2E (install of the packed tarball **without** `--legacy-peer-deps`). The repo smoke still uses `--legacy-peer-deps` plus symlinked peers, as before.

## Known Risks

- RSK-002: better-sqlite3 is a native module for consumers (prebuilt binaries for common platforms, otherwise a C++ toolchain). Documented in README.
- One better-sqlite3 connection per client (design Risks). Unchanged by implementation.
- `npm pack`/`npm publish` now run `prisma generate` through `prepare`. This is harmless for the release workflow, where `npm ci` already generated the client, but any tool that parses `npm pack --json` must expect the leading output.
- CI runs on Node 20; I verified on Node 22.23.1 only (no Node 20 runtime is installed locally). `^20.19` is inside Prisma 7's range.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` (FU-002, FU-004 deferred)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the single factory seam took the adapter with a one-line change. `failureFrom` carried the new code on both paths with no lifecycle change.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no Prisma 5 path, no URL-parameter translation, no ISO fallback)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: `OtherDatasourceTarget`, the `other` branch, `clientUrl` on both target types and in all tests, the unused `DatabaseProvider` import, `datasourceUrl` construction, schema `url`, `--skip-generate`, the CI push step and its job env, and the non-SQLite success tests. `grep -rn "clientUrl\|'other'" src` returns nothing.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. `SqliteFileDatasourceTarget = { kind, bindingKey, expectedPath }`, `SqliteMemoryDatasourceTarget = { kind, bindingKey }`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `lifecycle.ts` 438 lines (+1); `datasource-target.ts` 109; `sqlite-driver-adapter.ts` 20; `initialization-error.ts` 86. Every source delta is under 220 lines.
- Notes: `src/lib/database.ts` provider helpers are left alone as designed (public filter helpers).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision (Mandatory)"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `datetime-continuity.test.ts`. A row in the Prisma 5.22 representation (INTEGER ms, inserted raw) and a row created through the library's client are both stored as `integer`. `gt`/`lt` filters and `orderBy` return the expected rows, and the old row reads back as the same instant (IMP-03, IMP-08). With the adapter default, the same test fails (IMP-07a). `public-initialization.test.ts` "reads representative existing data directly" also passes.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Resolved: `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3` 7.10.1; `better-sqlite3` 12.11.1. `npm ci` warns that `prebuild-install@7.1.3` (a better-sqlite3 dependency) is deprecated; informational.
- `npm test` creates `test.db` in the repo root (gitignored, as before).
- The untracked `pnpm-lock.yaml` in the shared checkout was not touched (DEC-007b); none is tracked in the branch (IMP-01).

## Checks Run

All on commit `a092a60`, macOS 26.5.2, Node v22.23.1, npm 10.9.8. Evidence folder: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `env -u DATABASE_URL -u DATABASE_URL_TEST sh -c 'rm -rf node_modules && npm ci'`; `npm ls prisma @prisma/client @prisma/adapter-better-sqlite3`; `git ls-files pnpm-lock.yaml` | `a092a60` | macOS, Node 22.23.1, npm 10.9.8 | `package.json` (`prepare`, peers, engines), `package-lock.json`, `prisma/schema.prisma`, `prisma.config.ts` | AC-001, AC-010, REQ-001/002/011/013/014 | Pass | `evidence/IMP-01-npm-ci-prepare.log` | `✔ Generated Prisma Client (v7.10.1)`; `exit=0`; `prisma@7.10.1`, `@prisma/client@7.10.1`, `@prisma/adapter-better-sqlite3@7.10.1`; `tracked-pnpm-lock-count=0` |
| IMP-02 | `npm run typecheck` | `a092a60` | same | all `src/**`, `examples/**` | AC-010 | Pass | `evidence/IMP-02-typecheck.log` | `exit=0` |
| IMP-03 | `npm test` (`db push`, `generate`, `vitest`; `DATABASE_URL_TEST` unset) | `a092a60` | same | runtime + all 9 suites | AC-002..008, AC-010 | Pass | `evidence/IMP-03-npm-test.log` | `Test Files  9 passed (9)`, `Tests  96 passed (96)`; `🚀  Your database is now in sync` (no `--skip-generate`) |
| IMP-04 | `npm run build`; grep `dist` for adapter import/require and bundling markers | `a092a60` | same | `tsup.config.ts`, `src/index.ts` graph | AC-009, REQ-009 | Pass | `evidence/IMP-04-build.log` | `require("@prisma/adapter-better-sqlite3")`, `from "@prisma/adapter-better-sqlite3"`, `bundled-marker-count(...)=0` |
| IMP-05 | `npm run test:package` (build, package smoke, ESM/CJS interop) | `a092a60` | same | packed tarball, `dist`, smoke/interop scripts | AC-009, AC-012 (failure message), AC-004, AC-006, AC-007 | Pass | `evidence/IMP-05-test-package.log` | `"result":"pass"` with `"externalDriverAdapter":"pass","noNativeAddonOnImport":"pass","noQueryStringFiles":"pass"`; second line `"dynamicCommonJsPeer":"pass"` |
| IMP-06 | `git diff --check 614bac4..HEAD` (+ whole branch for reference) | `a092a60` | git | all changed files | — | Pass | `evidence/IMP-06-diff-check.log` | `implementation-commit exit=0`. The whole-branch hits are only the blank diff-context lines in the Solution Designer's `probes/feasibility-patch.diff` |
| IMP-07 | Mutations on `sqlite-driver-adapter.ts`: (a) drop `timestampFormat`; (b) pass `bindingKey` (with query) as the path; run the guarding suites; restore | `a092a60` (working tree, restored) | same | `datetime-continuity.test.ts`, `public-initialization.test.ts` | AC-004, AC-005 | Pass (the guards fail under mutation) | `evidence/IMP-07-mutation-checks.log` | (a) `+     "storage": "text",` and `Tests  1 failed (1)`; (b) `Tests  3 failed \| 9 passed (12)`; `working tree restored` |
| IMP-08 | `npx vitest run --reporter=verbose` on the 5 changed/new suites | `a092a60` | same | the changed tests by name | AC-004, AC-005, AC-008, AC-012 (message) | Pass | `evidence/IMP-08-changed-suites-verbose.log` | `PrismaClientLifecycle non-SQLite datasource rejection > ...` (6 tests), `keeps CLIENT_NOT_READY precedence ...`, `Tests  68 passed (68)` |
| IMP-09 | `process.dlopen` spy around constructing vs connecting `PrismaBetterSqlite3` | `a092a60` (`node_modules` from IMP-01) | same | the smoke's no-native-load assertion (shows the spy detects a load) | AC-009 | Pass | `evidence/IMP-09-native-addon-dlopen-spy.log` | `adapter constructed only` -> `dlopen count 0`; `adapter constructed and connected` -> `dlopen count 1` |

- Not run, and why:
  - CI on Node 20: no Node 20 runtime is installed locally. GitHub Actions or API/E2E can run it.
  - AC-012 fresh consumer install of the packed tarball **without** `--legacy-peer-deps`, following only the README setup (`prisma generate` + `initializePrisma` + query). Assigned to API/E2E by the design.
  - Windows path behavior on a real Windows host: only the existing mocked-`win32` unit test ran.
  - Release workflow (`release.yml`): not run; no release in this Task.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: library and toolchain only; no rendered frontend.

## Downstream Coverage Hints / Suggested Scenarios

- AC-012: in an empty directory, `npm install <packed tarball>` (no `--legacy-peer-deps`) and `npm install -D prisma@7`. Copy the README schema and `prisma.config.ts` snippets, add a model, then run `DATABASE_URL=file:./app.db npx prisma db push` and `npx prisma generate`. Then run unchanged code `initializePrisma({ datasourceUrl: 'file:./app.db' })` + a repository CRUD in both ESM and CJS. Confirm `@prisma/client` and the adapter were auto-installed at 7.x, and that a `postgresql://` URL gives the plain SQLite-only message.
- AC-005 against a real Prisma 5.22-written database: the `probes/datetime-continuity-write-p5.cjs` probe writes one with Prisma 5. Open it through the library on 7 and run `gt`/`lt`/`orderBy`.
- AC-004 on a relative path with spaces and `%20`, through the packed package.
- AC-008 through the packed ESM entry (the smoke covers CJS).
- CI workflow on Node 20 (`npm ci`, `typecheck`, `test`, `build`), which also confirms `prepare` in CI.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: independent API/E2E coverage and validation of AC-001..AC-012 remain with `api_e2e_engineer`, especially AC-012 (real consumer install without `--legacy-peer-deps`) and the Node 20 CI run. The checks above are implementation-scoped only.
