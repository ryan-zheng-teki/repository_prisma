# Investigation Notes

## Investigation Meta

- Package identifier: `repository-prisma-8` (Project Task `repository-prisma-8`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`; repository-prisma-4 merged in)
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8`
- Repository mode: `Git`
- Task branch: `codex/repository-prisma-8` (no upstream)
- Resolved base: `origin/main@4a2f31235e256695771e94fcb40b3c978b6cab58` (2.1.0 released; fetched 2026-11-05)
- Finalization target: `origin/main`
- Current solution revision ID: `SR-001`
- Authorities read: requirements-engineering, finding-the-cause, ticket-scope, architecture-design, design-principles, project-documents (all read in this conversation; updated versions re-read 2026-11-04); project `DESIGN.md`, `TESTING.md`, `AGENTS.md`
- Investigation status: Part A complete. Part B investigated with a real-Postgres feasibility probe; its direction is waiting for the user's decision.

## Part A Sources And Findings

| Item | Source / Command | Finding | Established |
| --- | --- | --- | --- |
| A1 | `.github/workflows/release.yml:16-19` | `actions/setup-node@v5` with `registry-url`; `ci.yml:13` uses `setup-node@v5` without `registry-url` | Read |
| A1 | `gh api repos/actions/setup-node/contents/src/authutil.ts?ref=v5` | v5 writes `_authToken=${NODE_AUTH_TOKEN}`, the registry and `always-auth=${alwaysAuth}` into `.npmrc`; exports a dummy `NODE_AUTH_TOKEN` if unset | Read |
| A1 | `gh api .../releases/tags/v6.1.0`; `authutil.ts?ref=v6` | v6.1.0: "Remove always-auth configuration handling" (PR 1436). v6 still writes `_authToken=${NODE_AUTH_TOKEN}` and exports the same dummy token. So npm/OIDC behavior is unchanged apart from the removed line | Read |
| A1 | `releases/tags/v6.0.0` | Only breaking change: "Limit automatic caching to npm". `release.yml` has no `cache` input and the package has no `packageManager` field, so nothing changes; `ci.yml` sets `cache: npm` explicitly | Read |
| A1 | `releases/tags/v7.0.0` | v7 removes the dummy `NODE_AUTH_TOKEN` export, which could change publishing; not chosen | Read |
| A1 | release-2-1-0 `evidence/REL-02-publication.log` | `always-auth: false` input echoed; npm warns `Unknown user config "always-auth"` on every npm command after the npm upgrade | Read |
| A2 | `TESTING.md:76-78` | Advice is only the `minimumReleaseAgeExclude` entry | Read |
| A2 | release-2-1-0 `follow-ups.md` FU-002; `evidence/REL-05`, `REL-06a/b` | A pnpm metadata cache from before the publish made pnpm install 2.0.0 despite the exclusion. An isolated empty cache plus the exclusion gave 2.1.0. Check with `pnpm cache view repository_prisma` | Reproduced (by delivery) |

## Part B Sources And Findings

| Source / Probe | Finding | Established |
| --- | --- | --- |
| `src/lib/client/lifecycle.ts:75-83` (`clientFactoryFrom`) | The library always builds `createSqliteDriverAdapter(target)` | Read |
| `datasource-target.ts` (2.0.0 design) | Every binding starts from a URL; non-SQLite URLs -> `UNSUPPORTED_DATASOURCE_PROVIDER`; `bindingKey` from the URL drives `DATASOURCE_CONFLICT` | Read |
| `lifecycle.ts` `performInitialization` | Readiness = `$connect`, then SQLite identity (`PRAGMA database_list`) for file targets, then WAL. It already branches by target kind | Read |
| `sqlite-connection-gate.ts`; DESIGN.md DC-001 | The gate serializes work on one SQLite connection; needed because better-sqlite3 has one connection | Read |
| Real Postgres probe (`probes/pg-adapter-probe.mjs`, `probes/pg-schema.prisma`): Docker `postgres:17`; fresh consumer of published `repository_prisma@2.1.0` + `@prisma/client`/`@prisma/adapter-pg`/`prisma` 7.10.1, prisma-client-js with a `postgresql` schema; scratch dist patched with one line: `adapter: globalThis.__probeAdapter ?? createSqliteDriverAdapter(target)` (a `file:` DATABASE_URL satisfies the SQLite-only resolution) | Lazy path: CRUD OK; `runInTransaction` commit and rollback OK. CR-01 isolation shape: `seenUncommitted: 0`, the independent write survived, the in-tx row is gone (correct without the gate; pg pool connections). Two concurrent transactions overlap: 317 ms for 2×300 ms. Explicit `initializePrisma`: `DATABASE_IDENTITY_MISMATCH`, because the SQLite readiness runs `PRAGMA` on Postgres (`42601 syntax error at or near "PRAGMA"`) | Reproduced / Measured |
| Consumers | No known non-SQLite consumer (the only known consumer, autobyteus-server-ts, is SQLite) | Read (earlier tickets) |

Temporary diagnostics: none in the worktree. The dist patch was made in `/tmp/pgprobe` only and reverted; the Postgres container was removed.

## Part B Analysis

What is database-agnostic and works today on Postgres with a supplied adapter (Measured): ALS transactions, repositories, the `prisma`/`rootPrismaClient` proxies, logging policy, client registration, and Prisma's own transaction isolation.

What would have to change to support it cleanly:
1. **A public way to supply the adapter that works for lazy and explicit binding.** For example `registerDriverAdapter(adapterFactory)`, mirroring `registerPrismaClient`. An `initializePrisma({ adapter })` option alone would leave lazy binding SQLite-only.
2. **A new binding target kind ("application adapter").**
   - Identity and conflict come from the adapter object instead of a URL.
   - `datasourceUrl` and the environment URL are not used.
   - `UNSUPPORTED_DATASOURCE_PROVIDER` stays for URLs without an adapter.
3. **Readiness for that kind is `$connect` only.** There is no SQLite identity check. `enableWAL: true` is rejected (`WAL_UNSUPPORTED_PROVIDER`).
4. **The connection gate.**
   - Pooled adapters (pg, mariadb, mssql, neon) must not be gated: gating would serialize every request for no reason.
   - A supplied SQLite adapter needs the gate if it has one connection (better-sqlite3); libsql already serializes. Rule: gate when `adapter.provider === 'sqlite'`.
5. **Library-built-only guarantees are lost.** The DateTime INTEGER format and the path/query handling are guaranteed only for library-built SQLite; with a supplied adapter they are the application's responsibility (documented).
6. **Tests and CI.**
   - A real Postgres suite with its own schema and generated client, plus a third typecheck program if it carries types.
   - A Postgres service container in CI.
   - TESTING.md gets a new layer.
7. **Docs and semver.** README, DESIGN.md and CHANGELOG; a new public API, so a minor release later.

Size and risk if built: `Medium`, `High` (public API, lifecycle identity and readiness, CI infrastructure).
