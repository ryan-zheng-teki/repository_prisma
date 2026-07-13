# Explicit Datasource and Strict SQLite WAL Readiness — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — the reported defects are confirmed, the recommended public behavior follows the repository's established API posture and the shared design principles, and the user approved this requirements basis on 2026-07-13 conditional on best-practice design.

## Goal / Problem Statement

Make every `repository_prisma` root-client path bind to one authoritative datasource target, and make `initializePrisma({ enableWAL: true })` a truthful fail-closed SQLite readiness boundary. Today `getDatabaseUrl()` can select `DATABASE_URL_TEST` while the generated Prisma Client independently opens `DATABASE_URL`; WAL activation errors are both raw-logged and swallowed. Initialization can therefore resolve even though it opened the wrong database or SQLite remains in `delete` journal mode.

## Investigation Findings

The problem is true at `origin/main` commit `cc58bca56f561f828d7afc16b7892cc9231c5030`:

- With `NODE_ENV=test`, `DATABASE_URL=A`, and `DATABASE_URL_TEST=B`, `getDatabaseUrl()` selected B while `initializePrisma()` and the root proxy opened A. Only `a.db` was created.
- Against a read-only SQLite database in `delete` journal mode, the WAL PRAGMA failed, Prisma emitted a raw provider error, the library passed the raw error to `console.warn`, `initializePrisma()` resolved, and the effective mode stayed `delete`.
- Root-proxy access before initialization pins the first generated-client datasource even if the environment changes before `initializePrisma()`.
- A root method captured while bound to A remains bound to the disconnected A client after shutdown and reinitialization on B; invoking it reconnects A while the current root proxy uses B. Invocation-time forwarding is therefore required to make the lifecycle boundary authoritative.
- `new PrismaClient({ datasourceUrl })` in the installed Prisma 5.22 client overrides the schema environment target and opened the requested B database in a disposable probe.
- Prisma resolves an unmodified relative SQLite URL against its generated schema location, not `process.cwd()`. Deterministic library-owned identity checking therefore requires the library to define and normalize its own relative-path base.
- Current tests, typecheck, and CJS/ESM/declaration builds pass, proving these are uncovered behavior gaps rather than failures already guarded by the suite.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/explicit-datasource-strict-wal-readiness/initialization-api-contract.md` | Public initialization, lifecycle, readiness, diagnostic, and error contract | `REQ-RP-001`–`REQ-RP-010` | `AC-RP-001`–`AC-RP-013` | `Approved by user — 2026-07-13` | Clarifies the externally observable API and lifecycle semantics required here; it supplements but does not replace these requirements. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor posture: `Likely Needed`.
- Evidence basis: datasource selection and client construction are separate authorities; lazy root access can bypass later configuration; connection, SQLite identity, WAL verification, failure cleanup, and diagnostic policy are mixed in one function without a fail-closed lifecycle state.
- Requirement or scope impact: centralize client construction and lifecycle authority while preserving repository, proxy, decorator, and ALS transaction boundaries. Extract SQLite-specific readiness work behind that lifecycle owner rather than expanding generic repository paths.

## Recommendations

1. Add an optional explicit `datasourceUrl` to `initializePrisma`; when omitted, resolve the existing `getDatabaseUrl()` precedence once and pass that effective value explicitly to `PrismaClient`.
2. Preserve optional lazy root access for current consumers, but route it through the same target resolver and record the bound target. Reject an attempted target change until shutdown rather than silently switching or continuing.
3. Make the existing `enableWAL: true` flag strict: connect, verify SQLite `main` identity, activate WAL, re-query the effective mode, and resolve only when it is `wal`.
4. Define relative SQLite URLs as `process.cwd()`-relative, normalize them to an absolute file URL before client construction, and compare canonical physical paths after connection.
5. Replace raw console/provider-error emission during initialization with a stable exported error code and an explicitly opt-in diagnostic callback carrying the original cause.
6. Keep the published surface small: no second best-effort WAL mode, compatibility wrapper, alternate client singleton, or application-specific migration/startup policy.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the source surface is compact, but the change affects public initialization semantics, client lifecycle state, datasource identity, provider-specific readiness, safe diagnostics, both module formats, durable coverage, and primary project documentation.

## In-Scope Use Cases

- `UC-RP-001` — Initialize repositories against an explicit or deterministically selected datasource.
- `UC-RP-002` — Use repository, proxy, decorator, and transaction paths against the same root-client identity.
- `UC-RP-003` — Enable and verify strict SQLite WAL readiness.
- `UC-RP-004` — Fail initialization safely without publishing or silently recreating an unusable client.
- `UC-RP-005` — Shut down and reinitialize against a different datasource without stale identity.
- `UC-RP-006` — Consume equivalent CJS, ESM, declaration, and packed-package behavior.

## Out of Scope

- Prisma schema/model changes, application data migrations, `db push`, migration baselining, or destructive database operations.
- Application-specific startup ordering, inter-process locking, deployment orchestration, or health-endpoint design.
- Upgrading Prisma or other dependencies, or remediating unrelated npm audit findings.
- Redesigning repository CRUD, decorators, ALS transaction propagation, case-insensitive filter helpers, or model-name typing.
- General query/info/warn logging policy outside what is necessary to prevent raw initialization failures from being emitted by default.
- Publishing, tagging, or deploying a release in this ticket without a later explicit user instruction. README and DESIGN behavior documentation remain in scope.
- Supporting strict WAL for SQLite in-memory databases; WAL requires a physical main database.

## Functional Requirements

- `REQ-RP-001` — One lifecycle owner MUST resolve, normalize, bind, and retain the authoritative datasource identity used to construct the root Prisma Client. No root-client path may independently fall back to generated-client environment resolution.
- `REQ-RP-002` — `initializePrisma` MUST accept an optional explicit `datasourceUrl`. A non-empty explicit value MUST win; otherwise the existing `getDatabaseUrl()` precedence MUST be resolved once. A missing effective value MUST fail with a stable safe classification before client construction.
- `REQ-RP-003` — Relative physical SQLite `file:` URLs MUST be normalized against `process.cwd()` to an absolute file URL before client construction. Absolute URLs and supported query parameters MUST remain usable. Strict WAL on SQLite in-memory targets MUST reject as unsupported.
- `REQ-RP-004` — Existing repository, `prisma` proxy, `rootPrismaClient` proxy, decorator, higher-order transaction, and `getPrismaClient()` paths MUST converge on the lifecycle owner's bound root client. Lazy use without an earlier explicit initialization remains supported through the same resolver.
- `REQ-RP-005` — `initializePrisma` MUST resolve only after the effective client connects successfully. For every physical SQLite initialization, it MUST verify that `PRAGMA database_list` reports a `main` database whose canonical path matches the normalized target.
- `REQ-RP-006` — `enableWAL: true` MUST mean strict readiness. It MUST be accepted only for a physical SQLite target, activate WAL, and verify a subsequent effective journal-mode read equals `wal` before initialization resolves. There MUST be no retained best-effort WAL branch.
- `REQ-RP-007` — Connection, target-conflict, identity, WAL activation, or WAL verification failure MUST reject with an exported stable safe error code, disconnect any candidate or invalidated root client as applicable, and prevent repository/transaction access from silently continuing after a failed readiness attempt. A corrected initialization retry or shutdown MUST provide an explicit recovery boundary.
- `REQ-RP-008` — Initialization MUST NOT implicitly print raw caught Prisma/SQLite errors, datasource URLs, credentials, or filesystem paths. The public error message MUST be safe and stable; raw cause access, if needed, MUST occur only through the caller-supplied diagnostic callback defined in the linked contract.
- `REQ-RP-009` — While a root client is bound, initialization with a different normalized datasource MUST reject rather than switch targets. `shutdownPrisma` MUST disconnect the active client when present and clear target, readiness, failure, and in-flight lifecycle state so a later initialization can bind a different datasource.
- `REQ-RP-010` — README.md, DESIGN.md, exports, generated CJS/ESM declarations, and packed-package behavior MUST describe and expose the same initialization, WAL, relative-path, failure, diagnostic, and recovery semantics. Release publication remains a separately authorized tag-based action.

## Acceptance Criteria

- `AC-RP-001` — With `NODE_ENV=test`, `DATABASE_URL` naming A, and `DATABASE_URL_TEST` naming B, `initializePrisma()` opens B; a `PRAGMA database_list` identity query reports B and A remains untouched.
- `AC-RP-002` — With both environment variables set, `initializePrisma({ datasourceUrl: C })` opens C and neither A nor B is touched.
- `AC-RP-003` — A relative physical SQLite URL is normalized against the child process's `process.cwd()`, the client opens that absolute target, and the verified `main` identity matches without exposing either path in default logs.
- `AC-RP-004` — Repository CRUD, the context-aware `prisma` proxy, `rootPrismaClient`, `getPrismaClient()`, decorator transactions, higher-order transactions, and nested transaction reuse all operate on the same selected root database. Public proxy method/delegate handles resolve the current lifecycle/ALS client when invoked rather than retaining a raw stale client across initialization, failure, transaction, or shutdown boundaries.
- `AC-RP-005` — `initializePrisma({ enableWAL: true })` on writable physical SQLite sets WAL, re-queries it as `wal`, and resolves only after both identity and journal-mode verification.
- `AC-RP-006` — A deterministic WAL activation or verification failure rejects with the documented stable code, disconnects and blocks silent root/repository reuse, leaves the database non-WAL, and emits no raw provider error, datasource URL, or path through default `console` output.
- `AC-RP-007` — When an opt-in diagnostic callback is supplied for the same failure, it is invoked with the stable stage/code and original cause; the callback data is not copied into the safe public error message or default logs.
- `AC-RP-008` — A connection failure and a forced database-identity mismatch each reject with their distinct stable codes, do not publish a usable root client, and allow a later corrected initialization to succeed only through the defined recovery path.
- `AC-RP-009` — If lazy proxy access binds A first, initialization requesting B rejects with a target-conflict code and does not open B. After shutdown, initializing B succeeds and all root paths use B.
- `AC-RP-010` — After any successful initialization and shutdown, reinitializing with a different target uses the new database; no engine, URL, readiness, or failure state from the prior client remains authoritative.
- `AC-RP-011` — For a non-SQLite datasource, initialization without WAL performs no SQLite PRAGMA; requesting WAL rejects with the unsupported-provider code and does not attempt WAL SQL.
- `AC-RP-012` — Existing provider detection, case-insensitive filter behavior, CRUD, proxy, decorator, transaction, and nested-transaction coverage remains valid unless the downstream coverage investigation proves a test stale under this approved contract.
- `AC-RP-013` — Typecheck and build pass; built CJS and ESM entrypoints plus declarations expose equivalent option, error, and diagnostic types; a packed-package smoke scenario exercises the shipped artifact rather than only TypeScript source.

## Constraints / Dependencies

- Dedicated task worktree: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness` on `codex/explicit-datasource-strict-wal-readiness`.
- Reviewed base: `origin/main` at `cc58bca56f561f828d7afc16b7892cc9231c5030`, refreshed 2026-07-13.
- Package source version: `1.0.7`; npm `latest` and newest tag were `1.0.6` during bootstrap investigation. No release is authorized by this request.
- Peer dependency: `@prisma/client ^5.22.0`; installed generated client types explicitly support `PrismaClient({ datasourceUrl })`.
- README.md is the primary usage/release guide; DESIGN.md owns architecture and rationale.
- Releases are tag-based per AGENTS.md and README.md.
- The library cannot own, inspect, migrate, or delete consumer application data beyond non-destructive readiness PRAGMAs.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Consumer-owned databases; the library owns no persisted rows or schema ledger.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all consumer database content directly; this ticket changes connection and readiness behavior only.
- Unacceptable data loss or corruption: Opening, writing, or changing journal mode on the wrong database; reset, schema migration, destructive SQL, or silent use after failed readiness.
- Relevant availability, maintenance-window, or rollout constraints: Consumers adopting strict WAL must provide a writable physical SQLite database and handle initialization rejection before serving traffic. No data rewrite or maintenance migration is required.
- Related requirement and acceptance-criteria IDs: `REQ-RP-001`–`REQ-RP-009`; `AC-RP-001`–`AC-RP-011`.

## Assumptions

- Preserving lazy root access is the least disruptive compatible fix; consumers that need startup proof will call `initializePrisma` explicitly.
- Tightening existing `enableWAL: true` from best-effort to strict matches its documented intent better than adding a second legacy/best-effort flag.
- `process.cwd()` is an understandable, deterministic base for relative file targets and can be documented and tested in child processes.
- Exact normalized URL equality is sufficient to detect an attempted target change for non-SQLite providers; portable physical identity queries are required only for SQLite.
- An explicit callback is an acceptable opt-in boundary for raw diagnostic causes; default public errors must remain safe.

## Risks / Open Questions

- Approved compatibility posture: optional lazy access plus optional explicit `datasourceUrl`, rather than a breaking mandatory-initialization API.
- Approved WAL posture: `enableWAL: true` is strict, with no best-effort compatibility flag.
- Approved identity/diagnostic posture: relative SQLite paths use `process.cwd()` and raw causes are available only through the opt-in diagnostic callback.
- Prisma's internal representation of database paths can differ by platform or symlink spelling; implementation must canonicalize both expected and actual paths without logging them.
- Concurrent initialize/shutdown calls and access during initialization require a small explicit lifecycle state machine; the design must prevent a candidate from being exposed before readiness.
- The active local AutoByteus workspace declares `repository_prisma@^1.0.6` but no runtime source import was found outside a logging-policy test. Public npm consumers remain unobservable, so documentation and release notes must call out tightened WAL failure semantics.

## Requirement-To-Use-Case Coverage

| Requirement | UC-RP-001 | UC-RP-002 | UC-RP-003 | UC-RP-004 | UC-RP-005 | UC-RP-006 |
| --- | --- | --- | --- | --- | --- | --- |
| `REQ-RP-001`–`REQ-RP-003` | Yes | Yes | Yes | Yes | Yes |  |
| `REQ-RP-004` | Yes | Yes |  | Yes | Yes | Yes |
| `REQ-RP-005` | Yes | Yes | Yes | Yes | Yes | Yes |
| `REQ-RP-006` |  |  | Yes | Yes |  | Yes |
| `REQ-RP-007`–`REQ-RP-009` | Yes | Yes | Yes | Yes | Yes | Yes |
| `REQ-RP-010` | Yes | Yes | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-RP-001`–`AC-RP-003` | Environment selection, explicit override, relative target normalization, and actual SQLite identity |
| `AC-RP-004` | Root-client convergence across repository/proxy/transaction surfaces |
| `AC-RP-005`–`AC-RP-008` | Strict WAL/identity success, deterministic failure, safe diagnostics, fail-closed state, and recovery |
| `AC-RP-009`–`AC-RP-010` | Pre-access conflict plus shutdown/rebind lifecycle |
| `AC-RP-011` | Non-SQLite provider isolation |
| `AC-RP-012`–`AC-RP-013` | Regression validity, source/build parity, module formats, declarations, and packed artifact |

## Approval Status

`Approved by user on 2026-07-13`, conditional on following best practices. The design applies the shared solution-design principles: one authoritative lifecycle boundary, a named bounded state machine, explicit datasource identity, provider-specific readiness off the primary spine, revocable forwarding proxies instead of leaked stale client handles, safe errors, and no compatibility-only WAL path.
