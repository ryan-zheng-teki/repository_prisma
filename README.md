# Repository Prisma Pattern

This repository demonstrates an **Implicit Transaction Pattern** for Prisma in Node.js, inspired by "Repository Pattern + SQLAlchemy" in Python.

It solves the common problem of "Prop-Drilling" transaction objects (`tx`) through your service layers.

📖 **[Read the Full Design Document](./DESIGN.md)** for architecture details.

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

The selected value is always passed explicitly to the root `PrismaClient`; Prisma does not perform
a second, independent environment lookup. Relative physical SQLite URLs such as
`file:./runtime/app.db` are resolved against `process.cwd()` before client construction. Query
parameters are preserved.

For a physical SQLite datasource, explicit initialization connects and verifies that SQLite's
`main` database is the selected physical file. With `enableWAL: true`, initialization additionally
activates WAL and performs a separate read to prove the effective journal mode is `wal`. WAL is
strict: activation or verification failure rejects instead of warning and continuing. WAL is not
supported for non-SQLite or SQLite in-memory targets.

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

This behavior-only release does not change the Prisma schema, migrations, or persisted
data, so no data migration is required.

## ESM and CommonJS Package Loading

The package preserves both published entrypoints: ESM consumers resolve `exports.import`,
and CommonJS consumers resolve `exports.require`. The external `@prisma/client` peer remains
external and is supplied by the consuming application. At runtime, the package reads its
CommonJS-generated Prisma peer through the default namespace and then selects the required
`PrismaClient` or `Prisma` value. This avoids depending on Node's heuristic CommonJS named-export
detection while preserving the existing public exports and Prisma behavior.

Type-only Prisma references are kept compile-time-only with explicit `import type` declarations;
no peer version, schema, migration, or database change is required for this package-loading fix.

## Advanced: Root Client Access (Use Carefully)

The exported `rootPrismaClient` is intended for app-level tasks (migrations, health checks, cleanup scripts).
Avoid using it inside transactional flows, or you will bypass ALS and lose the implicit transaction behavior.

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

If you want explicit provider selection, set `PRISMA_DATASOURCE_PROVIDER=sqlite|postgresql|mysql|...`
to override auto-detection (which uses `DATABASE_URL`).

## Testing

Install dependencies first (`npm install`). Then `npm test` automatically syncs the Prisma schema to a dedicated SQLite file (`test.db`)
and runs `prisma generate` to ensure the correct client is used for this repo.
You can override it by setting `DATABASE_URL_TEST`. If you set a SQLite file URL, prefer an absolute path
(`file:/...`). On macOS, Prisma's schema engine can fail on relative `file:./...` URLs, while Linux often accepts them.
The test script normalizes relative `file:` URLs to absolute paths for cross-platform reliability.

## Release (Tag-Based)

We use a tag-based release flow. For this already-versioned 1.0.10 release, do not run
`npm version patch`, because it would advance the package to 1.0.11. Create and push the
explicit release tag instead:

```bash
git tag -a v1.0.10 -m "1.0.10"
git push origin main --follow-tags
```

If you prefer to tag manually via a Git UI, create the same annotated `v1.0.10` tag and
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
3.  **`src/lib/client/lifecycle.ts`**: Owns the one raw root client, explicit datasource identity, readiness state, failure cleanup, and shutdown.
4.  **`src/lib/forwarding-proxy.ts`**: Resolves root or ALS methods/delegates at invocation time without retaining stale raw owners.
5.  **`src/lib/base-repository.ts`**: Uses `getPrismaClient()` internally, so every query automatically uses the correct state.
