# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline: `requirements-doc.md` at `SR-004` (SR-002 approval; SR-004 corrects AC-006/AC-008 within DEC-001), approved by the Solution Designer within the direction, user informed. The user delegated the technical decisions on 2026-11-04 ("i trust you have good architecture technical understanding for this project") and added REQ-015 ("how user use it will still be intuitive and simple").
- Behavior-defining supplements: none (`probes/` is evidence only)
- User approval of the design: `Not required` (the direction does not ask for it)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Authorities read (2026-11-04): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (repo root, at `f2ffd5c`). `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: `DESIGN.md` §E says "pass it through `PrismaClient({ datasourceUrl })`". §Package ESM/CommonJS Boundary says "The package does not add ... compatibility adapter, or peer-range change". Both statements become false with this change, and this design updates them (DESIGN.md is in scope, REQ-012). §FAQ mentions "the Rust engine reads the schema", which is no longer true for Prisma 7's query compiler. The FAQ sentence is corrected in the same docs pass. No conflict with the general principles.

## Current-State Read

The library has a single production construction site for the raw root client: `defaultClientFactory` (`src/lib/client/lifecycle.ts:67-71`), which calls `new PrismaClient({ datasourceUrl: target.clientUrl, log })`. The target comes from `resolveDatasourceTarget` (`src/lib/client/datasource-target.ts:115-131`). It produces three kinds:
- `sqlite-file`: `expectedPath`, plus `clientUrl` and `bindingKey` that keep the query string (`:102-111`);
- `sqlite-memory`: `clientUrl` = `bindingKey` (`:91-100`);
- `other`: any non-SQLite URL, passed through (`:125-130`).

`PrismaClientLifecycle` owns the state machine, readiness, conflict and shutdown. It calls the factory on lazy bind (`bindLazyClient`, `lifecycle.ts:210-229`) and on explicit initialization (`initializeNewClient`, `:231-243`). It maps resolution failures through `failureFrom` (`:73-81`), which keeps an `InitializationStageFailure`'s own code; both `initialize` (`:114-121`) and `bindLazyClient` use it. The ownership is healthy. Prisma 7 changes only *how* a client is built (investigation notes, Runtime findings: `datasourceUrl` rejected, adapter required). It also changes the repo's toolchain: the schema `url` is rejected, `--skip-generate` was removed, and there is no postinstall generation.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 14 files within existing ownership. Runtime: `datasource-target.ts`, `lifecycle.ts`, `initialization-error.ts`, plus one new file `sqlite-driver-adapter.ts`. Manifest/toolchain: `package.json`, `package-lock.json`, `prisma/schema.prisma`, `tsup.config.ts`, `scripts/run-tests.js`, `scripts/run-package-smoke.js`, `scripts/run-esm-cjs-interop.js`, `.github/workflows/ci.yml`. Tests: three suites updated, two tests added. Docs: README, DESIGN, CHANGELOG. No new subsystem; the lifecycle state machine is unchanged.
- Architectural risk: `High`
- Risk rationale: public contract changes: peer move 5 -> 7, a new peer `@prisma/adapter-better-sqlite3` (native addon for consumers), non-SQLite datasources now rejected with a new error code, Node minimum. A persisted-data invariant must hold (DateTime representation, REQ-005). Packaging/deployment touches ESM/CJS externals and build hooks.
- Escalation trigger: any need to change the lifecycle state machine, the public options, or an existing error code's meaning. Any Prisma 7 behavior that breaks REQ-005/REQ-006 beyond what the probes show. Any failure of the CJS entry with `@prisma/client` 7. Return as `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Construction probe | `probes/construct-options.cjs` | `datasourceUrl` rejected; adapter required | D1 adapter-based construction | — |
| Adapter readiness probe | `probes/adapter-readiness.mjs` | identity, WAL, logging, tx options work; query string becomes part of the filename | D1, D3 (path from `expectedPath`) | — |
| DateTime continuity | `probes/datetime-continuity-*` | `iso8601` default breaks range filters over Prisma-5 rows; `unixepoch-ms` preserves them | D2 | — |
| Connection failure / release probe | `/tmp/prisma7-scripts/p3.mjs` (2026-11-04) | Constructing a client with a missing directory succeeds; `$connect()` throws "Cannot open database because the directory does not exist". `$disconnect()` closes the handle (`-wal`/`-shm` removed); the same client reconnects. | CONNECTION_FAILED classification and shutdown/rebind unchanged | — |
| Raw integer types | `/tmp/prisma5-scripts/raw.cjs` vs `/tmp/prisma7dt-scripts/raw.mjs` | `SELECT id, count(*)` -> `{ id: 1, n: 1n }` on both 5.22 and 7.10.1 | Readiness parsing unchanged; no raw-type change to document | — |
| Build without generated client | `/tmp/prisma7-probe`: `rm -rf node_modules/.prisma && npm run build` | `DTS Build error`; `prisma generate` works with no `DATABASE_URL`, then the build passes | D6 `prepare` script | — |
| Client postinstall | `npm view @prisma/client@7.10.1 scripts` vs `@5.22.0 scripts.postinstall` | 5.22 had `node scripts/postinstall.js` (auto-generate); 7.10.1 has none | D6 | — |
| Adapter package exports | `node_modules/@prisma/adapter-better-sqlite3/package.json` | Real ESM build (`exports.import` -> `dist/index.mjs`), so a named ESM import is safe (unlike the CJS-generated `@prisma/client`) | D4 import style | — |
| Peer auto-install | `/tmp/peer-autoinstall` (npm 10.9.8) | Both declared peers installed automatically | D5 peers, REQ-015 | pnpm behavior Read only (auto-install-peers default) |
| Scratch suite | `probes/feasibility-patch.diff` | 83/83 tests, typecheck pass | Overall feasibility | — |

## Intended Change

Build the root client through a library-owned SQLite driver adapter. Reject non-SQLite targets at resolution with a new stable code. Move the manifest, toolchain and docs to Prisma 7.10.1, with no new public option and no change for SQLite consumers' code.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Root-client construction, datasource target resolution, initialization error codes, package manifest/lockfile/build/test/CI scripts, test schema, tests, README/DESIGN/CHANGELOG.
- Derived consumers of changed structures:
  - `ResolvedDatasourceTarget` loses `other` and `clientUrl`. Readers: `lifecycle.ts` (factory, `hasSameTarget` via `bindingKey`, WAL gate on `kind`) is updated. `sqlite-readiness.ts` reads `expectedPath` only (unchanged). Tests in `datasource-readiness.test.ts` and `client-lifecycle.test.ts` are updated.
  - `PrismaInitializationErrorCode` gains a member. Readers: `SAFE_ERROR_MESSAGES` (must add the entry; it is a `Record`, so the compiler enforces it), the public type export (`src/index.ts`), README code list.
- Deliberately left alone:
  - `src/lib/database.ts` provider helpers (`detectDatabaseProvider`, `supportsCaseInsensitiveMode`, ...). They are public filter helpers used independently of client construction; changing them is not required by Prisma 7.
  - The lifecycle state machine, forwarding proxies, context/transactions, decorators, repositories.
  - `tsconfig.json`: typecheck passes on 7 with the current settings.
  - `release.yml`: it needs no edit because `npm ci` runs `prepare` (D6).
  - Node version in workflows (FU-003). The untracked `pnpm-lock.yaml` in the shared checkout (DEC-007b).
- Follow-ups: FU-001, FU-002, FU-003, FU-004 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002 | System | REQ-003, REQ-015 / AC-002, AC-003, AC-012 | `initializePrisma` / first operation | `lifecycle.ts:67-71` | Adapter-built client; same inputs | DS-001, DS-002 |
| BEH-003 | System | REQ-003 / AC-006 | memory URL | `datasource-target.ts:91-100` | Adapter `:memory:` | DS-001 |
| BEH-004 | System | REQ-006 / AC-006 | explicit init on a SQLite target | `lifecycle.ts` `performInitialization` | Unchanged for SQLite targets. For non-SQLite input, the former `WAL_UNSUPPORTED_PROVIDER` (non-SQLite + WAL, `lifecycle.ts:283-288`) no longer applies: resolution rejects first (BEH-007). | DS-001 |
| BEH-005 | Contract | REQ-004 / AC-004 | URL with query | `datasource-target.ts:102-111` | Adapter opens `expectedPath`; `bindingKey` unchanged | DS-001 |
| BEH-006 | Data | REQ-005 / AC-005 | DateTime read/write | Prisma 5 INTEGER ms | `timestampFormat: 'unixepoch-ms'` | DS-001 |
| BEH-007 | System | REQ-008 / AC-008 | non-SQLite URL | `datasource-target.ts:125-130` | Rejected at resolution with `UNSUPPORTED_DATASOURCE_PROVIDER`. `initialize` resolves at `lifecycle.ts:111-121`, after only the shutting-down check (`:103-109`) and before the conflict (`:132-135`, `:147-150`), logging-policy and WAL (`:283-288`) checks. A non-SQLite URL therefore yields this code in every lifecycle state except `shutting-down` (`CLIENT_NOT_READY`, unchanged). A bound client is left untouched (`:116-118` only sets `failed` from `idle`/`failed`). This replaces two former outcomes: non-SQLite + `enableWAL` (`WAL_UNSUPPORTED_PROVIDER`) and bound SQLite then non-SQLite (`DATASOURCE_CONFLICT`). | DS-001, DS-002 |
| BEH-008/009 | Contract | REQ-006/007 / AC-006/007 | logging, transactions | as today | Unchanged | — |
| BEH-010 | Contract | REQ-009, REQ-015 / AC-009, AC-012 | import/require | tsup externals, smoke | Adapter external peer; native addon lazy | DS-003 |
| BEH-011/012 | Operational | REQ-010/011 / AC-010 | npm ci/test/build, CI | `run-tests.js`, `ci.yml` | `prepare` generate; no removed flags; no schema url | DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/README.md` + probe files | Feasibility/reproduction | REQ-003..011 | Evidence and starting reproduction | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (dependency major upgrade with forced contract changes)
- Current design issue found: `No`
- Structural triggers:
  - *Persisted-data transition*: fires (the storage representation could change). Decided `Directly Usable — No Migration` by pinning the representation (D2).
  - *Legacy cleanup*: fires. The `other` target kind and `clientUrl` become unreachable/unused and are removed (no wrapper kept).
  - *Several kinds or forms*: fires. Target kinds file/memory/other and entry forms explicit init/lazy bind are each traced below (DS-001/DS-002).
  - *Derived data*: fires. Readers of `ResolvedDatasourceTarget` and of the error-code union are listed in Change Scope.
  - Ruled out: *Repeated coordination* (one construction site), *Responsibility overload* (adapter policy goes to its own file rather than growing `lifecycle.ts`, 434 lines), *Authoritative boundary* (callers keep using `client.ts`/the lifecycle only).
- Root cause classification: `No Design Issue Found`. The external contract changed; the existing owners absorb it.
- Refactor needed now: `No`
- Evidence: single factory seam (`lifecycle.ts:62-71`); resolution failures already carry their own codes through `failureFrom`.
- Design response: add one owned file for the SQLite adapter policy, tighten the target type, add one error code.
- Intentional deferrals: FU-002 (`prisma-client` generator), FU-004 (adapter injection).

## Terminology

- *Driver adapter*: Prisma 7's required database driver bridge passed as `new PrismaClient({ adapter })`. Here it is always `PrismaBetterSqlite3`.
- *Timestamp format*: the SQLite storage representation of Prisma `DateTime`; fixed to `unixepoch-ms` (INTEGER ms).
- No project glossary found. These words are used consistently with Prisma's own documentation.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: URL-based client construction (`datasourceUrl`), the `other` datasource target kind, the `clientUrl` field, the CI `--skip-generate` step, the schema datasource `url`.
- Compatibility wrappers kept: `None`. There is no Prisma 5 fallback, no dual construction path, and no translation of Prisma-5 URL engine parameters.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: consumer SQLite databases (any volume). `DateTime` columns are stored as INTEGER unix ms by Prisma 5.22 (Measured).
- Change: Prisma 7's better-sqlite3 adapter defaults to ISO-8601 TEXT.
- Readers/writers: the library-built root client (and consumers' own clients, FU-001).
- Required semantics: identical values and identical filter/order results.
- Decision: `Directly Usable — No Migration`. The library configures `timestampFormat: 'unixepoch-ms'`, so it reads and writes the existing representation. Measured: all rows returned by a range filter.
- Rationale: there is no transformation, so no I/O, downtime or recovery risk. A migration to TEXT would bring no benefit.
- Supports: REQ-005, AC-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002..007 | App `initializePrisma(options)` | Ready root client or safe rejection | `PrismaClientLifecycle` | Explicit init path (file, memory and non-SQLite kinds) |
| DS-002 | Primary End-to-End | BEH-002, BEH-007 | First repository/`rootPrismaClient`/`prisma` operation | Lazily bound client or `PrismaInitializationError` | `PrismaClientLifecycle` | Lazy path (same factory, same rejection) |
| DS-003 | Primary End-to-End | BEH-010 | Consumer `import`/`require('repository_prisma')` | Package loaded; adapter and client resolved from the consumer's node_modules | package build (tsup/exports) | ESM/CJS packaging |
| DS-004 | Primary End-to-End | BEH-011/012 | `npm ci` (local or CI/release) | generated client -> typecheck/test/build/pack | npm lifecycle scripts | Toolchain |

## Primary Execution Spine(s)

- DS-001: `App -> client.ts initializePrisma -> PrismaClientLifecycle.initialize -> resolveDatasourceTarget (file | memory | reject non-SQLite) -> defaultClientFactory -> createSqliteDriverAdapter -> PrismaClient({ adapter, log }) -> $connect -> sqlite-readiness (identity, WAL) -> Ready`
- DS-002: `Repository/rootPrismaClient/prisma proxy -> forwarding proxy -> PrismaClientLifecycle.getClientForOperation -> bindLazyClient -> resolveDatasourceTarget -> defaultClientFactory -> createSqliteDriverAdapter -> PrismaClient -> Prisma query (adapter connects on first use)`
- DS-003: `Consumer import -> exports.import (dist/index.mjs) | exports.require (dist/index.js) -> external @prisma/client (default namespace) + external @prisma/adapter-better-sqlite3 (named) -> no native load until a Database is opened`
- DS-004: `npm ci -> prepare: prisma generate (reads prisma.config.ts + schema) -> typecheck | test (db push, generate, vitest) | build (tsup) -> test:package (pack, smoke, interop)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The lifecycle resolves the target once, before any conflict, logging-policy or WAL check. A non-SQLite URL now fails right there with `UNSUPPORTED_DATASOURCE_PROVIDER`, before any client exists and without touching a bound client. For SQLite, the factory asks the adapter policy for an adapter (physical path or `:memory:`, INTEGER-ms timestamps) and builds the client. Connection, identity and WAL proceed exactly as today. | datasource target, root client, readiness | `PrismaClientLifecycle` | adapter policy, logging policy, error catalog |
| DS-002 | The first operation lazily resolves from the environment and builds the same way. Rejection becomes `PrismaInitializationError` with the new code through the existing `failureFrom`. | datasource target, root client | `PrismaClientLifecycle` | same |
| DS-003 | Both bundles import the two Prisma packages as externals. The consumer's npm auto-installs them as peers. | package entrypoints | build config | — |
| DS-004 | `prepare` restores the auto-generation that Prisma 5's postinstall used to provide, so every script and workflow after `npm ci` has a generated client. | generated client | `package.json` scripts | — |

## Spine Actors / Main-Line Nodes

`client.ts` facade, `PrismaClientLifecycle`, `resolveDatasourceTarget`, `defaultClientFactory`, `PrismaClient`, `sqlite-readiness`.

## Ownership Map

- `client.ts`: thin public facade (unchanged).
- `PrismaClientLifecycle`: state, sequencing, readiness, conflict, shutdown (unchanged). Its default factory composes adapter + logging into a client.
- `datasource-target.ts`: selects and classifies the target, and now owns the *supported-provider invariant* (SQLite only).
- `sqlite-driver-adapter.ts` (new): owns how the library opens SQLite under Prisma 7: which path, memory mapping, timestamp format.
- `initialization-error.ts`: catalog of safe codes/messages (gains one).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why | Must Not Secretly Own |
| --- | --- | --- | --- |
| `src/lib/client.ts` | `PrismaClientLifecycle` | Public API | adapter or target policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `OtherDatasourceTarget` type and its branch in `resolveDatasourceTarget` (`datasource-target.ts:22-27, 125-130`) | Non-SQLite is rejected (DEC-001); the kind can no longer be produced | Rejection with `UNSUPPORTED_DATASOURCE_PROVIDER` in `resolveDatasourceTarget` | Its `DatabaseProvider` import goes if unused |
| `clientUrl` field on both SQLite target types | Dead: its only production reader is `lifecycle.ts:69` (`grep -rn clientUrl src` shows no other non-test reader), and the adapter uses `expectedPath` / `:memory:` | `createSqliteDriverAdapter` | `bindingKey` keeps the exact former values (memory: former `clientUrl`; file: `file:<path><query>`) |
| `datasourceUrl` construction in `defaultClientFactory` | Rejected by Prisma 7 | `{ adapter: createSqliteDriverAdapter(target) }` | — |
| `url = env("DATABASE_URL")` in `prisma/schema.prisma` | P1012 on Prisma 7 | `prisma.config.ts` `datasource.url` (exists) | — |
| `--skip-generate` in `scripts/run-tests.js` | Flag removed | `db push` (it no longer generates; the existing following `generate` step stays) | — |
| CI step `npx prisma db push --skip-generate` and job env `DATABASE_URL` in `ci.yml` | Flag removed. The step was redundant with `npm test` (which pushes the test DB); after removal the env has no reader (generate does not need a URL, Reproduced). | `prepare` (generate), `npm test` (push) | — |
| Tests asserting non-SQLite success, `other` target shape, `clientUrl` (`datasource-readiness.test.ts:37-75`, `client-lifecycle.test.ts:162-195` and the postgres-based conflict/rebind cases near `:250-360`, `logging-policy.test.ts:81-104`) | Behavior removed or changed | Rejection tests; conflict/rebind tests rewritten with SQLite targets; the logging-policy test rewritten on a SQLite memory target (`file::memory:`, so the fake client needs no identity rows) with the same lazy-bind/conflict/rebind logging intent | Keep their lifecycle intent (conflict, rebind, shutdown, logging policy) |

## Return Or Event Spine(s) (If Applicable)

N/A. Failures return through the existing rejection path (`rejectRequest`, `onDiagnostic`).

## Bounded Local / Internal Spines (If Applicable)

The lifecycle state machine is unchanged and not redrawn here (see `DESIGN.md` §E).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| SQLite adapter policy | DS-001/002 | factory in `PrismaClientLifecycle` | path/memory mapping, `timestampFormat: 'unixepoch-ms'` | One home for the data-continuity rule | Grows the 434-line lifecycle file with storage policy |
| Supported-provider rule | DS-001/002 | lifecycle | reject non-SQLite at resolution | Fail before any client exists, same for both entry forms | A check in the factory would give two different codes on the two paths |
| Error catalog | DS-001/002 | lifecycle | new code + safe message | Stable public codes | — |

## Ownership Boundaries

Callers use `client.ts` only. The adapter policy is internal to `src/lib/client/`. Nothing outside `lifecycle.ts` constructs a client or an adapter (tests may, for fixtures). The adapter file must not know lifecycle state.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `PrismaClientLifecycle` (via `client.ts`) | target resolution, adapter policy, readiness | facade, forwarding proxies | other library modules importing `sqlite-driver-adapter.ts` or constructing `PrismaClient` | extend the lifecycle, not callers |

## Dependency Rules

- `lifecycle.ts` -> `sqlite-driver-adapter.ts` -> `@prisma/adapter-better-sqlite3`. `sqlite-driver-adapter.ts` depends only on the target types and the adapter package.
- `datasource-target.ts` -> `initialization-error.ts` (for the stage failure), `database.ts` (provider inference). No dependency on the adapter.
- Forbidden: any other `src/lib` module importing the adapter package; `database.ts` depending on client internals.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `createSqliteDriverAdapter(target: ResolvedDatasourceTarget): PrismaBetterSqlite3` | SQLite connection config | Build the adapter factory for a resolved SQLite target | discriminated `kind` | File: `{ url: target.expectedPath }`; memory: `{ url: ':memory:' }`; options `{ timestampFormat: 'unixepoch-ms' }` |
| `resolveDatasourceTarget(explicitUrl?)` | datasource target | Select and classify; reject non-SQLite | URL string | Throws `InitializationStageFailure('UNSUPPORTED_DATASOURCE_PROVIDER', Error('The selected datasource is not SQLite.'))` (cause has no URL) |
| `PrismaInitializationErrorCode` | public error code | adds `'UNSUPPORTED_DATASOURCE_PROVIDER'` | — | Message: `'repository_prisma supports SQLite datasources only; use a file: URL.'` |
| `initializePrisma(options)` | public | unchanged signature | — | REQ-015 |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `createSqliteDriverAdapter` | Yes | Yes | Low | — |
| `resolveDatasourceTarget` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural | Consistent | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| adapter policy file | `sqlite-driver-adapter.ts` / `createSqliteDriverAdapter` | Yes | Yes (Prisma's term "driver adapter") | Low | — |
| new code | `UNSUPPORTED_DATASOURCE_PROVIDER` | Yes | Matches `WAL_UNSUPPORTED_PROVIDER` / "datasource" wording | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Adapter construction | `src/lib/client/` | Extend (new file in it) | Client construction subsystem |
| Rejection + code | `datasource-target.ts`, `initialization-error.ts` | Extend | Already own classification and codes |
| Generation in toolchain | npm scripts | Extend (`prepare`) | Standard npm hook; avoids touching each workflow |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `src/lib/client/` | target, adapter policy, lifecycle, errors | DS-001/002 | Extend |
| Package/toolchain (`package.json`, `tsup.config.ts`, `scripts/`, `.github/workflows/ci.yml`) | versions, externals, generation, validation | DS-003/004 | Extend |

## Draft File Responsibility Mapping

See Final mapping (no shared structure extraction was needed).

## Reusable Owned Structures Check

| Repeated Structure | Candidate | Decision |
| --- | --- | --- |
| Test seed clients building an adapter (`public-initialization.test.ts` ×2, new DateTime test) | Use `createSqliteDriverAdapter` with a resolved target, or a local test helper | Tests construct `new PrismaClientRuntime({ adapter: new PrismaBetterSqlite3({ url: path }, { timestampFormat: 'unixepoch-ms' }) })` through one helper in the test file. Production code is not exported for tests beyond the existing internal-module imports already used by tests. |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `SqliteFileDatasourceTarget` | Yes | Yes (`clientUrl` removed) | Low | `{ kind, bindingKey, expectedPath }` |
| `SqliteMemoryDatasourceTarget` | Yes | Yes | Low | `{ kind, bindingKey }` |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `src/lib/client/sqlite-driver-adapter.ts` (Add) | client subsystem | SQLite adapter config for a resolved target |
| `src/lib/client/datasource-target.ts` (Modify) | client subsystem | SQLite-only classification; remove `other` and `clientUrl` |
| `src/lib/client/lifecycle.ts` (Modify) | `PrismaClientLifecycle` | factory: `{ adapter: createSqliteDriverAdapter(target), log }` |
| `src/lib/client/initialization-error.ts` (Modify) | error catalog | new code + safe message |

## Applied Patterns (If Any)

Factory (the existing `PrismaClientFactory` seam) with an Adapter (Prisma's driver adapter) built by an owned policy function.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| `src/lib/client/sqlite-driver-adapter.ts` | File (Add) | `createSqliteDriverAdapter` | lifecycle state, logging |
| `src/lib/client/datasource-target.ts` | File (Modify) | as above | adapter imports |
| `src/lib/client/lifecycle.ts` | File (Modify) | factory change only | path/timestamp policy |
| `src/lib/client/initialization-error.ts` | File (Modify) | add code/message | URLs in messages |
| `package.json` | File (Modify) | `peerDependencies`: `@prisma/client ^7.10.1`, `@prisma/adapter-better-sqlite3 ^7.10.1`. `devDependencies`: `prisma ^7.10.1`, `@prisma/client ^7.10.1`, `@prisma/adapter-better-sqlite3 ^7.10.1` (listed explicitly so the repo's own install and lockfile are deterministic, independent of npm's root-peer handling). `scripts.prepare`: `prisma generate`. `engines.node`: `^20.19 \|\| ^22.12 \|\| >=24`. `version` unchanged. | version bump |
| `package-lock.json` | File (Modify) | regenerated by npm; resolves 7.10.1 | — |
| `prisma/schema.prisma` | File (Modify) | drop datasource `url`; add test model `Event { id Int @id @default(autoincrement()); label String; occurredAt DateTime }` for AC-005 | — |
| `tsup.config.ts` | File (Modify) | `external` adds `@prisma/adapter-better-sqlite3` | — |
| `scripts/run-tests.js` | File (Modify) | `db push` without `--skip-generate` | — |
| `scripts/run-package-smoke.js` | File (Modify) | symlink the repo's `node_modules/@prisma/adapter-better-sqlite3` into the consumer (its deps resolve from its real path). Assert `dist/index.{js,mjs}` contain no bundled better-sqlite3 (e.g. no `better_sqlite3.node`/`Dynamic require` marker) and import the adapter as external. Add a declaration assertion for `UNSUPPORTED_DATASOURCE_PROVIDER`. Assert no `*.db?*` file is created by any smoke step. | — |
| `scripts/run-esm-cjs-interop.js` | File (Modify) | make the adapter resolvable for the synthetic consumer (same symlink) | — |
| `.github/workflows/ci.yml` | File (Modify) | remove the `--skip-generate` step and the unused job env | Node change (FU-003) |
| `src/tests/datasource-readiness.test.ts`, `client-lifecycle.test.ts`, `public-initialization.test.ts` | Modify | as Removal plan; seeds via adapter helper | — |
| new tests (in `public-initialization.test.ts` or a new `src/tests/datetime-continuity.test.ts`) | Add | AC-005, AC-004 (no `?` file), AC-008 (explicit + lazy rejection, message has no URL) | — |
| `README.md`, `DESIGN.md`, `CHANGELOG.md` | Modify | REQ-012/015 (see Guidance) | release instructions rewrite |

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `src/lib/client/` | Main-line + owned mechanisms | Yes | Low | Existing layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Factory | `new PrismaClientRuntime({ adapter: createSqliteDriverAdapter(target), log: queryLogLevels(logQueries) })` | `new PrismaBetterSqlite3({ url: target.clientUrl })` | the query string would become part of the filename |
| Adapter policy | `target.kind === 'sqlite-file' ? { url: target.expectedPath } : { url: ':memory:' }`, options `{ timestampFormat: 'unixepoch-ms' }` | default options | DateTime continuity |
| ESM imports | `import PrismaClientPackage from '@prisma/client'` (keep 1.0.10 default namespace); `import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'` (real ESM package) | named imports from `@prisma/client` | 1.0.10 interop |
| Consumer README setup | `npm install repository_prisma` + `npm install -D prisma`; schema `generator client { provider = "prisma-client-js" }` and `datasource db { provider = "sqlite" }`; `prisma.config.ts` with `datasource.url`; code unchanged: `await initializePrisma({ datasourceUrl: 'file:./app.db' })` | asking consumers to build adapters | REQ-015 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep Prisma 5 support (dual peer `^5 \|\| ^7`, two construction paths) | Smooth transition | Rejected | Prisma 5 users stay on 1.0.x |
| Translate `connection_limit`/`socket_timeout` into adapter options | Preserve URL params | Rejected | Ignored, documented |
| Keep `other` kind with a stub client | Preserve non-SQLite "support" | Rejected | Clear rejection code |
| ISO-8601 default with read fallback | Prisma's default | Rejected (breaks filters) | `unixepoch-ms` |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. Manifest: update `package.json` (peers, dev, `prepare`, `engines`), run `npm install` to regenerate `package-lock.json`, and verify `npm ls prisma @prisma/client @prisma/adapter-better-sqlite3` shows 7.10.1.
2. Schema: drop `url`, add the `Event` test model. Then `npx prisma generate`.
3. Runtime: add `sqlite-driver-adapter.ts`; tighten `datasource-target.ts` (reject non-SQLite, drop `other`/`clientUrl`); add the error code; switch the factory.
4. Toolchain: `run-tests.js`, `tsup.config.ts`, smoke/interop scripts, `ci.yml`.
5. Tests: update and add per the Removal plan and AC-004/005/008. The suite must be green.
6. Docs: README, DESIGN, CHANGELOG.
7. Evidence: fresh `rm -rf node_modules && npm ci` (proves `prepare`), then `npm run typecheck`, `npm test`, `npm run build`, `npm run test:package`, `git diff --check`, logged into the ticket folder.

## Key Tradeoffs

- Peer vs dependency for the adapter: a peer keeps the version lockstep with the consumer's `@prisma/client` and leaves native-build control with the consumer. npm/pnpm install it automatically, so the install stays one command.
- SQLite only: smaller, honest contract versus losing an untested capability. FU-004 can add injection later without breaking anything.
- `prepare` vs editing each workflow: one hook covers local, CI and release.

## Risks

- RSK-002 native addon on consumer platforms (Electron/Linux ARM64). Documented in the README; consumer upgrade is FU-001.
- better-sqlite3 uses one connection per client (Prisma 5 used an engine pool). The tests and probes pass, including interactive transactions. A consumer with heavy concurrent reads may see different throughput; this is outside the library's contract.
- npm `latest` = 8.0 RC: caret ranges `^7.10.1` exclude it; README tells consumers to install `prisma@7`.

## Guidance For Implementation

- Reproduction to start from: install 7.10.1 and run `npm test`. Construction fails with `Unknown property datasourceUrl` (`probes/construct-options.cjs`); `probes/datetime-continuity-read.mjs` shows the format regression that AC-005 must guard.
- AC-005 test shape: on a fresh temp file DB, create the `"Event"` table by raw SQL matching what `db push` produces (`"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "label" TEXT NOT NULL, "occurredAt" DATETIME NOT NULL`), as the existing tests do for `User`. Initialize the library on that file and insert a row through raw SQL with `occurredAt` as an INTEGER ms value (the Prisma-5 representation). Create a second row through the library's root client. Assert `typeof(occurredAt)` = `integer` for both, and that `findMany({ where: { occurredAt: { gt: <earlier date> } } })` returns both.
- AC-004: extend the existing query-parameter tests to assert that no file whose name contains `?` exists in the directory.
- AC-008 test plan (all expect `UNSUPPORTED_DATASOURCE_PROVIDER`; message/`String(error)` contains neither `secret` nor the host; the client factory is never called):
  1. Explicit `initializePrisma({ datasourceUrl: 'postgresql://user:secret@host/db' })` from `idle`; the lifecycle is then `failed`.
  2. The same with `enableWAL: true`. This replaces the `postgresql://` row of `client-lifecycle.test.ts:162-178`, which expected `WAL_UNSUPPORTED_PROVIDER`; the memory rows of that test stay as they are.
  3. A SQLite client is bound (lazy and ready), then `initialize` is called with a postgres URL. This replaces the former `DATASOURCE_CONFLICT` expectation. Afterwards `getClientForOperation()` still returns the bound client.
  4. Lazy: with `DATABASE_URL` set to a postgres URL, the first `getClientForOperation()` / `rootPrismaClient` operation throws the same code.
  5. While `shutting-down`, `initialize` with a postgres URL still rejects `CLIENT_NOT_READY` (ordering unchanged).
- AC-012: API/E2E validates with a real install of the packed tarball in an empty consumer **without** `--legacy-peer-deps` (npm resolves both peers), plus `prisma generate` and a minimal `initializePrisma` + query.
- README sentences that become false must be rewritten, not only extended:
  - "The selected value is always passed explicitly to the root `PrismaClient`" -> the library opens the selected SQLite file through its driver adapter.
  - "Query parameters are preserved" -> query parameters are kept for target identity, but they do not change the opened file and have no effect on the connection.
  - "This behavior-only release does not change the Prisma schema..." -> remove it or restate it for this change: no schema or data change; the DateTime representation is kept.
  - The WAL sentence "not supported for non-SQLite or SQLite in-memory targets" -> non-SQLite is not supported at all (`UNSUPPORTED_DATASOURCE_PROVIDER`); WAL is unsupported for in-memory targets.
  - The `PRISMA_DATASOURCE_PROVIDER=sqlite|postgresql|mysql` hint -> keep the filter helpers documented, but state that the library's client supports SQLite only.
- README content (REQ-012/015): a short "Requirements and setup (Prisma 7)" section near the top with copy-paste snippets. It covers: SQLite only; dates stored as integers, with a warning to use `timestampFormat: 'unixepoch-ms'` for any other Prisma 7 client on the same database; URL query parameters no longer affect the connection; Node/TS minimums; the new error code in the code list; Prisma 5 users stay on 1.0.x. Update the "ESM and CommonJS Package Loading" paragraph that says no peer change is required. Leave the release section's version-specific text for the release decision, but remove the claim that it is "this already-versioned 1.0.10 release" only if it becomes misleading. Keep that edit minimal.
- CHANGELOG: `## Unreleased` with a "Breaking" note: requires a major release.
- DESIGN.md: update §E (adapter construction, SQLite-only invariant, timestamp format rationale), §Package ESM/CommonJS Boundary (adapter external peer), and the FAQ engine sentence.
