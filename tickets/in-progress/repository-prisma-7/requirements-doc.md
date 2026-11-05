# Requirements Document

## Document Status

- Status: `Approved` (Part A); Part B is the user's release decision, recorded in the Task
- Current solution revision ID: `SR-001`
- Package identifier: `repository-prisma-7`
- Request / ticket: Project Task `repository-prisma-7`
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-05
- Approved by and reference: `Solution Designer within the direction (user informed)`. The Task asks for the outcome and lets the worker decide the mechanism. The user decided the release (Task comment 2026-11-05). No `Needs user` decision.
- Exact approved requirements baseline: `SR-001`

## Problem And Desired Outcome

- A blocked or mismatched `better-sqlite3` native build makes `initializePrisma` report the generic `CONNECTION_FAILED`; the cause is only in the opt-in diagnostic.
- Right after a release, pnpm 11+'s release-age gate makes the unpinned README install line silently install the previous major.
- Desired: a stable, path-free code that names the problem and points to the fix; README install lines that cannot silently pick the wrong major. Then release everything on `main` as a new version.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Explicit init with an unloadable native module -> `CONNECTION_FAILED` | -> new code `SQLITE_DRIVER_UNAVAILABLE`, path-free message pointing to the README fix; raw cause still only via `onDiagnostic` | All other connect failures stay `CONNECTION_FAILED`; failed-state semantics; diagnostics contract | probes |
| BEH-002 | Contract | Lazy path: the driver's raw error reaches the first query | Unchanged; README tells lazy users what they see | Lazy behavior | probes |
| BEH-003 | Contract (docs) | Unpinned install lines | `repository_prisma@2` in the npm and pnpm lines; the pnpm release-age pitfall explained | Rest of setup | probes |
| BEH-004 | Operational | 2.0.0 published; `main` has unreleased additive changes | Released as the next version via the tag-based flow | Release guide | CHANGELOG |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | An app calls `initializePrisma` where `better-sqlite3`'s native module cannot load (missing build or wrong ABI) | SCN-001 |
| UC-002 | A developer installs following the README with npm or pnpm, including right after a release | SCN-002 |
| UC-003 | The maintainer releases `main` | SCN-003 |

### Out Of Scope

- Lazy-path error replacement (BEH-002 stays).
- Detecting other native-module failures outside the adapter's `connect()`.
- Changes to the generator support.
- Yarn guidance beyond the existing sentence.

### Non-Goals

None.

### Preserved Behavior Boundary

All existing codes and their triggers other than BEH-001's case; the lazy path; diagnostics (raw cause opt-in only).

### Prerequisites

None.

### Review Authority

Team standard.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Feasibility Evidence | Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When explicit initialization's connect step fails because `better-sqlite3`'s native module cannot be loaded (the `bindings` "Could not locate the bindings file" failure, or Node's `ERR_DLOPEN_FAILED`, also when nested as a `cause`), `initializePrisma` rejects with `PrismaInitializationError` code `SQLITE_DRIVER_UNAVAILABLE`. Its message names the problem and the README step and contains no path; `onDiagnostic` receives the raw cause with that code. Any other connect failure stays `CONNECTION_FAILED`. | BEH-001 | Must | probes | DEC-001, DEC-002 |
| REQ-002 | The new code is part of the exported `PrismaInitializationErrorCode` type and the README code list. README, DESIGN.md and CHANGELOG describe it, including what lazy-path users see instead | BEH-001, BEH-002 | Must | — | DEC-003 |
| REQ-003 | README install lines pin the major (`npm install repository_prisma@2`, `pnpm add repository_prisma@2 @prisma/client@7`); the setup section explains the pnpm minimum-release-age behavior; the release guide reminds the maintainer to update the pinned major on a major release | BEH-003 | Must | probe | DEC-004 |
| REQ-004 | Part B: release the merged `main` as a new version through the README tag-based flow, with the pre-tag checks and the post-publish check; CHANGELOG `## Unreleased` moves under the version | BEH-004 | Must | — | DEC-005 |

## Acceptance Criteria

| AC ID | REQ | Trigger | Observable Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Fake client whose `$connect` rejects with (a) a bindings-shaped `Error`, (b) an `ERR_DLOPEN_FAILED` error, (c) either nested as `cause`, (d) an unrelated error | (a)-(c) `SQLITE_DRIVER_UNAVAILABLE` and the lifecycle is `failed`; (d) `CONNECTION_FAILED`. The message has no path; the diagnostic gets the raw cause and the new code | vitest |
| AC-002 | REQ-001 | Real driver: a fresh consumer of the packed build with `better-sqlite3`'s build removed; and with a module built for another Node ABI; ESM and CJS | `SQLITE_DRIVER_UNAVAILABLE` with the README pointer; after approving/rebuilding as the README says, the app works | E2E logs |
| AC-003 | REQ-002 | `npm run typecheck`, `npm run test:package` | The new code type-checks for consumers (declaration smoke); package checks pass | logs |
| AC-004 | REQ-003 | Fresh npm 12 and pnpm (11 and 12) consumers following only the README | Correct major installed and the app works; a pnpm install while the newest version is younger than a day picks the pinned major (pnpm adds the exclusion), not the previous major | E2E logs |
| AC-005 | REQ-004 | Release | Tag pushed; Release workflow succeeds with provenance; `npm view` latest = new version; `main` contains the release commit; fresh registry consumers work in ESM and CJS; cleanup | release evidence |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Consumer app (e.g. Electron server) | `initializePrisma` at startup with an unloadable native module | Clear, stable code; fix in the README | Supported Normal (npm 12/pnpm defaults; Electron ABI) |
| SCN-002 | User | Consumer developer | README install | Right major, working app | Supported Normal |
| SCN-003 | Operational | Maintainer | Tag-based release | New version on npm | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `No`.

## Data Continuity And Acceptable Loss

- Not affected.

## Decisions

| ID | Question | Reasoning And Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | New code or message only? | A stable code lets apps react (e.g. show a setup hint); the message alone is not machine-checkable. **New code `SQLITE_DRIVER_UNAVAILABLE`** (the Task's suggested name, consistent with `PRISMA_CLIENT_UNAVAILABLE`). | Solution Designer | Decided |
| DEC-002 | Lazy path too? | Prisma rewraps coded errors from the adapter (Reproduced), so a library code can't reach lazy callers cleanly. Lazy callers already get the driver's real message. **Explicit path only**, documented. Rejected alternative: an uncoded custom error from the adapter, which would add a second, code-less error shape. | Solution Designer | Decided |
| DEC-003 | Detection rule | `bindings` message prefix and Node's documented `ERR_DLOPEN_FAILED`, also when nested as a `cause`. If the driver changes its message, the result falls back to today's `CONNECTION_FAILED` (safe degradation, recorded in DESIGN.md). | Solution Designer | Decided |
| DEC-004 | Pin the major? | Measured: pinned `@2` makes pnpm install the right major (auto-exclusion) instead of silently installing 1.0.10. npm's age gate is off by default, so pinning there is harmless and keeps both lines consistent. **Pin, and document.** | Solution Designer | Decided |
| DEC-005 | Version | Recommended 2.1.0; confirmed at Part B from the final CHANGELOG (all entries additive or internal; public types identical per the type-equality check). Part A adds a code (additive). | Solution Designer | Decided (re-checked at Part B) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-003 | SCN-001 |
| REQ-003 | UC-002 | BEH-003 | AC-004 | SCN-002 |
| REQ-004 | UC-003 | BEH-004 | AC-005 | SCN-003 |

## Readiness Check

- Content ready: `Yes`. Approval recorded: `Yes` (within the direction). Ready for design: `Yes`.
