# Repository Prisma Pattern

This repository demonstrates an **Implicit Transaction Pattern** for Prisma in Node.js, inspired by "Repository Pattern + SQLAlchemy" in Python.

It solves the common problem of "Prop-Drilling" transaction objects (`tx`) through your service layers.

📖 **[Read the Full Design Document](./DESIGN.md)** for architecture details.

## Requirements and Setup (Prisma 7)

- Prisma 7 (`prisma` and `@prisma/client` 7.x) with a **SQLite** database.
- Node.js `^20.19 || ^22.12 || >=24` and TypeScript 5.4 or newer.
- Still on Prisma 5? Stay on `repository_prisma` 1.0.x.

Install the library and the Prisma CLI:

```bash
npm install repository_prisma
npm install -D prisma@7
```

npm 7+ and pnpm install the peers `@prisma/client` and `@prisma/adapter-better-sqlite3`
automatically. With Yarn or `--legacy-peer-deps`, add them yourself:
`npm install @prisma/client@7 @prisma/adapter-better-sqlite3@7`.

Keep the `prisma-client-js` generator and leave the URL out of the schema:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}
```

Give the Prisma CLI its URL in `prisma.config.ts`, and generate the client (Prisma 7 no longer
does this on install):

```typescript
// prisma.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
```

```bash
npx prisma generate
```

Your code does not change, and it does not need a driver adapter: the library builds one.

```typescript
import { initializePrisma } from 'repository_prisma';

await initializePrisma({ datasourceUrl: 'file:./app.db' });
```

Good to know:

- `DateTime` values are stored as INTEGER unix milliseconds, as Prisma 5 stored them, so existing
  databases keep working without a migration. If your application also builds its own Prisma 7
  client for the same database, give it the same format:
  `new PrismaBetterSqlite3({ url }, { timestampFormat: 'unixepoch-ms' })`. Prisma 7's default
  (ISO-8601 text) would make date filters miss rows written in the other format.
- URL query parameters such as `?connection_limit=1` no longer affect the connection.
- A non-SQLite URL (for example `postgresql://...`) is rejected with
  `UNSUPPORTED_DATASOURCE_PROVIDER`.
- `@prisma/adapter-better-sqlite3` uses the native `better-sqlite3` module. Prebuilt binaries cover
  the common platforms; on others, npm builds it and needs a C++ toolchain.

## The Problem: Explicit Transactions (Standard Pattern)

In standard Prisma, you must pass the transaction client explicitly:

```typescript
// Standard Prisma
await prisma.$transaction(async (tx) => {
  await tx.user.create(...); // MUST use 'tx', not 'prisma'
  await tx.post.create(...); // MUST use 'tx', not 'prisma'
})
```

If you forget to use `tx` and use the global `prisma` instead, your query runs OUTSIDE the transaction. This is error-prone.

## The Solution: Implicit Transactions

We use Node.js `AsyncLocalStorage` to store the transaction context globally for the request.

We provide **Two Patterns** to use this.

### Pattern 1: Decorators (Python/NestJS Style)

Best if you like clean, declarative code and are using TypeScript with `experimentalDecorators`.

```typescript
import { Transactional } from 'repository_prisma';

class UserService {
  @Transactional()
  async createUserAndPost() {
    // Works automatically! no 'tx' argument needed.
    await this.userRepo.create(...)
    await this.postRepo.create(...)
  }
}
```

### Pattern 2: Higher-Order Function (Node.js/Functional Style)

Best if you prefer explicit scoping and want to avoid experimental decorators.

```typescript
import {
  runInTransaction,
  type RunInTransactionOptions,
} from 'repository_prisma';

class UserService {
  async createUserAndPost() {
    const transactionOptions: RunInTransactionOptions = {
      maxWait: 2_000,
      timeout: 10_000,
    };

    await runInTransaction(async () => {
         await this.userRepo.create(...)
         await this.postRepo.create(...)
    }, transactionOptions);
  }
}
```

The options are Prisma interactive-transaction settings. When supplied, the exact
object is passed to Prisma when the outer transaction opens. When omitted,
`runInTransaction(callback)` retains Prisma's defaults. Prisma owns wait behavior,
timeouts, isolation enforcement, commit, and rollback; this library does not create
timers or retries.

Nested `runInTransaction` calls reuse the active AsyncLocalStorage transaction rather
than opening another physical transaction. Options on a nested call are ignored because
the outer transaction boundary remains authoritative.

On Prisma 7 the library's SQLite client uses one database connection. To keep concurrent
requests isolated, the library lets one transaction use that connection at a time:

- Operations outside a transaction (repositories, `prisma`, `rootPrismaClient`) wait while
  another request's transaction is open. They never see its uncommitted rows, and their
  writes are not undone if it rolls back.
- Transactions queue. A queued transaction fails with Prisma's `P2028` error ("Unable to
  start a transaction in the given time") when its `maxWait` expires (Prisma's default is
  2000 ms). If transactions in your application can wait longer, raise it:
  `runInTransaction(fn, { maxWait: 10_000 })`.

Keep transactions short: while one is open, other database work waits.

### Optional: Context-Aware Prisma Client (No Repository)

If you want to skip repositories for a quick script or advanced Prisma queries, use the exported
`prisma` proxy. It automatically uses the transaction client if one is active.

```typescript
import { prisma, runInTransaction } from 'repository_prisma';

await runInTransaction(async () => {
  await prisma.user.create({ data: { email: 'safe@example.com' } });
});
```

## Initialization and Datasource Readiness (Optional)

Prisma still connects lazily on the first operation. Applications that need a startup readiness
boundary can initialize explicitly:

```typescript
import { initializePrisma } from 'repository_prisma';

await initializePrisma({
  datasourceUrl: 'file:./runtime/app.db',
  enableWAL: true,
});
```

Package imports do not load `.env` files or mutate `process.env`. Applications and
command invocations must preload or provide their environment explicitly before
initialization; importing the package does not require a datasource.

Query logging is off by default. To temporarily enable Prisma query logs, either set
`PRISMA_LOG_QUERIES` to `1`, `true`, `yes`, or `on` (case-insensitive, with surrounding
whitespace ignored), or pass the typed option:

```typescript
await initializePrisma({
  datasourceUrl: 'file:./runtime/app.db',
  logQueries: true,
});
```

The typed `logQueries` option takes precedence over `PRISMA_LOG_QUERIES`; `false` is an
explicit opt-out. Query logs can contain SQL text and sensitive values, so enable them
only temporarily and use the application's appropriate redaction and retention controls.
When a root client was created lazily, a later differing typed policy is rejected with
`LOGGING_POLICY_CONFLICT`; call and await `shutdownPrisma()` before rebinding a new policy.

`datasourceUrl` is optional. A non-empty explicit value wins. Otherwise the library selects one
environment value in this order:

1. `DATABASE_URL_TEST` when `NODE_ENV === "test"` and it is non-empty;
2. `DATABASE_URL` when it is non-empty;
3. `DATABASE_URL_TEST` when it is non-empty.

The library opens the selected SQLite database itself, through Prisma's better-sqlite3 driver
adapter; Prisma does not perform a second, independent environment lookup. Relative physical
SQLite URLs such as `file:./runtime/app.db` are resolved against `process.cwd()` before the
database is opened. Query parameters are kept as part of the target's identity, so two URLs that
differ only in their query are different targets. They do not change the opened file and have no
effect on the connection.

For a physical SQLite datasource, explicit initialization connects and verifies that SQLite's
`main` database is the selected physical file. With `enableWAL: true`, initialization additionally
activates WAL and performs a separate read to prove the effective journal mode is `wal`. WAL is
strict: activation or verification failure rejects instead of warning and continuing. WAL is not
supported for SQLite in-memory targets (`WAL_UNSUPPORTED_PROVIDER`).

Only SQLite datasources are supported. Explicit initialization and lazy binding reject any other
datasource URL with `UNSUPPORTED_DATASOURCE_PROVIDER`, before a client is built; a client that is
already bound stays bound and usable.

### Initialization Errors, Diagnostics, and Recovery

Initialization rejects with `PrismaInitializationError`. Its `code` and message are stable and do
not contain datasource URLs, credentials, filesystem paths, or raw provider output.

```typescript
import {
  initializePrisma,
  PrismaInitializationError,
  shutdownPrisma,
} from 'repository_prisma';

try {
  await initializePrisma({
    enableWAL: true,
    onDiagnostic: ({ code, cause }) => {
      // Opt in deliberately. `cause` can contain provider-sensitive details.
      secureApplicationLogger.error({ code, cause });
    },
  });
} catch (error) {
  if (error instanceof PrismaInitializationError) {
    console.error(error.code); // safe stable classification
  }
  throw error;
}

// Required before intentionally switching an already-bound datasource.
await shutdownPrisma();
await initializePrisma({ datasourceUrl: 'file:./runtime/replacement.db' });
```

Available codes are:

- `DATABASE_URL_MISSING`
- `UNSUPPORTED_DATASOURCE_PROVIDER`
- `DATASOURCE_CONFLICT`
- `CONNECTION_FAILED`
- `DATABASE_IDENTITY_MISMATCH`
- `WAL_UNSUPPORTED_PROVIDER`
- `WAL_ACTIVATION_FAILED`
- `WAL_VERIFICATION_FAILED`
- `LOGGING_POLICY_CONFLICT`
- `CLIENT_NOT_READY`

The library does not print caught initialization causes. `onDiagnostic` is the only opt-in raw-cause
channel in this API, and callback failures do not replace the stable initialization error. A failed
readiness attempt blocks root/repository access until a corrected explicit initialization succeeds
or `shutdownPrisma()` clears the lifecycle. Initializing a different target while one is bound
rejects with `DATASOURCE_CONFLICT`; call and await `shutdownPrisma()` before rebinding.

Moving to Prisma 7 does not change the Prisma schema models, migrations, or persisted data:
`DateTime` values keep their INTEGER (unix milliseconds) representation, so no data migration is
required.

## ESM and CommonJS Package Loading

The package preserves both published entrypoints: ESM consumers resolve `exports.import`,
and CommonJS consumers resolve `exports.require`. Both Prisma peers, `@prisma/client` and
`@prisma/adapter-better-sqlite3`, stay external and are supplied by the consuming application.
Importing the package loads no native module; better-sqlite3 is loaded only when a database is
opened. At runtime, the package reads its
CommonJS-generated Prisma peer through the default namespace and then selects the required
`PrismaClient` or `Prisma` value. This avoids depending on Node's heuristic CommonJS named-export
detection while preserving the existing public exports and Prisma behavior.

Type-only Prisma references are kept compile-time-only with explicit `import type` declarations.

## Advanced: Root Client Access (Use Carefully)

The exported `rootPrismaClient` is intended for app-level tasks (migrations, health checks, cleanup scripts).
Avoid using it inside transactional flows, or you will bypass ALS and lose the implicit transaction behavior.
Do not call it inside a transaction callback: the call waits for that same transaction to end,
so the transaction fails with Prisma's transaction timeout (`P2028`). The root client keeps working
afterwards. Use `prisma` or a repository inside transactions instead.

`rootPrismaClient` and the context-aware `prisma` export are stable forwarding boundaries. Captured
model delegates and methods resolve the current lifecycle/ALS client when invoked, including after
shutdown and reinitialization. Root `$connect()` and `$disconnect()` route through
`initializePrisma()` and `shutdownPrisma()` so they cannot bypass lifecycle state.

This guarantee applies to the exported forwarding boundaries and handles captured from them before
invocation. Caller-created Prisma-derived surfaces (for example a client returned by `$extends`) and
already-invoked deferred Prisma values are owned by the caller and cannot be revoked by this library.

## Example

See `examples/implicit-transaction-demo.ts` for a runnable demo.

## Optional: No-Quote Repository Helper

If you prefer to avoid string literals like `'User'`, you can use `BaseRepository.forModel`:

```typescript
import { BaseRepository, Models } from 'repository_prisma';

export class UserRepository extends BaseRepository.forModel(Models.User) {}
export class PostRepository extends BaseRepository.forModel(Models.Post) {}
```

`defineRepository` is still available as a short alias if you prefer it.

## Case-Insensitive Filters (SQLite-Safe)

SQLite does **not** support Prisma's `mode: "insensitive"` string filters. Use the helpers below
to avoid runtime errors and optionally apply a fallback in memory.

```typescript
import { buildContainsFilter, filterContainsCaseInsensitive, supportsCaseInsensitiveMode } from 'repository_prisma';

const where = { name: buildContainsFilter("Alice", { caseInsensitive: true }) };
const rows = await repo.findMany({ where });

// If you need true case-insensitive behavior on SQLite, apply in-memory fallback:
const filtered = supportsCaseInsensitiveMode()
  ? rows
  : filterContainsCaseInsensitive(rows, "Alice", (row) => row.name);
```

If you want explicit provider selection for these filter helpers, set
`PRISMA_DATASOURCE_PROVIDER=sqlite|postgresql|mysql|...` to override auto-detection (which uses
`DATABASE_URL`). The library's own client supports SQLite only.

## Testing

Install dependencies first (`npm install`; its `prepare` script runs `prisma generate`). Then `npm test` automatically syncs the Prisma schema to a dedicated SQLite file (`test.db`)
and runs `prisma generate` to ensure the correct client is used for this repo.
You can override it by setting `DATABASE_URL_TEST`. If you set a SQLite file URL, prefer an absolute path
(`file:/...`). On macOS, Prisma's schema engine can fail on relative `file:./...` URLs, while Linux often accepts them.
The test script normalizes relative `file:` URLs to absolute paths for cross-platform reliability.

## Release (Tag-Based)

We use a tag-based release flow. The tag must match the `version` in `package.json`. The
`Unreleased` changes in `CHANGELOG.md` are breaking, so they need a major version before they
are released. Create and push the annotated release tag:

```bash
git tag -a vX.Y.Z -m "X.Y.Z"
git push origin main --follow-tags
```

If you prefer to tag manually via a Git UI, create the same annotated tag and
push it with the repository's normal tag workflow:

```bash
git push origin main --tags
```

Pushing a tag like `v1.2.3` triggers GitHub Actions to build and publish.
Trusted Publishing is enabled for this package.

Source changes are not published until this tag-based release flow is explicitly performed; updating
initialization behavior or documentation alone does not publish a release.

## How it Works

1.  **`src/lib/context.ts`**: Holds the `AsyncLocalStorage`.
2.  **`src/lib/prisma-manager.ts`**: The `getPrismaClient()` function checks the storage. If a transaction is active, it returns the transaction client. If not, it returns the root forwarding boundary.
3.  **`src/lib/client/lifecycle.ts`**: Owns the one raw root client, explicit datasource identity, readiness state, failure cleanup, and shutdown. It builds the client with the SQLite driver adapter from `src/lib/client/sqlite-driver-adapter.ts`.
4.  **`src/lib/forwarding-proxy.ts`**: Resolves root or ALS methods/delegates at invocation time without retaining stale raw owners.
5.  **`src/lib/base-repository.ts`**: Uses `getPrismaClient()` internally, so every query automatically uses the correct state.
