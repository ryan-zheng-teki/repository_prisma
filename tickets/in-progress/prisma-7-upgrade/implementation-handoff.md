# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (`architectural_risk = High`). ARCH-REV-002 `Pass` at SR-004 (IR-001). Code review CRR-001 found CR-001 (a Design Impact). The Solution Designer revised the design at SR-005 (D7, connection gate), ARCH-REV-003 passed it, and the architecture reviewer handed off to implementation (IR-002).
- Requirements doc: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md` (Approved, SR-005: adds AC-013, SCN-007)
- Investigation notes: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md` (SR-005, Ready; "SR-005 Decision D7")
- Supplemental task artifacts: `probes/README.md` (including § CR-001), the probe files, `probes/cr01-*` and `probes/feasibility-patch.diff` (evidence only)
- Design review report: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-review-report.md` (ARCH-REV-003)
- Architecture review revision record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `code-review-report.md` (CRR-001, finding CR-001), `code-review-revision-record.md`, `evidence/CR-01-tx-isolation-probe.{cjs,log}`
- Workspace: worktree `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade`, branch `codex/prisma-7-upgrade`. Implementation commits: `a092a60` (IR-001, on `614bac4`; base `f2ffd5c`, released 1.0.10) and `e5d2371` (IR-002, on `779fcb0`). This handoff and the `evidence/` files are in the ticket commit after `e5d2371`.
- Not committed by me, left for their owners: the architecture reviewer's round-3 edits to `design-review-report.md` and `architecture-review-revision-record.md`, and the uncommitted edits to `requirements-doc.md` and `solution-revision-record.md` in the working tree.

## Current Implementation Summary

Prisma 5.22 -> 7.10.1. The library builds its one root client through a library-owned better-sqlite3 driver adapter. The adapter opens the resolved physical path (never the query string) or `:memory:`, and stores `DateTime` as INTEGER unix ms. It is wrapped in a connection gate (IR-002). The adapter has one connection, so the gate gives that connection one FIFO lock: plain queries hold it per call, and a transaction holds it from start to commit or rollback. Concurrent requests stay isolated as on 1.0.10. Non-SQLite URLs are rejected at target resolution with the new code `UNSUPPORTED_DATASOURCE_PROVIDER`, for both explicit initialization and lazy binding. The `other` target kind and `clientUrl` are removed. The manifest, lockfile, schema, build, test, smoke/interop scripts, CI and docs are on Prisma 7. The version is unchanged (1.0.10); nothing was tagged or published.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (on top of IR-001)
- Related solution revision IDs: `SR-004`, `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: IR-002 adds one internal file (the gate) and two test files; there is no public API change, so the values hold. IR-001: 4 runtime files (1 new) + manifest/lockfile/schema/tsup/3 scripts/CI + 5 test files (1 new) + 3 docs, all within existing ownership; no new subsystem; the lifecycle state machine is unchanged (Medium). The public contract changes as designed: peers 5 -> 7, a new native-addon peer, a new error code, SQLite only, `engines.node`. A persisted-data invariant (DateTime) holds (High). None of the escalation triggers fired: the state machine, public options and existing codes' meanings are unchanged, REQ-005/REQ-006 hold on 7.10.1 (IMP-03, IMP-07), and the CJS entry loads with `@prisma/client` 7 (IMP-05).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review` (High risk)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. SR-005 escalation check: I found no Prisma 7 path that issues a plain adapter query while the same request's transaction holds the gate. The full suite (112 tests) passes without a hang, and so do the nested, batch, concurrent and queued transaction cases. The one waiting case is SCN-007 (application code calling `rootPrismaClient` inside its own transaction), which the design documents as unsupported.

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
| BEH-008 | Logging unchanged | — | Logging-policy suite (lazy/conflict/rebind test now on `file::memory:`) and the smoke policy probes pass. |
| BEH-009 (AC-007, AC-013) | Transactions unchanged, including isolation between concurrent requests (SR-005, D7) | `sqlite-driver-adapter.ts` returns `gateSqliteConnection(new PrismaBetterSqlite3(...))`; `sqlite-connection-gate.ts` | `transaction-isolation.test.ts` (real file, public API): the CR-01 shape (no dirty read; the independent write survives the rollback), two concurrent transactions commit, nested and batch writes run concurrently with an interactive transaction, SCN-007 fails with `P2028` "expired transaction" and the root client still works, and a queued transaction fails with `P2028` "Unable to start a transaction in the given time" after `maxWait` while plain queries and new transactions still work. The reviewer's CR-01 probe on the gated `dist` gives the 1.0.10 result (IMP-13). Unit tests cover every release path (IMP-14). Mutations fail the guards (IMP-16). |
| BEH-010 | ESM/CJS load; both peers external; no native load on import | `tsup.config.ts` `external` adds the adapter; `sqlite-driver-adapter.ts` named ESM import | `dist` has `require("@prisma/adapter-better-sqlite3")` / `from "@prisma/adapter-better-sqlite3"` and 0 bundled markers (IMP-04). The smoke asserts 0 `process.dlopen` calls on CJS and ESM import (IMP-05); the spy is shown to count a real open (IMP-09). |
| BEH-011/012 | Toolchain on 7 | `package.json` `prepare: prisma generate`; `prisma/schema.prisma` without `url` (+ `Event` test model); `scripts/run-tests.js` `db push`; `.github/workflows/ci.yml` without the removed step and env | Fresh `npm ci` with no `DATABASE_URL` generates the client (IMP-01); typecheck, test, build and test:package pass (IMP-02..05). |
| BEH-013 | `engines.node`; TS >= 5.4 documented | `package.json` `engines.node: "^20.19 \|\| ^22.12 \|\| >=24"`; README | — |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No consumer upgrade, no `prisma-client` generator, no Node change in workflows, no version bump/tag/publish, no data conversion. The `Event` model is a test-schema addition the design specifies for AC-005.

## Key Files Or Areas

- Runtime: `src/lib/client/sqlite-driver-adapter.ts` (new; gated in IR-002), `src/lib/client/sqlite-connection-gate.ts` (new, IR-002), `src/lib/client/datasource-target.ts`, `src/lib/client/lifecycle.ts` (import + factory only; unchanged in IR-002), `src/lib/client/initialization-error.ts`.
- Manifest/toolchain: `package.json`, `package-lock.json`, `prisma/schema.prisma`, `tsup.config.ts`, `scripts/run-tests.js`, `scripts/run-package-smoke.js`, `scripts/run-esm-cjs-interop.js`, `.github/workflows/ci.yml`.
- Tests: `src/tests/client-lifecycle.test.ts`, `datasource-readiness.test.ts`, `logging-policy.test.ts`, `public-initialization.test.ts`, `datetime-continuity.test.ts` (new), `sqlite-connection-gate.test.ts` (new, IR-002), `transaction-isolation.test.ts` (new, IR-002).
- Docs: `README.md`, `DESIGN.md`, `CHANGELOG.md`.

IR-002 decisions taken within the design, for the reviewer to check:

6. Gate types derive from the adapter package only. `SqliteDriverAdapterFactory = Pick<PrismaBetterSqlite3, 'provider' | 'adapterName' | 'connect'>`, and the adapter, transaction, query and isolation-level types derive from its `connect`/`startTransaction`/`queryRaw` signatures. There is no `@prisma/driver-adapter-utils` import and no new dependency. `createSqliteDriverAdapter` now returns `SqliteDriverAdapterFactory` instead of `PrismaBetterSqlite3`, and `lifecycle.ts` is unchanged.
7. `provider`, `adapterName` and the transaction's `options` are copied as plain properties rather than getters. They are readonly constants on the inner objects, and a getter widened `'sqlite'` to `string`, which failed the type. The optional methods (`getConnectionInfo`, the savepoint methods) are forwarded only when the inner object has them, so they stay absent otherwise (unit-tested).
8. Transaction `queryRaw`/`executeRaw` pass through without the lock. Prisma sends `BEGIN`'s matching `COMMIT`/`ROLLBACK` through the transaction object, and the adapter's own `commit()`/`rollback()` only release its private mutex (adapter `dist/index.mjs`, `BetterSQLite3Transaction`). The gate's `commit`/`rollback` call the inner method and then release in `finally`, once only.
9. Added beyond the design's four AC-013 cases: the review's recommended queued-transaction `maxWait` test (P2028, then a plain query and a new transaction succeed), and a batch `$transaction([...])` case, because DESIGN.md now says the gate covers batch transactions.
10. Docs: the README transaction section states the queueing and `P2028`/`maxWait` (with `runInTransaction(fn, { maxWait })`), and "Advanced: Root Client Access" states SCN-007. DESIGN §E describes the gate and its consequences. CHANGELOG adds the isolation note and marks SCN-007 as **Breaking**, because code that used the discouraged pattern now times out.

IR-001 decisions taken within the design, for the reviewer to check:

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
- One better-sqlite3 connection per client (design Risks). With the gate, plain operations wait while any transaction is open, and transactions run one at a time. A queued transaction fails with `P2028` after `maxWait` (default 2000 ms). This is documented, and it is a throughput cost for read-heavy concurrent workloads.
- SCN-007: a consumer that calls `rootPrismaClient` inside a transaction callback now gets a transaction timeout. The known consumer must audit for this pattern (FU-001).
- Node can exit while a request waits on the gate if nothing else keeps the event loop alive, because Prisma's timeout timer does not (probes/README.md § CR-001). A server keeps its loop alive, so this concerns short scripts only.
- `npm pack`/`npm publish` now run `prisma generate` through `prepare`. This is harmless for the release workflow, where `npm ci` already generated the client, but any tool that parses `npm pack --json` must expect the leading output.
- CI runs on Node 20; I verified on Node 22.23.1 only (no Node 20 runtime is installed locally). `^20.19` is inside Prisma 7's range.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` (FU-002, FU-004 deferred)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the single factory seam took the adapter with a one-line change. `failureFrom` carried the new code on both paths with no lifecycle change. IR-002: the gate sits inside the adapter policy, with no lifecycle, ALS or proxy change. SR-005 reclassified the single connection from a throughput note to a REQ-007 risk; I found no further design issue.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no Prisma 5 path, no URL-parameter translation, no ISO fallback)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: `OtherDatasourceTarget`, the `other` branch, `clientUrl` on both target types and in all tests, the unused `DatabaseProvider` import, `datasourceUrl` construction, schema `url`, `--skip-generate`, the CI push step and its job env, and the non-SQLite success tests. `grep -rn "clientUrl\|'other'" src` returns nothing.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. `SqliteFileDatasourceTarget = { kind, bindingKey, expectedPath }`, `SqliteMemoryDatasourceTarget = { kind, bindingKey }`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `lifecycle.ts` 438 lines (+1); `datasource-target.ts` 109; `sqlite-driver-adapter.ts` 28; `sqlite-connection-gate.ts` 121; `initialization-error.ts` 86. Every source delta is under 220 lines.
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

IMP-01..09 ran on `a092a60` (IR-001). IMP-10..16 ran on `e5d2371` (IR-002), which changes only the adapter policy, the new gate, two new test files and docs. Manifest, lockfile and scripts are unchanged since IMP-01, so IMP-01 (fresh `npm ci`) still holds. IMP-02..05, IMP-06 and IMP-08 are superseded by IMP-10..15 for the current code. IMP-07 still holds: IR-002 wrapped the adapter but left the path and `timestampFormat` lines it mutates unchanged, and IMP-11 reruns the guarded tests green. IMP-09 still holds: the adapter package is unchanged. Environment: macOS 26.5.2, Node v22.23.1, npm 10.9.8. Evidence folder: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/evidence/`.

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
| IMP-10 | `npm run typecheck` | `e5d2371` | same | all `src/**`, `examples/**` | AC-010 | Pass | `evidence/IMP-10-typecheck.log` | `exit=0` |
| IMP-11 | `npm test` (`DATABASE_URL_TEST` unset) | `e5d2371` | same | runtime incl. the gate + all 11 suites | AC-002..008, AC-010, AC-013 | Pass | `evidence/IMP-11-npm-test.log` | `Test Files  11 passed (11)`, `Tests  112 passed (112)` |
| IMP-12 | `npm run test:package` | `e5d2371` | same | packed tarball with the gate, smoke and interop | AC-009, AC-004, AC-006, AC-007, AC-012 (failure message) | Pass | `evidence/IMP-12-test-package.log` | `"result":"pass"` with `"externalDriverAdapter":"pass","noNativeAddonOnImport":"pass","noQueryStringFiles":"pass"`; `"dynamicCommonJsPeer":"pass"` |
| IMP-13 | `node evidence/CR-01-tx-isolation-probe.cjs $PWD/dist/index.js` (the reviewer's probe, on the IMP-12 `dist`) | `e5d2371` | same | packaged CJS entry, gate | AC-013, CR-001 | Pass | `evidence/IMP-13-cr01-probe-gated.log` | `"seenUncommitted": []` and `"rowsAfter": ["independent-request@example.test"]`, identical to the 1.0.10 base in `CR-01-tx-isolation-probe.log` |
| IMP-14 | `npx vitest run --reporter=verbose src/tests/sqlite-connection-gate.test.ts src/tests/transaction-isolation.test.ts` | `e5d2371` | same | gate release paths (fake adapter); AC-013 on a real file | AC-013, AC-007, SCN-007 | Pass | `evidence/IMP-14-gate-and-isolation-verbose.log` | `Tests  16 passed (16)`; `fails a transaction queued past its maxWait and keeps the connection usable`; `releases the lock when rollback throws and reports the failure` |
| IMP-15 | `git diff --check 779fcb0..HEAD` | `e5d2371` | git | IR-002 changes | — | Pass | `evidence/IMP-15-diff-check.log` | `exit=0` |
| IMP-16 | Mutations: (a) return the ungated adapter; (b) the gate's `rollback` does not release; run the guarding suites; restore | `e5d2371` (working tree, restored) | same | `transaction-isolation.test.ts`, `sqlite-connection-gate.test.ts` | AC-013, CR-001 | Pass (the guards fail under mutation) | `evidence/IMP-16-mutation-checks.log` | (a) `× keeps a request without a transaction out of another request's open transaction`, `Tests  2 failed \| 4 passed (6)`; (b) `× queues transactions in order and releases the lock on rollback`, `Tests  2 failed \| 8 passed (10)`; `working tree restored` |
| IMP-09 | `process.dlopen` spy around constructing vs connecting `PrismaBetterSqlite3` | `a092a60` (`node_modules` from IMP-01) | same | the smoke's no-native-load assertion (shows the spy detects a load) | AC-009 | Pass | `evidence/IMP-09-native-addon-dlopen-spy.log` | `adapter constructed only` -> `dlopen count 0`; `adapter constructed and connected` -> `dlopen count 1` |

- Not run, and why:
  - IR-002 did not rerun the fresh `npm ci` (IMP-01): the manifest and lockfile are unchanged.
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
- AC-013 through the packed package in ESM as well (IMP-13 used the CJS `dist`). A longer concurrent-load run (many plain requests while transactions open and close) would confirm no starvation or lost writes; the gate's FIFO order should keep waiting bounded by the transactions ahead.
- SCN-007 and `maxWait` in a short script without other event-loop handles: Node may exit while waiting (see Known Risks). That is documented Prisma timer behavior, not a library failure.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: independent API/E2E coverage and validation of AC-001..AC-012 remain with `api_e2e_engineer`, especially AC-012 (real consumer install without `--legacy-peer-deps`) and the Node 20 CI run. The checks above are implementation-scoped only.
