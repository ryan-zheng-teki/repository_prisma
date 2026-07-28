# Requirements Doc

## Status

`Refined` — approved by the user on 2026-07-28 for implementation and completion before the dependent backend refactor resumes.

## Goal / Problem Statement

Extend `repository_prisma.runInTransaction` so application-owned transaction settings can be passed to Prisma when the library opens an outer interactive transaction, without weakening the library's existing implicit transaction routing, nested-transaction reuse, type safety, or one-argument caller behavior.

This is the prerequisite ticket for the later AutoByteus token-statistics and secret-vault repository refactor. It is intentionally completed and released independently before the backend ticket resumes.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | `runInTransaction(callback)` opens a Prisma interactive transaction when no transaction is active, binds its client through AsyncLocalStorage, and lets context-aware repositories share it. The API accepts no Prisma transaction settings. | A caller may optionally provide typed interactive-transaction settings; the library forwards them unchanged to Prisma when opening the outer transaction. | Calls without settings retain current compile/runtime behavior, commit/rollback behavior, context routing, and return/error propagation. | `REQ-001`–`REQ-003`; `AC-001`–`AC-004` |
| `BEH-002` | A nested `runInTransaction` call detects the active AsyncLocalStorage transaction and reuses it rather than opening a second transaction. | Nested calls continue to reuse the active transaction. Any settings supplied to a nested call do not open/reconfigure a transaction; the outer transaction's settings remain authoritative. | One transaction, one commit/rollback boundary, and existing nested-call behavior remain unchanged. | `REQ-002`, `REQ-004`; `AC-003`, `AC-005` |
| `BEH-003` | The package publishes tag-based releases with built ESM/CommonJS/type artifacts and documents the existing HOF API. | The new options API and nested-options rule are documented, covered in source/package tests, versioned, and published as the next normal package release. | Import safety, datasource lifecycle, logging policy, BaseRepository, decorator API, Prisma peer range, and release process remain unchanged. | `REQ-005`–`REQ-007`; `AC-006`–`AC-009` |

## Investigation Findings

1. `src/lib/context.ts` currently defines `runInTransaction<T>(callback)` and invokes `rootPrismaClient.$transaction(callback)` without the optional second argument supported by Prisma.
2. The consumer-generated Prisma 5.22 interactive transaction overload accepts `{ maxWait?, timeout?, isolationLevel? }`.
3. Existing nested behavior deliberately flattens nested transactions by reusing the AsyncLocalStorage transaction client.
4. The clean API extension is one optional typed second argument on the existing HOF; a new parallel HOF or compatibility wrapper is unnecessary.
5. No database schema, migration, datasource, stored-data, or client-lifecycle change is required.

## Relevant Supplemental Task Artifacts

None. The focused behavior is fully defined in this requirements document; design structure will be captured in `design-spec.md` after approval.

## Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Initial design issue signal: `No`
- Root cause classification: `No Design Issue Found`
- Refactor posture: `Likely Not Needed`
- Evidence basis: `runInTransaction` is already the correct authoritative transaction boundary. It only lacks a proportionate argument needed to expose Prisma's existing outer-transaction settings.
- Requirement or scope impact: Extend the existing owner directly; do not add another transaction abstraction, expose AsyncLocalStorage internals, or redesign client lifecycle.

## Recommendations

Add an exported, repository-prisma-owned options type aligned with Prisma's interactive transaction settings and an optional second `runInTransaction` argument. Forward it only when opening the outer transaction. Preserve the current nested reuse rule and document that outer settings govern nested calls.

## Scope Classification

`Small`

The source change is localized, but package/type/runtime tests, documentation, built-package smoke, versioning, and publication remain mandatory because it is a public library API.

## In-Scope Use Cases

- `UC-001` Call `runInTransaction(callback)` exactly as existing consumers do.
- `UC-002` Call `runInTransaction(callback, { maxWait, timeout, isolationLevel? })` and have Prisma receive those settings on the outer interactive transaction.
- `UC-003` Call `runInTransaction` inside an active transaction and reuse the outer transaction without starting or reconfiguring another transaction.
- `UC-004` Commit successful multi-repository work and roll back all work when the callback throws.
- `UC-005` Consume the API from the built ESM, CommonJS, and TypeScript package surfaces.

## Out of Scope

- The downstream AutoByteus backend repository refactor.
- Changes to `Transactional()` decorator parameters.
- A new transaction HOF, alias, wrapper, or dual API path.
- Transaction retry, propagation modes, savepoints, nested physical transactions, cancellation, or application-level deadline policy.
- Prisma ORM/client upgrades or peer-range changes.
- Datasource initialization, WAL, logging, schema, migration, or stored-data changes.

## Functional Requirements

- `REQ-001` `runInTransaction` must retain its callback as the first required argument and accept one optional second argument containing Prisma interactive-transaction settings supported by the current peer contract: optional `maxWait`, `timeout`, and `isolationLevel`.
- `REQ-002` When no transaction is active, `runInTransaction` must pass the settings unchanged as Prisma `$transaction`'s second argument while binding the callback transaction client into the existing AsyncLocalStorage context.
- `REQ-003` Omitting the settings argument must preserve the current public signature compatibility, runtime defaults, return value, thrown error, commit, rollback, and repository context behavior.
- `REQ-004` When a transaction is already active, `runInTransaction` must reuse that transaction and must not open another transaction or apply nested settings. The outer transaction's settings are authoritative.
- `REQ-005` The options type must be exported from the package root and remain tied to interactive transaction settings rather than array/batch `$transaction` overloads.
- `REQ-006` README, DESIGN, examples where useful, CHANGELOG, and package type surfaces must document the optional settings and the nested outer-authority rule without implying that repository-prisma implements its own timers.
- `REQ-007` The change must be released as the next normal tag-based package version with no local patch, compatibility wrapper, or retained alternate implementation.

## Acceptance Criteria

- `AC-001` Type coverage accepts valid `maxWait`, `timeout`, and supported `isolationLevel` settings and rejects unrelated keys or invalid value types.
- `AC-002` A focused outer-transaction test proves the exact supplied settings reach Prisma `$transaction` once and all repository operations use its AsyncLocalStorage transaction client.
- `AC-003` Existing no-options tests continue to pass unchanged and prove the library still uses Prisma defaults when settings are omitted.
- `AC-004` Integration coverage proves successful callbacks commit and thrown failures roll back multi-repository work when options are supplied.
- `AC-005` Nested coverage proves one physical transaction is opened, the inner callback uses the same transaction client, inner settings do not replace outer settings, and the outer boundary owns commit/rollback.
- `AC-006` Existing import safety, lifecycle/readiness, forwarding proxy, logging, datasource, and BaseRepository suites remain green.
- `AC-007` ESM, CommonJS, and emitted declaration package smoke proves the options type/API are usable from the published package surface.
- `AC-008` Source and built-artifact review finds no duplicate HOF, compatibility alias, direct timer implementation, retry behavior, nested physical transaction, or unrelated lifecycle change.
- `AC-009` The next package version is tagged/published through the existing release flow and its metadata retains the current Prisma peer contract.

## Constraints / Dependencies

- Authoritative repository worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/repository-prisma-transaction-options`.
- Task branch: `codex/transaction-options`, based on refreshed `origin/main` commit `715e4558ddc6ef6907c1f0055d261a8766ff20c6`.
- Current package version: `1.0.8`; release is tag-based.
- Current peer dependency: `@prisma/client:^5.22.0`.
- The downstream server ticket remains paused until this package ticket is delivered and the normal published dependency is available.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: No repository-owned data is changed.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: None.
- Unacceptable data loss or corruption: Any consumer transaction behavior regression that could partially commit work previously rolled back.
- Relevant availability, maintenance-window, or rollout constraints: None for data; package publication must precede downstream consumption.
- Related requirement and acceptance-criteria IDs: `REQ-002`–`REQ-004`; `AC-002`–`AC-006`.

## Assumptions

- The library should expose Prisma's existing interactive transaction settings rather than inventing repository-prisma-specific timeout semantics.
- Nested calls cannot safely change an already-open Prisma transaction, so outer settings must govern.
- The repository's established 1.0.x release convention makes `1.0.9` the expected next tag and package version; delivery must still verify that the tag is free and the tracked remote is current before finalization.

## Risks / Open Questions

- The emitted public options type must work across the supported Prisma peer range; design should avoid coupling to an unstable generated-client overload extraction if an explicit tight type is safer.
- Tests must distinguish outer interactive `$transaction` options from Prisma's array/batch overload.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001`, `UC-002`, `UC-005` |
| `REQ-002` | `UC-002`, `UC-004` |
| `REQ-003` | `UC-001`, `UC-004`, `UC-005` |
| `REQ-004` | `UC-003`, `UC-004` |
| `REQ-005` | `UC-002`, `UC-005` |
| `REQ-006` | `UC-001`–`UC-005` |
| `REQ-007` | `UC-005` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Public TypeScript compile contract. |
| `AC-002` | Exact outer options forwarding and ALS routing. |
| `AC-003` | Existing no-options compatibility. |
| `AC-004` | Optioned commit/rollback integration behavior. |
| `AC-005` | Nested reuse and outer-options authority. |
| `AC-006` | Unchanged adjacent library behavior. |
| `AC-007` | Published package surface across module formats/types. |
| `AC-008` | Clean-cut structural scope. |
| `AC-009` | Normal release availability for downstream consumption. |

## Approval Status

`Approved` — the user explicitly directed the team on 2026-07-28 to work this standalone library ticket through completion before returning to the backend repository-adoption ticket.
