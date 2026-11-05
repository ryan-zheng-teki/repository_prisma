# Changelog

## 2.1.0

- New initialization code `SQLITE_DRIVER_UNAVAILABLE`: `initializePrisma` reports it when
  `better-sqlite3` cannot load its native module (not built, for example when npm 12+ or pnpm
  blocked its install script, or built for another Node.js version). Its message points to the
  README's "Allow the native SQLite build" step and contains no path; `onDiagnostic` gets the
  driver's error. Other connection failures stay `CONNECTION_FAILED`. With lazy binding, the first
  query still throws the driver's own error.
- README: the install lines pin the major (`repository_prisma@2`), so pnpm 11+ installs it even
  while the newest release is younger than pnpm's minimum release age, instead of silently
  installing the previous major. The release guide reminds maintainers to update the pin on a
  major release.
- Support for Prisma 7's `prisma-client` generator (ESM and `moduleFormat = "cjs"` clients):
  register the generated client module once with the new `registerPrismaClient()` and declare
  its types in the new `PrismaClientRegistry` interface; every runtime feature and public type
  then follows that client. `registerPrismaClient` accepts only the declared module: without the
  declaration the call fails to compile, and the error names the declaration to add. The README
  has a copy-paste `db.ts`, and `examples/prisma-client-generator/` shows the setup.
  Non-breaking: prisma-client-js applications change nothing, and their public types are
  identical.
- Importing the package no longer loads `@prisma/client`; the prisma-client-js client is loaded
  the first time a client or `Models` is needed. `Models` is now a read-only view that reads the
  client's model names on access.
- New initialization codes: `PRISMA_CLIENT_UNAVAILABLE` (no registered client and no
  prisma-client-js output) and `PRISMA_CLIENT_CONFLICT` (a different client registered while one
  is bound). `registerPrismaClient()` throws a `TypeError` for an argument that is not a
  generated client module.
- Build: the bundles target es2020 (was es2018).
- README: npm 12+ and pnpm 10+ skip `better-sqlite3`'s native build by default; the setup section
  shows the symptom and how to allow it (npm, pnpm 11+, pnpm 10). pnpm users add `@prisma/client`
  directly. The earlier "pnpm installs the peers automatically" wording is corrected.
- Repository: `allowScripts` approves only `better-sqlite3`'s install script (pinned) and denies
  the others; CI installs with `--strict-allow-scripts`.
- Repository: the package smoke is split into a runner and one module per check area, with no
  behavior change; it also reads npm 12's `npm pack --json` output.
- Remove the unused `uuid` runtime dependency: consumers no longer install it. No API change.
- Fix the dev tooling advisories reported by `npm audit` (vitest 4.1.x and its vite, rollup and
  postcss chain); `npm audit` reports 0 vulnerabilities.
- CI and the release workflow run on Node 24 (`actions/checkout@v5`, `actions/setup-node@v5`).
  The release workflow upgrades npm to `^11.5.1` for trusted publishing instead of pinning it.
- `npm run test:package` passes as root: the read-only WAL case is skipped, with the reason
  printed, because root ignores file permissions.

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
