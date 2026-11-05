# Investigation Notes

## Investigation Meta

- Package identifier: `repository-prisma-7` (Project Task `repository-prisma-7`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7`
- Repository mode: `Git`
- Task branch: `codex/repository-prisma-7-driver-error-and-release` (no upstream)
- Resolved base: `origin/main@32f003df6c695730d915b5c654d9313dad17191c` (fetched 2026-11-05; contains repository-prisma-3, the prisma-client generator support)
- Finalization target: `origin/main`; Part B then tags the release commit on `main`
- Bootstrap result: Completed
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-04/05): `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md` (updated 2026-11-04, re-read), `architecture-design.md` (updated, re-read), `design-principles.md` (updated, re-read), `project-documents.md` (new, read); project `DESIGN.md`, `TESTING.md`, `AGENTS.md`
- Investigation status: Complete for Part A. Part B (release) is investigated when Part A is merged.

## Request

Task repository-prisma-7 (user, 2026-11-05: merge the remaining items and the release into one Task).
- Part A:
  - (FU-001) Report a missing SQLite native module with its own stable code or message, or give an alternative.
  - (FU-003) Pin the major in the README install lines and document pnpm's minimum-release-age pitfall.
- Part B: release (recommended 2.1.0) via the README tag-based flow after Part A is merged and CI is green; this is the first real run of the Node 24 release workflow.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-11-05 | Code | `src/lib/client/lifecycle.ts:337-341` | `performInitialization`: any `$connect()` failure -> `InitializationStageFailure('CONNECTION_FAILED', error)`; the raw cause goes only to `onDiagnostic`. File is 484 lines |
| 2026-11-05 | Code | `src/lib/client/sqlite-driver-adapter.ts` | Owner of how the library opens SQLite (path, memory, timestamp format, connection gate) |
| 2026-11-05 | Code | `src/lib/client/sqlite-connection-gate.ts:120` | `connect: async () => gateAdapter(await factory.connect())`: the adapter's `connect()` is where `better-sqlite3` loads its native module (Read: adapter `createBetterSQLite3Client`; better-sqlite3 `lib/database.js:48`) |
| 2026-11-05 | Code | `src/lib/client/initialization-error.ts` | Code union + `SAFE_ERROR_MESSAGES` record (compiler-enforced), no paths in messages |
| 2026-11-05 | Doc | README setup (lines 9-60), error list (376-395) | Native-build step is a paragraph "Allow the native SQLite build." naming `CONNECTION_FAILED` as the symptom; install lines unpinned (`npm install repository_prisma`, `pnpm add repository_prisma @prisma/client@7`) |
| 2026-11-05 | Doc | `CHANGELOG.md` `## Unreleased` | Additive changes only: `registerPrismaClient` / `PrismaClientRegistry`, new codes `PRISMA_CLIENT_UNAVAILABLE` / `PRISMA_CLIENT_CONFLICT`, lazy `@prisma/client` load, es2020 bundles, uuid removal, README/repo changes. Each states non-breaking (types identical, proven by `type-equality.typecheck.ts` per TESTING.md) |
| 2026-11-05 | Doc | `TESTING.md` | Layers and rules. For README setup changes, run a fresh consumer per package manager, without `--legacy-peer-deps`, following only the README, in ESM and CJS |

## Runtime, Probe, Or Reproduction Findings

Details and scripts: `probes/README.md`.

| Scenario | Observation | Established |
| --- | --- | --- |
| Missing native module, explicit init | `CONNECTION_FAILED`; cause = plain `Error` "Could not locate the bindings file. Tried: <13 absolute paths>", no `code` | Reproduced |
| Missing native module, lazy | first query throws that raw `Error` (paths in the message) | Reproduced |
| Native module for another Node ABI (built Node 22, run Node 24) | explicit: `CONNECTION_FAILED`, cause `code: 'ERR_DLOPEN_FAILED'`, message with the absolute module path. Lazy: `PrismaClientKnownRequestError` `code: 'ERR_DLOPEN_FAILED'` | Reproduced |
| Library error thrown from the adapter's `connect()` | uncoded `Error`: passes through to the lazy caller unchanged. Coded `PrismaInitializationError`: Prisma rewraps it into `PrismaClientKnownRequestError`, so it is not `instanceof PrismaInitializationError` | Reproduced (dist patched in a `/tmp` copy only) |
| pnpm 11.28.9 / 12.16.1, `pnpm add repository_prisma@2 @prisma/client@7` while `2.0.0` is ~15 h old | pnpm adds `minimumReleaseAgeExclude: repository_prisma@2.0.0` to `pnpm-workspace.yaml` and installs `^2.0.0` | Measured |
| pnpm 11.28.9 unpinned, 2026-11-04 (repository-prisma-6 API-07) | silently installs `repository_prisma 1.0.10` (Prisma 5 line) next to `@prisma/client 7.10.1` | Measured (earlier ticket) |
| npm 12.2.1 config | `min-release-age = null`: no age gate by default | Read (command output) |

Temporary diagnostics: none in the worktree. Dist patches were made only in `/tmp` probe copies and reverted.

## Persisted Data And State Facts

Not affected.

## Requirement Implications

- A stable library code is achievable cleanly only on the explicit `initializePrisma` path, which is also the only path that reports `CONNECTION_FAILED` today. On the lazy path, Prisma rewraps coded errors, and the driver's own error already names the cause.
- Detection needs the two failure forms: the `bindings` message, and Node's `ERR_DLOPEN_FAILED`. The latter also covers Electron/Node ABI mismatches, which matter for the known consumer.
- Pinning the major turns pnpm's silent fallback into the right major (Measured).
