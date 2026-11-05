# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the direction; user informed)
- User approval of the design: `Not required`
- Design status: `Ready` (Part A). Part B is a release with no design; it follows as `Release Requested` once Part A is finalized.
- Investigation notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/investigation-notes.md`
- Authorities read (2026-11-05): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`; project `DESIGN.md` (present, including Design Cases DC-001/DC-002) and `TESTING.md` (present)
- Conflicts: none

## Current-State Read

- `PrismaClientLifecycle.performInitialization` (`src/lib/client/lifecycle.ts:337-341`) maps every `$connect()` rejection to `CONNECTION_FAILED`.
- The native module loads inside the adapter's `connect()`. The library reaches it through `createSqliteDriverAdapter` (`sqlite-driver-adapter.ts`) and the connection gate (`sqlite-connection-gate.ts:120`).
- Error codes and safe messages live in `initialization-error.ts`.
- The same path serves the default prisma-client-js client and a registered prisma-client module: both get the library's adapter (`lifecycle.ts:79-80`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. Three source files gain a few lines (new code + message; one classifier; one mapping). Tests, the declaration smoke list, README, DESIGN.md and CHANGELOG change. No new component.
- Architectural risk: `High`. It is a public contract change: a class of failures that returned `CONNECTION_FAILED` now returns a new code, and the exported code union grows. Its impact is bounded and additive (minor-version semantics).
- Escalation trigger: the native-load failure does not reach `$connect()` in some supported path (for example the registered prisma-client client), or classification needs anything beyond the error itself. Return `Design Impact`.

## Architecture Investigation Evidence

`investigation-notes.md` Runtime findings and `probes/README.md`:
- the failure shapes (bindings message without a code; `ERR_DLOPEN_FAILED`);
- both surface at explicit `$connect()`;
- Prisma rewraps coded errors on the lazy path.

## Intended Change

Classify an unloadable native SQLite driver at explicit initialization as `SQLITE_DRIVER_UNAVAILABLE`. Pin the major in the README install lines and document pnpm's release-age behavior.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002 (Part A).
  - `src/lib/client/initialization-error.ts`, `sqlite-driver-adapter.ts`, `lifecycle.ts`;
  - tests (`src/tests/client-lifecycle.test.ts` or a new focused test file);
  - `scripts/package-smoke/consumer-types.js` (code list);
  - `README.md`, `DESIGN.md`, `CHANGELOG.md`.
- Derived consumers of the code union:
  - `SAFE_ERROR_MESSAGES` (compiler-enforced record): add the entry.
  - Exported `PrismaInitializationErrorCode` (`src/index.ts`): automatic.
  - README code list: add.
  - The declaration smoke that lists codes: add.
  - Any exhaustive `switch` in `src/` over the union: none found (`grep` before implementing; add a case if one exists).
- Deliberately left alone: the lazy path (DEC-002), the connection gate, the generator support, `TESTING.md` (layers unchanged; see Guidance on whether a line is warranted).
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Change | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001..003 | `initializePrisma` | `$connect` failure classified | `initialize -> performInitialization -> client.$connect() -> adapter connect (native load) -> catch -> isSqliteDriverLoadFailure ? SQLITE_DRIVER_UNAVAILABLE : CONNECTION_FAILED -> rejectRequest/diagnostics` |
| BEH-002 | REQ-002 | lazy first query | none (documented) | unchanged |
| BEH-003 | REQ-003, AC-004 | README install | text | README |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No`
- Structural triggers:
  - *Behavior by absence*: ruled out. The new code comes from an explicit rule with its own result, and the fallback is the existing code.
  - *Responsibility overload*: `lifecycle.ts` is 484 lines and the change adds about 2 lines there. The detection rule lives in the driver-adapter file, which owns driver knowledge, keeping `lifecycle.ts` under 500.
  - *Vocabulary*: "driver" means `better-sqlite3` behind Prisma's adapter, consistent with `sqlite-driver-adapter.ts`.
- Root cause classification: `Missing Invariant`. The lifecycle owner exists but does not distinguish this failure class.
- Refactor needed now: `No`

## Legacy Removal Policy (Mandatory)

- Removed: README's "rejects with `CONNECTION_FAILED`" symptom text for this case.
- Compatibility kept: `None`. No dual code is returned.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `initializePrisma(options)` | Ready, or rejection with a stable code | `PrismaClientLifecycle` |

## Primary Execution Spine(s)

`App -> client.ts initializePrisma -> PrismaClientLifecycle.initialize -> performInitialization -> PrismaClient.$connect -> gated adapter connect -> PrismaBetterSqlite3.connect -> better-sqlite3 native load -> (throws) -> lifecycle catch -> classifier (sqlite-driver-adapter) -> InitializationStageFailure(code) -> rejectRequest (diagnostics) -> PrismaInitializationError`

## Ownership Map

- `sqlite-driver-adapter.ts`: owns knowledge of the SQLite driver. It gains `isSqliteDriverLoadFailure(error: unknown): boolean`.
- `PrismaClientLifecycle`: owns which stage code a failure gets. It asks the classifier.
- `initialization-error.ts`: owns codes and safe messages.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| README symptom "`initializePrisma` then rejects with `CONNECTION_FAILED` ..." | wrong after the change | the new code's name, the message pointer, and a lazy-path note |

## Interface Boundary Mapping

| Interface | Responsibility | Notes |
| --- | --- | --- |
| `isSqliteDriverLoadFailure(error: unknown): boolean` (internal, `sqlite-driver-adapter.ts`) | True when `error`, or an error in its `cause` chain (bounded depth, e.g. 5, cycle-safe), has `code === 'ERR_DLOPEN_FAILED'`, or a `message` starting with `Could not locate the bindings file` | No other heuristics. It must never throw. |
| `PrismaInitializationErrorCode` adds `'SQLITE_DRIVER_UNAVAILABLE'` | public | Message (no paths): `The SQLite driver (better-sqlite3) could not load its native module. Allow its build or rebuild it for this Node.js version; see "Allow the native SQLite build" in the repository_prisma README.` (wording may be tightened; keep the README section name) |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `src/lib/client/initialization-error.ts` | union member + message |
| `src/lib/client/sqlite-driver-adapter.ts` | export `isSqliteDriverLoadFailure` |
| `src/lib/client/lifecycle.ts` | in the `$connect()` catch (`:337-341`): `throw new InitializationStageFailure(isSqliteDriverLoadFailure(error) ? 'SQLITE_DRIVER_UNAVAILABLE' : 'CONNECTION_FAILED', error);` |
| tests | AC-001 cases (fake `$connect` rejections; the lifecycle tests already use fake clients); also a classifier unit test for cause nesting, cycles and non-Error values |
| `scripts/package-smoke/consumer-types.js` | add the code where the declaration smoke enumerates codes |
| `README.md` | (1) Make "Allow the native SQLite build" a heading (`###`) so the message can name it. Symptom: explicit `initializePrisma` rejects with `SQLITE_DRIVER_UNAVAILABLE`; with lazy binding, the first query throws the driver's own error ("Could not locate the bindings file", or "compiled against a different Node.js version"). Add "for a different Node.js/Electron version, rebuild it (`npm rebuild better-sqlite3`; for Electron, rebuild against Electron's Node)". (2) Code list: add `SQLITE_DRIVER_UNAVAILABLE`. (3) Install lines: `npm install repository_prisma@2`, `pnpm add repository_prisma@2 @prisma/client@7`, plus one short paragraph: pnpm 11+ skips versions younger than its minimum release age (about a day); with the major pinned, pnpm installs that major (it records a `minimumReleaseAgeExclude` entry) instead of silently installing the previous major. (4) Release section: on a major release, update the pinned major in the install lines. |
| `DESIGN.md` §E | one bullet: connect failures caused by an unloadable native driver are `SQLITE_DRIVER_UNAVAILABLE` (detection rule; falls back to `CONNECTION_FAILED` if the driver's failure shape changes; lazy path unchanged because Prisma rewraps coded adapter errors) |
| `CHANGELOG.md` `## Unreleased` | new code (additive); README pin and pnpm note |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `CONNECTION_FAILED` and add a sub-field | Rejected: a second channel for the same meaning |
| An uncoded custom error on the lazy path | Rejected (DEC-002) |

## Change Sequence

1. Code, message, classifier and mapping; unit tests (AC-001).
2. Declaration smoke code list; `npm run typecheck`, `npm test`, `npm run test:package` (non-root).
3. README, DESIGN.md, CHANGELOG.
4. E2E per TESTING.md (packed tarball, fresh consumers, ESM and CJS):
   - AC-002: remove the consumer's `better-sqlite3` build, and run under a different Node ABI (e.g. build under Node 22 and run with Node 24). Expect `SQLITE_DRIVER_UNAVAILABLE`; after the README fix, `RESULT ok`.
   - AC-004: npm 12 and pnpm 11/12 consumers following only the README with the pinned major. While a version is under a day old, check the pnpm exclusion behavior. If none is under a day old at test time, record that `probes/README.md` already measured it on 2.0.0.
5. CI green on `main` after merge.

## Guidance For Implementation

- Reproduction to start from: `probes/driver-failure-inspect.mjs` against a consumer with `better-sqlite3/build` removed (`probes/README.md`).
- Keep `lifecycle.ts` under 500 lines.
- `TESTING.md`: add a line under "Choosing The Layer" only if a new way of testing the real driver failure is introduced (for example a scripted consumer case). Otherwise leave it.
