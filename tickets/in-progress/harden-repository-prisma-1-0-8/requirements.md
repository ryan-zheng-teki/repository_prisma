# repository_prisma 1.0.8 Logging and Import Environment Hardening — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — the reported 1.0.7 defects are confirmed against source, generated
outputs, and the published 1.0.7 tarball. The typed logging option's lazy-bound timing
rule is resolved below. Architecture review remains pending; no publication is
authorized by this analysis request.

## Goal / Problem Statement

Harden `repository_prisma` for a proposed 1.0.8 release without regressing the
explicit datasource, SQLite readiness, lifecycle, and forwarding behavior delivered
in 1.0.7. Query logging must be opt-in, package imports must not load `.env` files or
mutate the hosting process environment, and the built ESM and CommonJS entrypoints
must be behaviorally equivalent.

The task is an analysis of the repository problem itself. The AutoByteus follow-up
task and any consumer-repository changes are out of scope.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BE-RP108-001` | Constructed root clients use `log: ['query', 'info', 'warn']`, so SQL query events are emitted by default. | A newly constructed client uses `['info', 'warn', 'error']`; query events appear only when explicitly enabled through the documented environment flag or typed initialization option. | Info, warning, and error log levels remain available by default. | `REQ-RP108-001`–`REQ-RP108-003`, `AC-RP108-001`–`AC-RP108-004` |
| `BE-RP108-002` | Importing the public source causes the compiled ESM/CJS entrypoints to evaluate `dotenv/config`; this can discover and load `.env` from the caller's working directory. | Importing either built entrypoint performs no `.env` discovery/loading and no environment mutation. Applications own environment preloading. | Existing `process.env` values remain readable when initialization/lazy acquisition actually resolves a datasource. | `REQ-RP108-005`, `AC-RP108-005`–`AC-RP108-007` |
| `BE-RP108-003` | Import creates the lifecycle singleton and forwarding proxies but does not construct a raw `PrismaClient` until root access or initialization. | Import remains free of raw client construction and datasource resolution. | Lazy Prisma acquisition, explicit datasource support, and documented environment precedence remain intact. | `REQ-RP108-004`, `REQ-RP108-006`, `AC-RP108-008`–`AC-RP108-009`, `AC-RP108-015`–`AC-RP108-017` |
| `BE-RP108-004` | Existing 1.0.7 lifecycle behavior covers normalized datasource identity/conflicts, SQLite physical identity, strict WAL, stable errors, diagnostics, concurrency, shutdown/rebind, and forwarding proxies. | No behavior change to these lifecycle contracts, except that raw client construction additionally receives the selected logging policy. | All listed 1.0.7 lifecycle and transaction/proxy behavior is retained. | `REQ-RP108-006`, `AC-RP108-018`–`AC-RP108-028` |
| `BE-RP108-005` | Published artifact is produced from source by tsup, with conditional `import`/`require` exports; both built outputs currently inherit the source defects. | Clean build produces equivalent ESM and CommonJS behavior and neither output contains `dotenv/config` or the old default query logging policy. | Existing package export paths, declarations, peer range, and packed artifact shape remain supported. | `REQ-RP108-007`–`REQ-RP108-009`, `AC-RP108-029`–`AC-RP108-034` |
| `BE-RP108-006` | README and DESIGN describe 1.0.7 initialization but do not document query logging policy or removal of automatic `.env` loading. | README/changelog document the 1.0.8 behavior, opt-in controls and precedence, sensitive-query warning, consumer-owned environment loading, and no schema/data migration. | Existing 1.0.7 lifecycle and datasource documentation remains accurate. | `REQ-RP108-010`, `AC-RP108-035` |

## Investigation Findings

Initial verification confirms the core task is true:

- `src/lib/client/lifecycle.ts` constructs the default client with
  `log: ['query', 'info', 'warn']`.
- `src/lib/client.ts` imports `dotenv/config`; tsup therefore emits it in both
  `dist/index.mjs` and `dist/index.js`.
- The published `repository_prisma@1.0.7` tarball has the same `dotenv/config` and
  query-log references and declares `dotenv` as a runtime dependency.
- `prisma.config.ts` also imports `dotenv/config`, but that is repository Prisma CLI
  tooling rather than the published package entrypoint; dependency handling must
  distinguish this development path from runtime package imports.
- Import-time raw `PrismaClient` construction was not found in the current source;
  lifecycle construction remains lazy and must stay so.
- The existing source/package test suite passed 62 tests on the clean task worktree
  after dependency installation, and its output visibly contains `prisma:query`,
  reproducing the logging defect.

See the investigation notes for exact commands, paths, build output, published
artifact evidence, and remaining design questions.

## Relevant Supplemental Task Artifacts

None. The logging policy and lazy-bound timing rule are stated directly in this
requirements document and design spec; no separate behavioral supplement is needed.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor posture: `Likely Needed`.
- Evidence basis: the raw-client construction policy is hard-coded in the lifecycle
  owner and the public facade owns import-time environment loading. The former needs
  one explicit policy resolver; the latter violates the library/application
  configuration boundary. Lazy binding also makes typed logging-option timing a
  lifecycle concern rather than a simple constructor literal.
- Requirement or scope impact: centralize logging-policy resolution at raw client
  construction, remove runtime dotenv loading, preserve lifecycle authority, and add
  source/build/package parity coverage. Do not redesign transaction or persisted-data
  paths.

## Recommendations

1. Add `logQueries?: boolean` to `InitializePrismaOptions`.
2. Use the explicit typed option whenever it is defined; otherwise parse
   `PRISMA_LOG_QUERIES` at client-construction time using trimmed,
   case-insensitive `1`, `true`, `yes`, or `on` only.
3. For lazy access, resolve the environment flag because no initialization options
   are available. Retain the policy on the lazy-bound lifecycle state. A later typed
   option that disagrees with the already constructed client MUST reject with a new
   stable `LOGGING_POLICY_CONFLICT` error; callers must shut down before choosing a
   different policy. This avoids silently ignoring a typed opt-in or mutating a
   constructor-scoped Prisma setting.
4. Remove `dotenv/config` from package runtime and repository Prisma CLI config, then
   remove `dotenv` from runtime/dev dependencies and the lockfile. All test/CLI
   commands that need a datasource must provide it explicitly in their environment.
5. Build and inspect both outputs from source; do not edit generated `dist` files by
   hand. Add isolated child-process tests with synthetic `.env` canaries and a
   constructor spy/stub.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the code change is compact but crosses public initialization types, raw
client construction, environment/dependency policy, both module formats, durable
tests, documentation, packaging, and release evidence.

## In-Scope Use Cases

- `UC-RP108-001` — Import the exact built ESM entrypoint from an isolated working
  directory without loading synthetic `.env` values or constructing a client.
- `UC-RP108-002` — Import the exact built CommonJS entrypoint with the same safety
  guarantees.
- `UC-RP108-003` — Construct a client with default info/warn/error logging and no
  query logs.
- `UC-RP108-004` — Opt into query logs with accepted truthy environment values and
  with the typed initialization option.
- `UC-RP108-005` — Keep invalid/unrecognized/missing environment values and typed
  `false` from enabling query logs.
- `UC-RP108-006` — Exercise preserved datasource selection, lifecycle, WAL/reopen,
  shutdown/rebind, and proxy behavior through source and packed ESM/CJS surfaces.
- `UC-RP108-007` — Consume documentation and package metadata that accurately state
  the 1.0.8 security and compatibility posture.

## Out of Scope

- AutoByteus integration, patches, lockfiles, or database ownership changes.
- Prisma schema/model changes, SQL migrations, `db push` as a release change,
  persisted-data rewrites, or destructive data operations.
- Changes to transaction propagation, repositories, model typing, datasource
  normalization, SQLite identity/WAL semantics, error codes, diagnostics, lifecycle
  states, shutdown, or proxy behavior beyond regression protection.
- Application-specific `.env` loading, configuration frameworks, deployment startup
  orchestration, log redaction infrastructure, or log retention policy.
- Publishing/tagging v1.0.8 without explicit later release authorization. This analysis
  may define release checks but does not perform publication.

## Functional Requirements

- `REQ-RP108-001` — The default raw `PrismaClient` log levels MUST be exactly
  `['info', 'warn', 'error']`; `query` MUST be absent unless a supported explicit
  opt-in resolves true.
- `REQ-RP108-002` — `PRISMA_LOG_QUERIES` MUST be accepted only when its trimmed,
  case-insensitive value is `1`, `true`, `yes`, or `on`. Missing, empty, false, `0`,
  `off`, malformed, and all other values MUST disable query logging.
- `REQ-RP108-003` — `InitializePrismaOptions` MUST expose an optional typed
  `logQueries?: boolean` control. When defined, it MUST take precedence over the
  environment flag; `false` MUST disable query logs and `true` MUST enable them.
  The option is applied when the lifecycle constructs a raw client. Lazy root access
  resolves the environment policy at that moment; a later explicit value that differs
  from the already bound policy MUST reject with stable code
  `LOGGING_POLICY_CONFLICT` until `shutdownPrisma()` creates a new binding boundary.
- `REQ-RP108-004` — The logging policy MUST be resolved only when a raw client is
  constructed, not by importing the package. Resolving it MUST not mutate
  `process.env` or load any file.
- `REQ-RP108-005` — The package runtime source and generated ESM/CJS entrypoints MUST
  contain no unconditional `dotenv/config` import or require. Import MUST not
  discover/load `.env`, require a datasource, or construct a raw Prisma client.
- `REQ-RP108-006` — Explicit `datasourceUrl`, existing `DATABASE_URL`/documented
  environment support, lazy acquisition, normalized target conflict detection,
  SQLite identity verification, strict WAL, stable error codes, diagnostics,
  lifecycle concurrency, forwarding proxies, deterministic shutdown/rebind, and
  restart/reopen behavior MUST remain operational. Adding
  `LOGGING_POLICY_CONFLICT` MUST not change the meaning of existing 1.0.7 codes.
- `REQ-RP108-007` — Source and build pipeline changes MUST produce behaviorally
  equivalent conditional `import` and `require` exports, declarations, and packed
  artifact. Generated files MUST NOT be hand-edited as the only correction.
- `REQ-RP108-008` — `dotenv` MUST have no remaining repository use after the change;
  remove it from runtime/dev dependencies and the lockfile. Prisma CLI/test commands
  MUST receive datasource configuration explicitly from their invoking environment.
- `REQ-RP108-009` — Durable tests MUST cover import safety, constructor logging
  options, truthy/falsey parsing, ESM/CJS parity, and the complete 1.0.7 lifecycle
  regression set using synthetic configuration/data only.
- `REQ-RP108-010` — README and changelog MUST state that 1.0.8 does not load `.env`
  automatically, consumers must preload/provide configuration, query logs are off by
  default, temporary opt-in syntax, sensitivity/retention warning, and no schema or
  data migration occurs.

## Acceptance Criteria

- `AC-RP108-001` — Spying on `PrismaClient` construction shows absent/empty env,
  invalid values, `false`, `0`, and `off` produce exactly `info`, `warn`, `error`.
- `AC-RP108-002` — The accepted env values `1`, `true`, `yes`, `on`, including mixed
  case and surrounding whitespace, produce exactly `info`, `warn`, `error`, `query`.
- `AC-RP108-003` — Typed `logQueries: false` disables query logging even when the
  environment flag is truthy; typed `logQueries: true` enables it when the env flag
  is absent/false. A differing value after lazy binding rejects with
  `LOGGING_POLICY_CONFLICT`.
- `AC-RP108-004` — Logging-policy tests observe only level names and never emit SQL,
  parameters, datasource URLs, credentials, or paths.
- `AC-RP108-005` — In an isolated temporary cwd containing a synthetic `.env` canary,
  importing the exact built ESM entrypoint leaves the canary absent from
  `process.env` and emits no datasource/environment value.
- `AC-RP108-006` — The same import-safety assertions pass for the exact built
  CommonJS entrypoint.
- `AC-RP108-007` — The package runtime source and generated ESM/CJS outputs contain
  no `dotenv/config` and no old hard-coded query default.
- `AC-RP108-008` — Importing alone constructs zero clients; first supported root
  access remains lazy and constructs only the lifecycle-owned root client.
- `AC-RP108-009` — Explicit datasource initialization and existing `DATABASE_URL`
  support remain functional without package-owned `.env` loading.
- `AC-RP108-010` — Schema, migration, and persisted-data files are unchanged.
- `AC-RP108-011` — Tests use only synthetic configuration/data and never a developer
  `.env`, real credential/database file, or destructive operation.
- `AC-RP108-012` — Package import does not mutate any inherited environment value.
- `AC-RP108-013` — Package import does not require a datasource and produces no output
  containing datasource or environment values.
- `AC-RP108-014` — Release execution, if separately authorized, builds from a clean
  checkout, records exact npm artifact integrity/provenance, and publishes exactly
  `repository_prisma@1.0.8`; this criterion is explicitly out of the current stage.
- `AC-RP108-015` — ESM and CommonJS import-safety scenarios both report zero raw
  PrismaClient constructions.
- `AC-RP108-016` — ESM and CommonJS import scenarios both succeed with all datasource
  variables absent.
- `AC-RP108-017` — ESM and CommonJS import scenarios both leave the synthetic canary
  absent and keep stdout/stderr free of its value.
- `AC-RP108-018` — Concurrent identical initialization requests share one in-flight
  lifecycle operation and one captured logging policy.
- `AC-RP108-019` — Invalid or conflicting datasource configuration retains existing
  stable error codes and does not alter the logging policy of a healthy client.
- `AC-RP108-020` — Lazy root access still resolves datasource and logging policy only
  when the root is first used.
- `AC-RP108-021` — Successful initialization still connects, verifies SQLite identity,
  and publishes the client only after readiness.
- `AC-RP108-022` — Failed initialization still disconnects candidates, reports safe
  stable errors, and blocks silent reuse.
- `AC-RP108-023` — Shutdown remains deterministic and clears lifecycle state.
- `AC-RP108-024` — Initialization after shutdown can bind a new datasource and logging
  policy.
- `AC-RP108-025` — SQLite reopen behavior remains functional.
- `AC-RP108-026` — Strict WAL activation and independent verification remain intact.
- `AC-RP108-027` — Forwarding proxy handles continue routing to the current client
  after rebinding.
- `AC-RP108-028` — Repository, transaction, ALS, diagnostics, restart, and error-code
  regressions remain covered without weakened assertions.
- `AC-RP108-029` — A clean build produces both ESM and CommonJS outputs plus
  declarations from the shared source.
- `AC-RP108-030` — Generated outputs contain neither `dotenv/config` nor the old
  default query logging literal.
- `AC-RP108-031` — `npm pack` contains both entrypoints, declarations, README, DESIGN,
  and changelog while excluding source and ticket files.
- `AC-RP108-032` — Installed packed ESM and CommonJS consumers expose equivalent
  logging and import-safety behavior.
- `AC-RP108-033` — Declarations expose `logQueries` and the stable conflict error code
  consistently through both package formats.
- `AC-RP108-034` — Package metadata retains peer compatibility with
  `@prisma/client@^5.22.0`.
- `AC-RP108-035` — README, DESIGN, and CHANGELOG document no automatic `.env` loading,
  explicit consumer configuration, query opt-in and sensitivity, and no schema/data
  migration.

## Constraints / Dependencies

- Authoritative task worktree: `/Users/normy/autobyteus_org/repository_prisma-1-0-8`.
- Task branch: `codex/harden-repository-prisma-1-0-8` based on refreshed
  `origin/main@176a393392c4fe5b1f7ac7b28e85f4bfe12f89fc`.
- Package source version at bootstrap is `1.0.7`; npm currently exposes published
  `repository_prisma@1.0.7` with integrity recorded in investigation notes.
- `README.md` is the usage/release guide; `DESIGN.md` is architecture/rationale.
- Release is tag-based per `AGENTS.md` and README; publication requires separate
  explicit authorization.
- `@prisma/client` remains a peer dependency at `^5.22.0`; construction must retain
  explicit datasource passing and logging options supported by Prisma 5.22.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Consumer-owned Prisma databases; this package owns no
  schema or application rows.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all
  consumer data directly; no schema or SQL migration is part of this behavior-only
  change.
- Unacceptable data loss or corruption: Any schema modification, migration, reset,
  wrong-database write, or data rewrite caused by logging/environment changes.
- Relevant availability, maintenance-window, or rollout constraints: Consumers must
  preload environment/configuration and must not rely on package import to do so.
- Related requirement and acceptance-criteria IDs: `REQ-RP108-005`–`REQ-RP108-006`,
  `AC-RP108-009`–`AC-RP108-011`.

## Assumptions

- Typed option precedence over environment is the clearest deterministic contract.
- Lazy root acquisition without an options object uses the environment flag at the
  moment of raw-client construction.
- Prisma log configuration is constructor-scoped; a typed option supplied after an
  already lazy-bound client that differs from its policy rejects with
  `LOGGING_POLICY_CONFLICT`. Shutdown/reinitialize is the explicit change boundary.
- Prisma CLI/test commands receive `DATABASE_URL` from their invoking shell/script;
  no repository config file loads `.env` after this change.

## Risks / Open Questions

- The lazy-bound versus typed-option interaction is resolved by explicit
  `LOGGING_POLICY_CONFLICT`; implementation must preserve this through concurrent and
  rebinding paths.
- Removing dotenv from `prisma.config.ts` means direct Prisma CLI invocations without
  an explicit `DATABASE_URL` now fail instead of discovering `.env`; this is intended
  configuration ownership, but README tooling instructions must be clear.
- Release publication and npm provenance cannot be claimed until explicitly requested.

## Requirement-To-Use-Case Coverage

| Requirement | UC-RP108-001 | UC-RP108-002 | UC-RP108-003 | UC-RP108-004 | UC-RP108-005 | UC-RP108-006 | UC-RP108-007 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-RP108-001`–`REQ-RP108-004` |  |  | Yes | Yes | Yes | Yes |  |
| `REQ-RP108-005` | Yes | Yes |  |  |  | Yes |  |
| `REQ-RP108-006` |  |  |  |  |  | Yes |  |
| `REQ-RP108-007`–`REQ-RP108-009` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `REQ-RP108-010` |  |  |  |  |  |  | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-RP108-001`–`AC-RP108-004` | Constructor-level logging policy and safe output capture |
| `AC-RP108-005`–`AC-RP108-017` | Exact built ESM/CJS import safety, no datasource requirement, no mutation, and lazy guard |
| `AC-RP108-018`–`AC-RP108-028` | Lazy datasource/lifecycle, readiness, shutdown/rebind, proxy, and regression coverage |
| `AC-RP108-029`–`AC-RP108-034` | Clean build, source/build parity, packed artifact, declarations, and peer contract |
| `AC-RP108-035` | README, DESIGN, and CHANGELOG behavior documentation |
| `AC-RP108-014` | Separately authorized release integrity/provenance; explicitly out of this stage |

## Approval Status

`Requirements basis refined and design-ready from the user-supplied task and confirmed
repository evidence on 2026-07-22. Architecture review is required before
implementation. The task's publication, npm provenance, and final release claims remain
unperformed and require later explicit authorization.`
