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
import { runInTransaction } from 'repository_prisma';

class UserService {
  async createUserAndPost() {
    // Explicit wrapper
    await runInTransaction(async () => {
         await this.userRepo.create(...)
         await this.postRepo.create(...)
    });
  }
}
```

### Optional: Context-Aware Prisma Client (No Repository)

If you want to skip repositories for a quick script or advanced Prisma queries, use the exported
`prisma` proxy. It automatically uses the transaction client if one is active.

```typescript
import { prisma, runInTransaction } from 'repository_prisma';

await runInTransaction(async () => {
  await prisma.user.create({ data: { email: 'safe@example.com' } });
});
```

## Initialization (Optional)

If you want to eagerly connect or enable SQLite WAL mode, call:

```typescript
import { initializePrisma } from 'repository_prisma';

await initializePrisma({ enableWAL: true });
```

## Advanced: Root Client Access (Use Carefully)

The exported `rootPrismaClient` is intended for app-level tasks (migrations, health checks, cleanup scripts).
Avoid using it inside transactional flows, or you will bypass ALS and lose the implicit transaction behavior.

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

## Testing

`npm test` automatically syncs the Prisma schema to a dedicated SQLite file (`test.db`).
You can override it by setting `DATABASE_URL_TEST`.

## Release (Tag-Based)

We use a tag-based release flow:

```bash
npm version patch   # or minor/major
git push --follow-tags
```

Pushing a tag like `v1.2.3` triggers GitHub Actions to build and publish.

Note: Trusted Publishing is enabled for this package.

## How it Works

1.  **`src/lib/context.ts`**: Holds the `AsyncLocalStorage`.
2.  **`src/lib/prisma-manager.ts`**: The `getPrismaClient()` function checks the storage. If a transaction is active, it returns the transaction client. If not, it returns the global client.
3.  **`src/lib/base-repository.ts`**: Uses `getPrismaClient()` internally, so every query automatically uses the correct state.
