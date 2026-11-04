# Changelog

## 2.0.0

- **Breaking:** Requires Prisma 7. The peers are `@prisma/client ^7.10.1` and the new
  `@prisma/adapter-better-sqlite3 ^7.10.1` (native better-sqlite3), which npm 7+ and pnpm install
  automatically. Prisma 5 users stay on 1.0.x.
- **Breaking:** Only SQLite datasources are supported. Explicit initialization and lazy binding
  reject any other URL with the new code `UNSUPPORTED_DATASOURCE_PROVIDER`; the message contains
  no URL or credentials.
- **Breaking:** Declares `engines.node` `^20.19 || ^22.12 || >=24` (Prisma 7's range);
  TypeScript 5.4 or newer is required.
- The library builds the root client with Prisma's better-sqlite3 driver adapter. SQLite
  consumers' code and the public API are unchanged.
- `DateTime` values keep their INTEGER unix-millisecond representation
  (`timestampFormat: 'unixepoch-ms'`), so databases written by Prisma 5 need no migration.
- Transactions stay isolated between concurrent requests, as on Prisma 5: the adapter has one
  connection, so the library lets one transaction use it at a time. Work outside a transaction
  waits while another request's transaction is open, and transactions queue. A queued
  transaction fails with Prisma's `P2028` when its `maxWait` (default 2000 ms) expires; raise it
  with `runInTransaction(fn, { maxWait })`.
- **Breaking:** A `rootPrismaClient` call inside a transaction callback (already discouraged) now
  waits for that transaction, which then fails with Prisma's transaction timeout. Use `prisma` or
  a repository inside transactions.
- SQLite URL query parameters no longer affect the connection; they still identify the target.
  The opened file never includes the query string.
- Repository toolchain: the schema datasource has no `url` (the CLI reads `prisma.config.ts`),
  a `prepare` script runs `prisma generate`, and CI no longer uses the removed
  `--skip-generate` flag.

## 1.0.10

- Fix ESM package loading with CommonJS-generated `@prisma/client` peers by consuming runtime
  values through the peer's default namespace instead of heuristic named exports.
- Mark package-source Prisma type references as explicit `import type` dependencies and add a
  synthetic CommonJS-peer ESM regression probe.
- Preserve the CommonJS entrypoint, public exports, peer range, Prisma schema, migrations, and
  persisted data.

## 1.0.9

- Add exported `RunInTransactionOptions` support for Prisma interactive-transaction
  `maxWait`, `timeout`, and `isolationLevel` settings.
- Forward an explicitly supplied options object unchanged when the outer HOF
  transaction opens while preserving Prisma's one-argument defaults when omitted.
- Keep nested HOF calls on the existing AsyncLocalStorage transaction; inner options
  do not reconfigure the outer transaction.
- No Prisma peer-range, schema, migration, persisted-data, decorator, repository, or
  client-lifecycle changes are included.

## 1.0.8

- Make Prisma query logging opt-in with `PRISMA_LOG_QUERIES` or the typed
  `initializePrisma({ logQueries })` option; defaults are `info`, `warn`, and `error`.
- Remove automatic `.env` loading from package imports and Prisma CLI configuration.
  Applications, scripts, and CI must provide environment values explicitly.
- Reject a differing logging policy after lazy binding with
  `LOGGING_POLICY_CONFLICT`; shut down before rebinding.
- No Prisma schema, migration, or persisted-data changes are included.

Query logs may contain SQL text or sensitive values. Enable them temporarily and use
application-owned redaction and retention controls.
