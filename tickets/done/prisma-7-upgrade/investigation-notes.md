# Investigation Notes

## Investigation Meta

- Package identifier: `prisma-7-upgrade` (Project Task `repository-prisma-1`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Request / ticket: Upgrade Prisma (client and CLI) from 5.22.0 to the latest stable 7.x (7.10.1)
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade`, branch `codex/prisma-7-upgrade` (no upstream set)
- Resolved base remote / branch / revision: `origin/codex/repository-prisma-esm-cjs-interop@f2ffd5ca864ea484c236ec8c530ea62604a60c54`, the released `1.0.10` line (tag `v1.0.10` = `5c57ebd`, plus two docs-only commits). `origin/main@8ab582f75e5456856cb0954eaba1ad4882250577` (1.0.9) is an ancestor of it. See DEC-008 in the requirements doc and the Source Log.
- Finalization target remote / branch: `origin` / `main`, as the Task requires ("finalized on the base branch"). Merging fast-forwards `main` over the released 1.0.10 commits (DEC-008).
- Bootstrap result: Completed. `git worktree add -b codex/prisma-7-upgrade ... origin/codex/repository-prisma-esm-cjs-interop`; ticket folder `tickets/in-progress/prisma-7-upgrade`.
- Bootstrap note: `git fetch origin` fails in this environment (`git@github.com: Permission denied (publickey)`). `git ls-remote origin` succeeds through the configured `github.com-ryan` host alias and confirmed remote `main` = `8ab582f` and remote ticket branch = `f2ffd5c`, both identical to the local remote-tracking refs. Delivery should re-check fetch/push access before finalization.
- Current solution revision ID: `SR-005`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-04)
- Investigation status: Requirements investigation complete. Architecture investigation not started (follows approval).

## Initial Request And Clarifications

- Original request (user, 2026-11-04, via the Project Task Manager): "the available prisma is 7. or something but our library is still old, please check. we need to upgrade."
- Clarifications received: The user decided on the latest stable 7.x (7.10.1), not 8.0 RC.
- User-supplied facts and constraints: Follow AGENTS.md (README/DESIGN updates). No release or tag in this Task. Keep the public API behavior unless Prisma 7 makes a change unavoidable, and report any such change with evidence. Decide which lockfile(s) to keep. Propose the peer range with evidence.
- Initial ambiguity: The adaptation approach and the peer range were left open. The investigation showed that Prisma 7 makes adapter construction a library concern, which raises DEC-001/DEC-002.

## Product And Domain Understanding

- Product area: `repository_prisma`, a published npm library (latest `1.0.10`) providing implicit ALS transactions, repositories, a lifecycle-owned root Prisma client, and SQLite readiness (identity and strict WAL).
- Affected actors or systems: library consumers (known: `autobyteus-server-ts`), library maintainers (local `npm test`/build), and the CI and release workflows.
- Existing purpose: the library constructs and owns the one root `PrismaClient` from a datasource URL (explicit `initializePrisma({ datasourceUrl })` or env selection on lazy binding).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-04 | User/Task | `get_project_task repository-prisma-1` | Direction | 7.10.1 target; open: adaptation and peer range | — |
| 2026-11-04 | Command | `git status`, `git branch -a`, `git worktree list`, `git log main..codex/repository-prisma-esm-cjs-interop`, `git merge-base` | Base resolution | `main` = 1.0.9 (`8ab582f`). Branch `codex/repository-prisma-esm-cjs-interop` (`f2ffd5c`) adds the 1.0.10 fix and was never merged; merge-base = `main` (fast-forward). | DEC-008 |
| 2026-11-04 | Command | `npm view repository_prisma versions dist-tags`; `git ls-remote origin` | Released state | npm `latest` = `1.0.10`; tag `v1.0.10` -> `5c57ebd` on the unmerged branch | DEC-008 |
| 2026-11-04 | Doc | `git show codex/repository-prisma-esm-cjs-interop:tickets/done/repository-prisma-esm-cjs-interop/release-deployment-report.md` | Why 1.0.10 is not on main | "Finalization target branch: `codex/repository-prisma-esm-cjs-interop` per bootstrap context; no direct `main` finalization" | DEC-008 |
| 2026-11-04 | Code | `package.json`, `package-lock.json`, `tsup.config.ts`, `tsconfig.json`, `prisma/schema.prisma`, `prisma.config.ts` (at `f2ffd5c`) | Current dependency/config | peer `@prisma/client ^5.22.0`; dev `prisma ^5.22.0`; tsup externals `@prisma/client`, `uuid`; schema datasource has `url = env("DATABASE_URL")`; `prisma.config.ts` already sets `datasource.url` | REQ-001/011 |
| 2026-11-04 | Code | `src/lib/client/lifecycle.ts`, `datasource-target.ts`, `sqlite-readiness.ts`, `database.ts`, `client.ts`, `models.ts`, `src/index.ts` | Production path of client construction | `defaultClientFactory` = `new PrismaClient({ datasourceUrl: target.clientUrl, log })`. Targets: `sqlite-file` (absolute path, query kept in `clientUrl` and `bindingKey`), `sqlite-memory`, `other` (any non-SQLite URL, passed through). | REQ-003..008 |
| 2026-11-04 | Code | `src/tests/*.test.ts`, `scripts/run-tests.js`, `scripts/run-package-smoke.js`, `scripts/run-esm-cjs-interop.js` | Test harness | Tests inject fake clients for `postgresql://` targets (lifecycle semantics only; no real non-SQLite DB). `public-initialization.test.ts` uses `?connection_limit=1` and seeds via `new PrismaClient({ datasourceUrl })`. `run-tests.js` runs `prisma db push --skip-generate`. | REQ-004/010 |
| 2026-11-04 | Code | `.github/workflows/ci.yml`, `release.yml` | CI/release | CI: Node 20, `npm ci`, `npx prisma db push --skip-generate`, typecheck, test, build. Release: Node 20, `npm ci`, build, publish. | REQ-010, FU-003 |
| 2026-11-04 | Code | `git log --all -- pnpm-lock.yaml`; CI `cache: npm`, `npm ci` | Lockfile policy | `pnpm-lock.yaml` was never tracked; npm is the repo's package manager | DEC-007 |
| 2026-11-04 | Web | https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 | Official v7 breaking changes | Driver adapters required for all databases; `prisma-client` generator recommended, `prisma-client-js` "still available but will be removed in future releases"; schema `url` moved to `prisma.config.ts`; env not auto-loaded; `--skip-generate` removed and `db push` no longer generates; Node >= 20.19, TS >= 5.4; `$use` and metrics removed | REQ-* |
| 2026-11-04 | Web | Prisma release status (search) | 8.x context | Prisma 8 is an RC on npm `latest`; its CLI has no `generate`/`db push`; Prisma advises pinning `prisma@7` | REQ-001, FU-002 |
| 2026-11-04 | Command | `npm view @prisma/client@7.10.1 engines dependencies peerDependencies exports`; `npm view @prisma/adapter-better-sqlite3@7.10.1 ...`; `npm search @prisma/adapter` | Dependency contracts | client engines `^20.19 \|\| ^22.12 \|\| >=24`; adapters at 7.10.1: pg, neon, mariadb, libsql, mssql, better-sqlite3; better-sqlite3 adapter depends on `better-sqlite3 ^12.6.0` | DEC-002/003 |
| 2026-11-04 | Code | `autobyteus-workspace-superrepo/autobyteus-server-ts` (`package.json`, `prisma/schema.prisma`, `src/server-runtime.ts`, `src/config/prisma-client-factory.ts`) | Known consumer | ESM (`"type": "module"`), `repository_prisma ^1.0.10`, `@prisma/client ^5.22.0`, `prisma-client-js`, SQLite, 16 `DateTime` fields; calls `initializePrisma({ datasourceUrl })`; also builds its own `new PrismaClient({ datasources })` | SCN-001, FU-001 |
| 2026-11-04 | Runtime | `probes/README.md` (all probes) | Feasibility | See Runtime findings | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | `package.json` peer/dev ranges | Consumers install `@prisma/client` 5.x; repo dev uses `prisma` 5.22.0 | Peer `^5.22.0` | `package.json`, lockfile | High |
| BEH-002 | System | `initializePrisma({ datasourceUrl? })` or first root/repository operation (lazy bind) | URL selected (explicit, then env order), SQLite file path resolved against cwd, root client constructed from URL | One root client per binding; `DATASOURCE_CONFLICT` on a different target | README "Initialization", `datasource-target.ts`, `lifecycle.ts` | High (Read + tests) |
| BEH-003 | System | SQLite memory URL (`file::memory:`, `:memory:`, `mode=memory`) | Memory target, no identity check, WAL rejected | `WAL_UNSUPPORTED_PROVIDER` | `datasource-target.ts`, tests | High |
| BEH-004 | System | Explicit initialization | Connect, verify `main` = target file, optional strict WAL | Stable error codes, `onDiagnostic` | README, `sqlite-readiness.ts`, tests | High |
| BEH-005 | Contract | SQLite URL with query parameters | Query kept in `clientUrl` (engine params like `connection_limit`) and `bindingKey`; physical path excludes query | Opened file = path without query | `datasource-target.ts`, `public-initialization.test.ts:112-140` | High |
| BEH-006 | Data | Any `DateTime` write/read through library-built clients | Prisma 5 engine | Stored as SQLite INTEGER unix ms | Measured (probe) | High |
| BEH-007 | System | Non-SQLite URL (`postgresql://`, `mysql://`, ...) | Target kind `other`, URL passed to `PrismaClient` | Works with any provider supported by the consumer's generated client. WAL is rejected for it. | `datasource-target.ts`, README WAL note, `PRISMA_DATASOURCE_PROVIDER` doc. Tests use fakes only. | Medium: documented; no known consumer |
| BEH-008 | Contract | `logQueries` / `PRISMA_LOG_QUERIES` | Log levels at construction | Default `info,warn,error`; `query` opt-in; `LOGGING_POLICY_CONFLICT` | README, `logging-policy.ts` | High |
| BEH-009 | Contract | `runInTransaction`, `@Transactional`, `prisma` proxy, `rootPrismaClient` | ALS transactions, outer options forwarded | Nested reuse | README, DESIGN, tests | High |
| BEH-010 | Contract | Package import (ESM `exports.import`, CJS `exports.require`) | `@prisma/client` external, default-namespace runtime access (1.0.10) | Import loads no `.env` and needs no datasource | README, `run-package-smoke.js`, `run-esm-cjs-interop.js` | High |
| BEH-011 | Operational | `npm ci`, `npm test`, `npm run build`, `npm run test:package`, CI | `db push --skip-generate`, `generate`, vitest | 83 tests pass on 5.22 (1.0.10 finalization log) | `scripts/run-tests.js`, `ci.yml` | High |
| BEH-012 | Contract | `prisma.config.ts` + schema | Schema datasource has `url`; config also sets `datasource.url` | — | files | High |
| BEH-013 | Contract | Runtime minimums | Not declared by the library | — | `package.json` has no `engines` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `src/lib/client/lifecycle.ts` `defaultClientFactory` | Only production construction site of `PrismaClient` (`datasourceUrl`) | Must construct with a driver adapter on 7 | Where adapter construction lives (lifecycle vs a datasource-owned factory); behavior for `other` targets |
| `src/lib/client/datasource-target.ts` | Resolves URL to `sqlite-file` (`expectedPath`, `clientUrl` with query), `sqlite-memory`, `other` | Adapter must open `expectedPath`, not `clientUrl` (query would become part of the filename) | Whether `clientUrl` remains meaningful |
| `src/lib/client/sqlite-readiness.ts` | Raw PRAGMA identity/WAL checks via `$queryRawUnsafe` | Works unchanged with the adapter (Measured) | `seq` comes back as BigInt (adapter `defaultSafeIntegers(true)`); identity check reads only `name`/`file` |
| `src/lib/models.ts`, `context.ts`, tests | `Prisma.ModelName`, `Prisma.TransactionIsolationLevel` | Available on 7 with `prisma-client-js` (Measured) | none |
| `tsup.config.ts` `external` | Externalizes `@prisma/client`, `uuid` | Adapter must also be external (bundling broke ESM, Reproduced) | Add adapter to externals or a dependency-derived list |
| `scripts/run-tests.js`, `ci.yml` | `db push --skip-generate` | Removed flag (Reproduced) | Use `db push` then `generate` |
| `scripts/run-package-smoke.js`, `run-esm-cjs-interop.js` | Consumer harness symlinks `@prisma/client` only | Must also provide the adapter (Reproduced) | Harness design |
| `prisma/schema.prisma` | `url = env("DATABASE_URL")` | Must be removed (P1012, Reproduced) | `prisma.config.ts` already supplies the CLI URL |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma.config.ts`, `tsup.config.ts`, CI workflows, README/DESIGN/CHANGELOG.
- Readers: npm, Prisma CLI, tsup, GitHub Actions, consumers via npm metadata.

### Structural Surfaces

- Runtime: root client construction (lifecycle factory), datasource target resolution, package entrypoints.
- Public API: `initializePrisma`, `InitializePrismaOptions`, `PrismaInitializationErrorCode` union, peer dependencies.

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes (peer range, new adapter peer, non-SQLite stance per DEC-001; possibly a new error code).
- Persistence schema or invariant change: No schema change. DateTime storage representation must be held constant (REQ-005).
- Security or privacy boundary change: No. Error messages must stay free of URLs and paths.
- Concurrency or lifecycle change: The lifecycle state machine is unchanged; only construction changes.
- Deployment/migration: Consumers must add the adapter and drop the schema `url` (consumer side, FU-001).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `construct-options.cjs` on 7.10.1 | Current construction | `datasourceUrl` rejected; adapter required | Reproduced | REQ-003 | `probes/README.md` |
| `prisma generate` with schema `url` | Repo schema | P1012 | Reproduced | REQ-011 | `probes/README.md` |
| `prisma db push --skip-generate` | Repo test script/CI | Flag rejected | Reproduced | REQ-010 | `probes/README.md` |
| `adapter-readiness.mjs` | Identity, WAL, logging, transaction options via better-sqlite3 adapter | All work | Reproduced | REQ-003/006/007, DEC-003 | `probes/README.md` |
| `adapter-readiness.mjs` with `?connection_limit=1` | Query parameter | Adapter opens a file literally named with the query | Reproduced | REQ-004, DEC-006 | `probes/README.md` |
| `datetime-continuity-*` | Prisma-5 data read/written by 7 | 5.22 stores INTEGER ms. With adapter default `iso8601`, new rows are TEXT and a range filter misses older rows. `unixepoch-ms` preserves results. | Measured | REQ-005, DEC-005 | `probes/README.md` |
| Full suite on scratch patch | Whole library | 83/83 pass; typecheck passes | Reproduced | Feasibility of REQ-003..010 | `probes/feasibility-patch.diff` |
| `test:package` on scratch patch | Packaging | Bundled adapter breaks ESM; externalized adapter passes smoke | Reproduced | REQ-009 | `probes/README.md` |
| Fake library with peers `@prisma/client` and `@prisma/adapter-better-sqlite3` `^7.10.1`, packed and installed into an empty consumer with npm 10.9.8 (`/tmp/peer-autoinstall`) | Consumer install simplicity | npm installed both peers automatically | Measured | REQ-015 | this row |
| Read `better-sqlite3/lib/database.js:48` | Import-time cost | Native addon is loaded lazily in the `Database` constructor | Read | REQ-009 (no native load at import) | — |

- Temporary diagnostics: None in the task worktree. All probes ran in `/tmp` scratch copies.
- Reproduction for implementation to start from: `probes/feasibility-patch.diff` (apply to a scratch copy with 7.10.1 installed: the current suite fails at construction with `Unknown property datasourceUrl`) and `probes/datetime-continuity-read.mjs` (format regression).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task) | Upgrade to stable 7.x | Explicit | REQ-001 | — |
| `autobyteus-server-ts` | SQLite, ESM, existing user databases with DateTime | Code read | REQ-003/005, SCN-001 | Consumer upgrade is separate (FU-001) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `@prisma/client` | 7.10.1 | Adapter required; `prisma-client-js` still supported (deprecated) | Prisma 7 guide, probes | Removal of `prisma-client-js` in a later major (FU-002) |
| `prisma` CLI | 7.10.1 | No schema `url`, no `--skip-generate` | probes | — |
| `@prisma/adapter-better-sqlite3` | 7.10.1, `better-sqlite3 ^12.6.0` (native) | `{ url }` path with `file:` prefix stripped; no query parsing; `timestampFormat` option | adapter source `dist/index.js:412,678` | Native addon build per platform/ABI is the consumer's concern (Electron packaging, FU-001) |
| Node / TypeScript | `^20.19 \|\| ^22.12 \|\| >=24`; TS >= 5.4 | Minimums | npm metadata | CI Node 20 is past EOL (2026-04-30) (FU-003) |

## Persisted Data And State Facts

- Affected stored subject: consumer SQLite databases accessed through library-built clients. The library owns no schema. Its own test schema has no DateTime.
- Representative shape: Prisma-5-written `DateTime` = INTEGER unix ms (Measured).
- Current readers and writers: Prisma 5 engine through the library's root client. Consumers also have their own clients (FU-001).
- Required semantics: Existing rows must keep their meaning, and filters/sorts on DateTime must return the same rows after the upgrade.
- Acceptable loss: None.
- Remaining evidence gap: None for the library's default. Consumer-built clients are out of scope.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/prisma-7-upgrade/probes/README.md` and probe files | Solution Designer | Feasibility and reproduction evidence | Prisma 7 behavior | REQ-003..011 | Current | Evidence only; not behavior-defining |
| `tickets/in-progress/prisma-7-upgrade/follow-ups.md` | Solution Designer (rows by any role) | Out-of-scope findings | — | — | Current | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Consumers that build their own Prisma 7 clients with the adapter default `iso8601` would mix formats in the same DB | Silent wrong query results | Library documents it in README. Consumer migration is FU-001. | Open (outside the library) |
| RSK-002 | Risk | better-sqlite3 is a native addon; consumer platforms (Linux ARM64, Electron) need matching prebuilt binaries | Install/runtime failure for consumers | README note; FU-001 | Open |
| UNK-001 | Unknown | Whether any consumer uses a non-SQLite datasource | DEC-001 | Only known consumer is SQLite | Answered as far as evidence goes |

## Architecture Investigation Findings

Recorded 2026-11-04 after SR-002 approval. Design reading gate read: `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`.

| Method / Source | Observation | Established | Design Use |
| --- | --- | --- | --- |
| `/tmp/prisma7-scripts/p3.mjs` | Client construction with a missing directory succeeds; `$connect()` throws "Cannot open database because the directory does not exist". `$disconnect()` closes the handle (WAL checkpointed, `-wal`/`-shm` gone); the same client reconnects. | Reproduced | CONNECTION_FAILED path and shutdown/rebind unchanged |
| `/tmp/prisma5-scripts/raw.cjs` vs `/tmp/prisma7dt-scripts/raw.mjs` | Raw `SELECT id, count(*)` returns `{ id: 1, n: 1n }` on both 5.22 and 7.10.1 | Measured | No raw-type change for readiness or docs |
| `/tmp/prisma7-probe`: `rm -rf node_modules/.prisma && npm run build` | DTS build fails without a generated client. `prisma generate` succeeds with no `DATABASE_URL`. | Reproduced | `prepare: prisma generate` |
| `npm view @prisma/client@{5.22.0,7.10.1} scripts` | 5.22 had a postinstall that auto-generated; 7.10.1 has none | Read | same; the release workflow (`npm ci`, `npm run build`) relied on it |
| `@prisma/adapter-better-sqlite3/package.json` | `exports.import` -> real ESM `dist/index.mjs` | Read | Named ESM import is safe |
| `.github/workflows/ci.yml` | `env DATABASE_URL`, `npx prisma db push --skip-generate`, then typecheck before test | Read | Remove the step and the env; `prepare` generates |
| `grep -rn clientUrl src` | Only non-test reader is `lifecycle.ts:69` | Read | `clientUrl` removable |
| `lifecycle.ts:73-81, 114-121, 210-229` | Resolution failures keep their own stage code on both entry forms | Read | Reject non-SQLite in `resolveDatasourceTarget` |


## Requirement Implications

- Prisma 7 removes URL-only construction, so the library must choose and construct a driver adapter. This is an unavoidable public contract change: a new peer and a narrower supported-provider set (DEC-001/002).
- Adapter defaults would silently change SQLite DateTime storage and query results (REQ-005), and would mis-handle URL query strings (REQ-004).
- CI, the test script and the schema must change for the CLI (REQ-010/011).

## Notes For Architecture Design

- Map SCN-001..004 onto the lifecycle construction path. The only production construction site is `defaultClientFactory`.
- Preserve the `PrismaClientFactory` seam used by tests.
- Verify adapter error mapping for connection failures (for example a missing directory) and that `CONNECTION_FAILED` and the diagnostics still classify them.
- Verify that `$disconnect` closes the better-sqlite3 handle (file release, WAL checkpoint) so `shutdownPrisma()` and rebinding still work. The tests passed in the scratch patch, but the design should confirm it.

### SR-005 additions (code review CR-001, 2026-11-04)

| Method / Source | Observation | Established | Design Use |
| --- | --- | --- | --- |
| Reviewer `evidence/CR-01-tx-isolation-probe.{cjs,log}` | 1.0.10/Prisma 5 (21-connection pool) isolates request B from A's open transaction. a092a60/Prisma 7 does not: B reads uncommitted rows, and B's write is lost on rollback. | Reproduced (by code reviewer) | D7 |
| `node_modules/@prisma/adapter-better-sqlite3/dist/index.js:523-545, 633-651, 667-681` | Plain `executeIO`/`performIO` skip the private mutex that `startTransaction` takes | Read | D7 |
| `@prisma/adapter-libsql@7.10.1 dist/index-node.js:279-408`; `@libsql/client lib-cjs/sqlite3.js:177-180` | libsql adapter serializes plain queries behind open transactions. libsql's local `transaction()` hands off the connection and lazily opens a new one (breaks `:memory:`). | Read | D7 option analysis |
| Gate prototype in `/tmp/cr01-proto` (`probes/cr01-*`) | CR-01 probe restored; 96/96 tests; concurrent tx and nested writes OK; root-in-tx waits and the transaction then fails with Prisma's timeout; Prisma's timeout timer does not keep Node alive | Reproduced / Measured | D7, AC-013, SCN-007 |
