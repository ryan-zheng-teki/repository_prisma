# Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-001`
- Package identifier: `prisma-7-upgrade`
- Request / ticket: Project Task `repository-prisma-1`: upgrade Prisma (client and CLI) from 5.22.0 to the latest stable 7.x (7.10.1)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-04
- Approved by and reference: pending (user decisions DEC-001, DEC-002, DEC-007b, DEC-008)
- Exact approved requirements baseline / solution revision: pending (`SR-001` proposed)
- Behavior-defining supplements and their approved versions: none. `probes/` is evidence only.

## Problem And Desired Outcome

- Problem: The library declares and tests only Prisma 5.22. Prisma 7.10.1 is the latest stable. In Prisma 7, a `PrismaClient` can no longer be built from a URL: every client needs a driver adapter. The schema `url` and the `--skip-generate` CLI flag were also removed. The library's core (constructing the one root client from a datasource URL) and its build/test pipeline fail as-is on 7.
- Affected actors or systems: library consumers (known: `autobyteus-server-ts`, SQLite), maintainers, CI and release workflows.
- Desired outcome: The library works on Prisma 7.10.1 with the same public API for its SQLite use. Unavoidable contract changes are explicit, documented, and evidenced. Existing SQLite data keeps its meaning.
- Observable definition of success: manifests and lockfile resolve 7.10.1; `prisma generate`, typecheck, tsup build, the full test suite and the package smoke pass on 7.10.1; docs match; the work is merged to `main`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001..004 | Peer `@prisma/client ^5.22.0`, dev `prisma ^5.22.0`, lock 5.22.0 | Prisma 7.10.1 per DEC-002 | — | notes Source Log |
| BEH-002 | System | SCN-001, SCN-002 | Root client built with `datasourceUrl` (rejected by 7, Reproduced) | Root client built with a SQLite driver adapter from the same inputs | URL selection order, cwd resolution, binding/conflict semantics, lazy binding, shutdown/rebind | probes |
| BEH-003 | System | SCN-001 | Memory targets supported, WAL rejected | Same on 7 | All | code |
| BEH-004 | System | SCN-001 | Identity check and strict WAL with stable codes | Same on 7 (Measured feasible) | All codes, messages, diagnostics | probes |
| BEH-005 | Contract | SCN-001 | Query string kept in the engine URL; opened file excludes the query | Opened file still excludes the query. Prisma-5 engine parameters (`connection_limit`, `socket_timeout`) no longer have any effect. | Binding key (and so conflict detection) unchanged | probes |
| BEH-006 | Data | SCN-001 | DateTime stored as INTEGER unix ms | Stored and compared the same way | Query results over existing rows | probes (Measured) |
| BEH-007 | System | SCN-005 | Non-SQLite URL passed through to `PrismaClient` | Per DEC-001 | — | code, README |
| BEH-008 | Contract | SCN-001 | Logging policy | Same (query events Measured on 7) | All | probes |
| BEH-009 | Contract | SCN-001 | ALS transactions and options | Same (Measured on 7) | All | probes |
| BEH-010 | Contract | SCN-003 | ESM/CJS entrypoints, Prisma peer external, import has no side effects | Same, with the new adapter peer also external; the native addon is not loaded at import | All | probes |
| BEH-011 | Operational | SCN-004 | `npm test`/CI use `db push --skip-generate` | Pipelines pass on 7 | Commands' purpose | probes |
| BEH-012 | Contract | SCN-004 | Schema datasource `url` + `prisma.config.ts` url | URL only in `prisma.config.ts` | Models unchanged | probes |
| BEH-013 | Contract | SCN-001, SCN-003 | No runtime minimums declared | Node `^20.19 \|\| ^22.12 \|\| >=24`, TS >= 5.4 documented and declared | — | npm metadata |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User / maintainer | Keep the library current | Library on stable Prisma 7 | No release in this Task |
| Consumer application (SQLite) | Use repositories/transactions on Prisma 7 | Same API; data unchanged in meaning | Must install the adapter peer and follow Prisma's own v7 changes |
| CI / release workflow | Validate and publish | Passes on 7 | Tag-based release remains a separate decision |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A SQLite consumer on Prisma 7 initializes (explicitly or lazily) and queries through the library | SCN-001, SCN-002 |
| UC-002 | ESM and CJS consumers load the package with Prisma 7 peers | SCN-003 |
| UC-003 | A maintainer or CI installs, generates, typechecks, builds, tests and smoke-tests the package on Prisma 7 | SCN-004 |
| UC-004 | A consumer configures a non-SQLite datasource (behavior per DEC-001) | SCN-005 |

### Out Of Scope

- Upgrading any consumer (for example `autobyteus-server-ts`) to Prisma 7 or the new library version (FU-001).
- Supporting Prisma's new `prisma-client` generator or custom client output paths (FU-002).
- Prisma 8.x (RC).
- Publishing, version bump, tagging, or GitHub release.
- Moving CI/release workflows off Node 20 (FU-003).
- Schema model changes, migrations, data conversion of existing databases.

### Non-Goals

- Supporting Prisma 5 or 6 in the same release line. Prisma 5 users stay on `repository_prisma` 1.0.x.
- Translating Prisma-5 engine URL parameters into adapter options.
- Testing against real non-SQLite databases.

### Preserved Behavior Boundary

BEH-002 (preserved column), BEH-003, BEH-004, BEH-006, BEH-008, BEH-009, BEH-010; REQ-003, REQ-005, REQ-006, REQ-007, REQ-009. Invariant: every existing public export, option and error code keeps its meaning for SQLite targets. The only additions are those required by DEC-001.

### Prerequisites

None. The released-but-unmerged 1.0.10 line is handled by the base choice DEC-008, not by a separate Task, because the ticket can reach its goal safely on that base.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `prisma` (dev) and `@prisma/client` resolve to 7.10.1 in `package.json` and `package-lock.json`. No range in the manifest admits 8.x. | BEH-001 | Must | User direction | `npm view` | Task; DEC-002 |
| REQ-002 | `peerDependencies` state exactly the Prisma versions and companion packages the library supports and was tested with (DEC-002). | BEH-001 | Must | Contract honesty | npm metadata | DEC-002 |
| REQ-003 | For SQLite file and memory targets, `initializePrisma` (explicit URL or env selection), lazy binding, `shutdownPrisma`, `rootPrismaClient`, the `prisma` proxy and repositories work on Prisma 7 with the same public inputs and outcomes as today. | BEH-002, BEH-003 | Must | Preserve API | Scratch suite 83/83 | Task constraint |
| REQ-004 | For SQLite file targets, the database the client opens is the resolved target file, independent of any URL query string. A query string never creates or opens a different file. | BEH-005 | Must | Adapter treats the query as part of the filename (Reproduced) | probe | DEC-006 |
| REQ-005 | Clients built by the library store and compare `DateTime` values in SQLite in the same representation Prisma 5.22 used (INTEGER unix ms). Reads, filters and ordering over rows written by Prisma 5 return the same rows as before. | BEH-006 | Must | Silent wrong results otherwise (Measured) | probe | DEC-005 |
| REQ-006 | Readiness, identity, strict WAL, logging policy, error codes, safe messages, diagnostics, failed state and conflict semantics are unchanged. | BEH-004, BEH-008 | Must | Preserve API | Measured | Task constraint |
| REQ-007 | Transaction behavior (`runInTransaction` options, nesting, `@Transactional`, `Models`) is unchanged. | BEH-009 | Must | Preserve API | Measured | Task constraint |
| REQ-008 | Non-SQLite datasource targets behave as DEC-001 decides, with a stable, documented outcome that leaks no URL or credentials. | BEH-007 | Must | Unavoidable change | Prisma guide | DEC-001 |
| REQ-009 | The CJS and ESM entrypoints load with Prisma 7 peers installed. Prisma packages, including the adapter, are not bundled into `dist`. Importing the package opens no database, loads no native addon, needs no datasource and loads no `.env`. | BEH-010 | Must | Bundling broke ESM (Reproduced) | probe | — |
| REQ-010 | `npm ci`, `prisma generate`, `npm run typecheck`, `npm run build`, `npm test` (full suite), `npm run test:package`, and the CI workflow's commands succeed on 7.10.1. Evidence is recorded. | BEH-011 | Must | Done-when | Scratch run | Task |
| REQ-011 | Schema and config are valid for Prisma 7: no datasource `url` in the schema, and the CLI URL comes from `prisma.config.ts`. Models are unchanged. | BEH-012 | Must | P1012 (Reproduced) | probe | — |
| REQ-012 | README (requirements, install, Prisma 7 notes, non-SQLite stance, query-string and DateTime notes), DESIGN (adapter construction and rationale) and CHANGELOG (an unreleased entry marked breaking) match the change. The package version is not bumped; nothing is tagged or published. | all | Must | AGENTS.md; Task | — | DEC-009 |
| REQ-013 | `package-lock.json` is the single tracked lockfile; `pnpm-lock.yaml` is not added to the repository. | BEH-011 | Must | Task done-when | git history, CI | DEC-007 |
| REQ-014 | The package declares its Node runtime minimum matching Prisma 7 (`^20.19 \|\| ^22.12 \|\| >=24`) and documents TypeScript >= 5.4. | BEH-013 | Should | Consumers get an early, clear signal | npm metadata | DEC-010 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-013 | BEH-001 | Fresh `npm ci` | `npm ls prisma @prisma/client` shows 7.10.1; the peer ranges equal DEC-002; no `pnpm-lock.yaml` is tracked | — | Command evidence |
| AC-002 | REQ-003 | SCN-001 | `initializePrisma({ datasourceUrl: 'file:<abs>' })` then repository CRUD | Works, and `PRAGMA database_list` `main` = the target file | Different target while bound -> `DATASOURCE_CONFLICT` | Existing + updated tests |
| AC-003 | REQ-003 | SCN-002 | No explicit init; `DATABASE_URL` set; first repository call | Lazily bound and works | Missing URL -> `DATABASE_URL_MISSING` | Existing tests |
| AC-004 | REQ-004 | BEH-005 | URL `file:<path>?connection_limit=1` (relative, spaces, `%20`, symlink) | Opens `<path>`; no file containing `?` is created | — | Extended public-initialization test (asserts no `?` file) |
| AC-005 | REQ-005 | BEH-006 | DB with a DateTime row written as INTEGER ms (Prisma-5 format); a new row is written through the library's client | New row stored as INTEGER; a `gt`/`lt` filter returns both old and new rows as expected | — | New test with a DateTime fixture (test schema may gain a DateTime model, or a raw-SQL fixture) |
| AC-006 | REQ-006 | BEH-004 | `enableWAL: true` on file/memory/non-SQLite; identity mismatch; connection failure | Same codes and outcomes as today; messages contain no URL/path | — | Existing tests on 7 |
| AC-007 | REQ-007 | BEH-009 | Transactions with options and nesting | Same as today | — | Existing tests on 7 |
| AC-008 | REQ-008 | SCN-005 | `initializePrisma({ datasourceUrl: 'postgresql://...' })` and lazy binding to a non-SQLite URL | Outcome per DEC-001 (recommended: rejects with a new stable code, no URL in the message) | — | New tests |
| AC-009 | REQ-009 | SCN-003 | Packed tarball installed in an ESM and a CJS consumer with Prisma 7 peers | Both import; `dist` contains no bundled adapter or better-sqlite3 code; no `.env` loaded; no native addon loaded on import | — | `npm run test:package` incl. interop probe |
| AC-010 | REQ-010, REQ-011 | SCN-004 | Clean checkout | All commands in REQ-010 pass; CI workflow commands match | — | Logged evidence |
| AC-011 | REQ-012, REQ-014 | all | Docs review | README/DESIGN/CHANGELOG and `engines` match the behavior; version unchanged; no tag | — | Docs review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal | Supported Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Consumer app (e.g. `autobyteus-server-ts`) | Start and serve on Prisma 7 with an existing SQLite DB | `initializePrisma({ datasourceUrl, enableWAL? })` at startup | Consumer upgraded to Prisma 7, adapter installed, existing DB with DateTime rows | init, readiness, repository/`rootPrismaClient` queries, shutdown | Same results as on Prisma 5 | Readiness failures keep the same codes | Supported Normal | consumer code; README | REQ-003..007, AC-002, AC-004..007 |
| SCN-002 | System | Consumer app/script | Use repositories without explicit init | First operation | `DATABASE_URL` set | lazy bind, query | Works | `DATABASE_URL_MISSING` | Supported Normal | README | REQ-003, AC-003 |
| SCN-003 | Contract | ESM or CJS consumer | Load the package | `import` / `require` | Prisma 7 peers installed | resolve entrypoint | Loads; no side effects | — | Supported Normal | `exports`; 1.0.10 interop | REQ-009, AC-009 |
| SCN-004 | Operational | Maintainer / CI | Validate the package | `npm ci && npm test` etc., CI on push | Clean checkout | install, push schema, generate, typecheck, test, build, smoke | All pass | — | Supported Normal | scripts, `ci.yml` | REQ-010/011, AC-010 |
| SCN-005 | System | Consumer with a non-SQLite schema | Use the library with Postgres/MySQL/etc. | `initializePrisma({ datasourceUrl: 'postgresql://...' })` or lazy bind | — | init | Per DEC-001 | — | Supported Explicit Edge (documented in README: WAL note, `PRISMA_DATASOURCE_PROVIDER`). No known consumer; never tested against a real DB. | README, `datasource-target.ts` | REQ-008, AC-008 |
| SCN-006 | System | Consumer using Prisma's new `prisma-client` generator (custom output) | Use the library | — | Client not at `@prisma/client` | — | — | — | Technically Possible but Unsupported (the library imports `@prisma/client`; it never supported a custom output) | code | Out of scope, FU-002 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A for all Product design fields; library and infrastructure work only.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-008, AC-006, AC-008 | Security | Error messages and codes contain no datasource URL, credentials or paths | All initialization failures | Existing message assertions extended |
| QR-002 | REQ-009, AC-009 | Compatibility | Node `^20.19 \|\| ^22.12 \|\| >=24`; ESM and CJS consumers | Package load | Package smoke |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (indirectly: consumer SQLite databases accessed through library-built clients)
- Data or state that must be preserved: the meaning of every existing row, including DateTime values, and the results of filters and ordering over them (REQ-005).
- Loss, reset, rebuild, or regeneration that is acceptable: none.
- Constraints: no data conversion is performed or required by the library.
- Unknowns: none for library-built clients. Consumer-built clients are out of scope (FU-001, RSK-001).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `@prisma/client` 7.10.1 (`prisma-client-js`) | Requires a driver adapter; `Prisma` namespace values available | Prisma 7 guide, probes | `prisma-client-js` deprecated (FU-002) |
| `@prisma/adapter-better-sqlite3` 7.10.1 | SQLite adapter; lockstep version with the client; native `better-sqlite3 ^12.6.0` | npm, probes | Native build per consumer platform (RSK-002) |
| `prisma` CLI 7.10.1 | Config-based URL; no `--skip-generate` | probes | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/README.md` and probe files | Feasibility/reproduction evidence | REQ-003..011 | Current | Evidence only |
| `follow-ups.md` | Out-of-scope findings | — | Current | N/A |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Consumers keep using `prisma-client-js` (output in `node_modules`) on Prisma 7 | The library imports `@prisma/client` | Documented requirement in README | Holds for the known consumer |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What happens with non-SQLite datasource URLs on Prisma 7? | Prisma 7 cannot build a client from a URL; the library would need a provider-specific adapter for each database | A) SQLite only: non-SQLite targets reject at bind/initialize with a new stable code (e.g. `UNSUPPORTED_DATASOURCE_PROVIDER`), documented. B) New public option to pass an app-built driver adapter. C) The library loads pg/mariadb/mssql adapters as optional peers. | The library's features (WAL, identity, case-insensitive helpers) are SQLite-centred. The only known consumer is SQLite. Non-SQLite was never tested against a real database. B and C add new, untested public surface. A states the truth plainly and keeps the change small; B can be added later without breaking anything (FU-004). **Recommend A.** | User (removes a documented capability) | Needs user |
| DEC-002 | Peer ranges | Declares what the library supports; a release decision | Tested: 7.10.1 only. Adapters are released in lockstep with the client. 8.x has a different CLI. | **Recommend** `@prisma/client: ^7.10.1` and a new peer `@prisma/adapter-better-sqlite3: ^7.10.1` (peer, not a dependency, so the consumer controls the version lockstep and the native build); dev `prisma: 7.10.1` range `^7.10.1`. A wider floor (`^7.0.0`) is untested. Caret ranges exclude 8.x. The next release becomes a major (2.0.0). | User (Task: "propose") | Needs user |
| DEC-003 | Which SQLite adapter | Native vs libsql | better-sqlite3: documented by Prisma for SQLite and Measured working. libsql: aimed at Turso/remote. | **better-sqlite3.** | Solution Designer | Decided |
| DEC-005 | DateTime storage format | Data continuity | Measured: `iso8601` default breaks range queries over Prisma-5 rows | **`unixepoch-ms`** for library-built clients; README warns consumers who build their own clients | Solution Designer | Decided |
| DEC-006 | SQLite URL query strings | Adapter would open `name?query` | Reproduced | Open the resolved path without the query. Engine-only parameters are ignored and documented. The binding key is unchanged. | Solution Designer | Decided |
| DEC-007 | Which lockfiles the repo keeps | Task done-when | `pnpm-lock.yaml` never tracked; CI uses `npm ci` with the npm cache | **`package-lock.json` only.** | Solution Designer | Decided |
| DEC-007b | Delete the stale untracked `pnpm-lock.yaml` (Prisma 5.22) in the shared checkout `/Users/normy/autobyteus_org/repository_prisma`? | A pnpm install there would reinstall 5.22. It is your local file, untracked, so deletion cannot be undone from git. | Keep / delete during delivery cleanup | **Recommend deleting it** during delivery cleanup | User | Needs user |
| DEC-008 | Base for this upgrade | `main` is 1.0.9; the published `1.0.10` (ESM interop fix, tag `v1.0.10`) lives only on the unmerged branch `codex/repository-prisma-esm-cjs-interop` (`f2ffd5c`), whose ancestor is `main` | A) Build on `f2ffd5c` and merge into `main`; `main` then fast-forwards over the released 1.0.10 commits. B) Build on `main`; the upgrade would drop the published 1.0.10 fix. C) Separate prerequisite Task to merge 1.0.10 first. | B would regress a published release. A and C give the same result, and A needs no extra Task. **Recommend A** (the worktree is already on `f2ffd5c`). | User (changes `main`'s history to include another ticket's work) | Needs user |
| DEC-009 | Version and CHANGELOG | No release in this Task | — | Do not bump `version`. Add a `## Unreleased (breaking: requires a major release)` CHANGELOG section. | Solution Designer | Decided |
| DEC-010 | Declare `engines.node`? | Early signal for consumers | Prisma 7 engines | Declare `^20.19 \|\| ^22.12 \|\| >=24` | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-003 | BEH-001 | AC-001 | SCN-004 | npm |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001, SCN-003 | npm |
| REQ-003 | UC-001 | BEH-002, BEH-003 | AC-002, AC-003 | SCN-001, SCN-002 | probes |
| REQ-004 | UC-001 | BEH-005 | AC-004 | SCN-001 | probes |
| REQ-005 | UC-001 | BEH-006 | AC-005 | SCN-001 | probes |
| REQ-006 | UC-001 | BEH-004, BEH-008 | AC-006 | SCN-001 | probes |
| REQ-007 | UC-001 | BEH-009 | AC-007 | SCN-001 | probes |
| REQ-008 | UC-004 | BEH-007 | AC-008 | SCN-005 | guide |
| REQ-009 | UC-002 | BEH-010 | AC-009 | SCN-003 | probes |
| REQ-010 | UC-003 | BEH-011 | AC-010 | SCN-004 | probes |
| REQ-011 | UC-003 | BEH-012 | AC-010 | SCN-004 | probes |
| REQ-012 | all | all | AC-011 | all | — |
| REQ-013 | UC-003 | BEH-011 | AC-001 | SCN-004 | git |
| REQ-014 | UC-002 | BEH-013 | AC-011 | SCN-003 | npm |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..005 (SCN-005 per DEC-001).
- Constraints: the public API for SQLite, error codes and safe messages, the lifecycle state machine, the `PrismaClientFactory` test seam, ESM/CJS packaging, DateTime representation.
- Deferred to architecture: where adapter construction lives, how `other` targets are rejected (initialize vs lazy bind), test-schema/fixture approach for AC-005, smoke/interop harness changes, CI command changes.
- Technical facts to verify: adapter error mapping for connection failures (`CONNECTION_FAILED`), handle release on `$disconnect` (shutdown/rebind), memory-target URL mapping (`file::memory:`, `mode=memory`) to the adapter's `:memory:`.
- Known risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: user decisions DEC-001, DEC-002, DEC-007b, DEC-008

### Approved Basis Ready For Design

- Approval recorded: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: user approval
