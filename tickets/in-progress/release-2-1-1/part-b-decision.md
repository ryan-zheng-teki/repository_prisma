# Decision: Application-Supplied Prisma Driver Adapter — Not Built Now (repository-prisma-8 Part B)

- Date: 2026-11-05
- Decided by: the user, in the Solution Designer's conversation. Asked whether to build it now or record a decision not to build it yet, the user answered: "yess. since noboday needs it nyet. lets keep it in todo task, and do one release for the current ticket".
- Recorded by: Solution Designer
- Status: **Deferred**. Kept as a TODO Project Task, requested from `/project_task_manager`.

## The Idea

An application passes in its own Prisma driver adapter (for example `@prisma/adapter-pg` for Postgres), and the library uses it instead of building its SQLite one. Today the library builds `@prisma/adapter-better-sqlite3` itself, so it supports SQLite only, and other URLs are rejected with `UNSUPPORTED_DATASOURCE_PROVIDER`.

## Why Not Now

- No known consumer needs it; the only known consumer (autobyteus-server-ts) uses SQLite.
- Building it adds permanent public API, a second binding mode in the client lifecycle, and a real-Postgres test suite in CI to maintain, at about `Medium` size and `High` risk.
- The evidence shows it can be added later cleanly, without breaking anything.

## Evidence (2026-11-05)

Real Postgres 17 (Docker). A fresh consumer of the published `repository_prisma@2.1.0` with `@prisma/adapter-pg` 7.10.1; the scratch dist was patched with one line to use the supplied adapter. Probe: `tickets/done/repository-prisma-8/probes/pg-adapter-probe.mjs`; details in `tickets/done/repository-prisma-8/investigation-notes.md` § Part B.

- Lazy path: CRUD, `runInTransaction` commit and rollback work.
- Concurrent-request isolation is correct without the SQLite connection gate: pooled connections, `seenUncommitted: 0`, the independent write survived the other request's rollback.
- Two concurrent transactions overlap (317 ms for 2×300 ms).
- Explicit `initializePrisma` fails with `DATABASE_IDENTITY_MISMATCH`, because the SQLite readiness runs `PRAGMA` on Postgres.

## Design Sketch For When It Is Built

1. A public `registerDriverAdapter(adapter)` that covers lazy and explicit binding, mirroring `registerPrismaClient`.
2. A new binding kind with identity and conflict detection from the adapter object; the URL and environment are not used. `UNSUPPORTED_DATASOURCE_PROVIDER` stays for URLs without an adapter.
3. Readiness is `$connect` only; `enableWAL: true` is rejected (`WAL_UNSUPPORTED_PROVIDER`).
4. The connection gate (DESIGN.md DC-001) applies only when `adapter.provider === 'sqlite'`. Pooled adapters must not be gated.
5. The library-built SQLite guarantees (DateTime INTEGER format, path and query handling) become the application's responsibility, documented.
6. A real-Postgres test suite with its own schema and generated client, a CI Postgres service, a TESTING.md layer, README/DESIGN/CHANGELOG, and a minor release.

## Trigger

Build it when the first real non-SQLite consumer needs it.
