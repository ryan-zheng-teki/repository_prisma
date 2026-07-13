# Explicit Datasource and Strict SQLite WAL Readiness — Requirements

## Status

`Draft` — bootstrapped on 2026-07-13 for a separate software-engineering team. The reported behavior is confirmed in current source and disposable execution; final API/compatibility scope remains for that team to refine and approve.

## Goal / Problem Statement

Make `repository_prisma` initialization use one explicit database target and report SQLite WAL readiness truthfully and safely. Today `getDatabaseUrl()` can select `DATABASE_URL_TEST` while the lazily created generated Prisma Client still reads `DATABASE_URL`, and `initializePrisma({ enableWAL: true })` catches a WAL error, prints the raw error, and resolves. Consumers therefore cannot treat initialization success as proof that the selected database was opened or that WAL is active.

## Investigation Findings

Source and disposable runtime evidence at `origin/main` commit `cc58bca56f561f828d7afc16b7892cc9231c5030` confirms both defects:

- With `NODE_ENV=test`, `DATABASE_URL=A`, and `DATABASE_URL_TEST=B`, `getDatabaseUrl()` selected B while `initializePrisma()` and the root proxy opened A; only `a.db` was created.
- Against a read-only SQLite database in `delete` journal mode, the WAL PRAGMA failed, Prisma printed a raw error, `console.warn` received the raw error/stack, `initializePrisma()` still resolved, and the effective mode remained `delete`.
- Accessing the root proxy before initialization pins its first datasource even if the environment changes before `initializePrisma()`.
- The current full suite, typecheck, and build pass, demonstrating that these cases are coverage gaps rather than already-detected failures.

## Supplemental Solution Artifacts

None.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change` for initialization failure semantics.
- Initial design issue signal: `Yes`.
- Root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor posture: `Likely Needed`.
- Evidence basis: URL selection and Prisma Client construction are separate policies; WAL activation is documented as optional/best-effort while callers may require readiness.
- Requirement or scope impact: Preserve repository/transaction APIs while defining a single initialization authority and backward-compatible or deliberately versioned strict behavior.

## Recommendations

1. Treat one explicit datasource as the initialization identity rather than assuming `getDatabaseUrl()` and generated-client environment resolution are equivalent.
2. Provide an explicit strict SQLite readiness contract that verifies the opened database and WAL mode, disconnects on failure, and never logs a raw provider error by default.
3. Preserve lazy construction and repository/ALS behavior unless investigation proves a clean API replacement is required.
4. Add focused CJS/ESM and generated-client tests before release.

## Scope Classification

`Medium`.

## In-Scope Use Cases

- `UC-RP-001` — Initialize repositories against an explicitly selected datasource.
- `UC-RP-002` — Enable and verify SQLite WAL when strict readiness is requested.
- `UC-RP-003` — Fail initialization safely when connection, database identity, or WAL readiness fails.
- `UC-RP-004` — Shut down and reinitialize without stale client identity.

## Out of Scope

- Application-specific migration orchestration or process locking.
- Prisma schema migration, baselining, `db push`, or release of an application database.
- Authentication-specific logging or policy.
- Supporting arbitrary database URL canonicalization rules inside this generic library unless required for an explicit identity API.

## Functional Requirements

- `REQ-RP-001` — Initialization MUST provide one authoritative datasource identity to the Prisma Client used by repositories and transactions; `DATABASE_URL_TEST` selection MUST NOT silently diverge from the connected client.
- `REQ-RP-002` — Existing repository, proxy, decorator, and implicit-transaction callers MUST continue to resolve the same initialized root client.
- `REQ-RP-003` — When strict SQLite WAL readiness is requested, initialization MUST verify that the actual main database matches the expected target and that the effective journal mode is `wal` before resolving.
- `REQ-RP-004` — Connection, identity, or WAL activation/verification failure MUST reject initialization and MUST clean up an unpublished or unusable client.
- `REQ-RP-005` — Library code MUST NOT print raw caught Prisma/SQLite errors, datasource URLs, or filesystem paths as an implicit side effect of initialization failure; failures MUST expose a stable safe classification while preserving an intentional diagnostic mechanism if approved.
- `REQ-RP-006` — Shutdown MUST disconnect the active client and clear lifecycle state so a later initialization cannot remain pinned to the earlier datasource.
- `REQ-RP-007` — The public API, README, DESIGN, build output, and package version/release notes MUST describe the chosen compatibility and strictness semantics consistently.

## Acceptance Criteria

- `AC-RP-001` — With `NODE_ENV=test`, `DATABASE_URL` naming A, and `DATABASE_URL_TEST` naming B, initialization using the selected/explicit target opens B; repository operations, transactions, and a database-identity query all use B and A is untouched.
- `AC-RP-002` — Absolute and relative SQLite test fixtures prove the expected and actual `main` database identity match without emitting the datasource or resolved filesystem path in default logs.
- `AC-RP-003` — Strict WAL initialization sets WAL, re-queries it as `wal`, and resolves only after verification.
- `AC-RP-004` — An injected WAL activation or verification failure rejects, disconnects the candidate, exposes only a stable safe error classification, and emits no raw error/path through `console`.
- `AC-RP-005` — A connection or database-identity mismatch rejects without publishing a usable root client; subsequent repository/transaction access cannot silently continue.
- `AC-RP-006` — After shutdown, reinitializing with a different explicit datasource uses the new database rather than the engine identity from the prior connection.
- `AC-RP-007` — Existing repository CRUD, proxy, nested transaction, decorator, provider-detection, ESM, and CJS coverage remains green.
- `AC-RP-008` — Built `dist/index.js`, `dist/index.mjs`, and declarations expose equivalent behavior/types; a packed-package smoke test proves the published artifact rather than only TypeScript source.

## Constraints / Dependencies

- Current base: `repository_prisma` package version `1.0.7` on `origin/main`; npm `latest` and the newest git tag are both `1.0.6`, so 1.0.7 is currently untagged/unpublished.
- Peer dependency: `@prisma/client ^5.22.0`; development Prisma version is 5.22.x.
- README.md is the primary usage/release guide; DESIGN.md owns architecture/rationale.
- Releases are tag-based per repository instructions.
- The downstream team must decide whether the behavior is a compatible 1.0.x extension or requires a larger version boundary after auditing consumers.

## Persisted Data Outcome

- Stored subject / location: Consumer-owned databases; the library itself owns no persisted rows.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all consumer database content; this ticket changes connection/readiness behavior only.
- Unacceptable data loss or corruption: Connecting to, writing, or changing journal mode on the wrong database; reset, migration, or destructive SQL.
- Relevant availability, maintenance-window, or rollout constraints: Consumers must update and verify initialization before adopting the new release; no database rewrite is required.
- Related requirement and acceptance-criteria IDs: `REQ-RP-001`–`006`; `AC-RP-001`–`006`.

## Assumptions

- A generic library can require an explicit datasource/expected identity only for strict initialization while keeping normal repository operations database-agnostic.
- No caller should depend on raw `console.warn` output as a stable API.

## Risks / Open Questions

- Exact public API shape and compatibility behavior require downstream design and consumer audit.
- Root-client proxy access before initialization may create a client before the strict owner can configure it; the design must either prevent, detect, or document this path.
- Non-SQLite consumers must not be forced through SQLite PRAGMA behavior.
- The currently committed version `1.0.7` may not yet be tagged/published; release state must be verified by the downstream team.

## Requirement-To-Use-Case Coverage

| Requirement | UC-RP-001 | UC-RP-002 | UC-RP-003 | UC-RP-004 |
| --- | --- | --- | --- | --- |
| `REQ-RP-001`–`002` | Yes |  |  | Yes |
| `REQ-RP-003` |  | Yes | Yes |  |
| `REQ-RP-004`–`005` |  | Yes | Yes | Yes |
| `REQ-RP-006` | Yes |  | Yes | Yes |
| `REQ-RP-007` | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-RP-001`–`002` | Datasource-selection and actual-file identity scenarios |
| `AC-RP-003`–`005` | Strict WAL/connect/identity success and fail-closed scenarios |
| `AC-RP-006` | Shutdown and different-datasource reinitialization |
| `AC-RP-007`–`008` | Regression, module-format, dist, and packed-artifact scenarios |

## Approval Status

`Not yet presented for approval.` This is a bootstrap artifact for the separate team; that team owns requirement refinement, design, review, implementation, release, and publication.
