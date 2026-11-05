import { mkdtemp, rm } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * An app on the `prisma-client` generator, with a real generated client and real SQLite files
 * (AC-002..AC-005, AC-010, concurrent requests). As in such an app, `@prisma/client` has no
 * prisma-client-js output: the default load fails, so every passing case ran on the registered
 * client. Compiled by the registered typecheck program (tsconfig.prisma-client-generator.json).
 */
vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  const createRequire = (url: string | URL) => {
    const realRequire = actual.createRequire(url);
    return Object.assign((id: string) => {
      if (id === '@prisma/client') {
        throw Object.assign(new Error("Cannot find module '.prisma/client/default'"), {
          code: 'MODULE_NOT_FOUND',
        });
      }
      return realRequire(id);
    }, realRequire);
  };
  return { ...actual, createRequire, default: { ...actual, createRequire } };
});

import * as generated from '../../../generated/prisma-client/client';
import {
  BaseRepository,
  Models,
  Transactional,
  getTransactionClient,
  initializePrisma,
  prisma,
  registerPrismaClient,
  rootPrismaClient,
  runInTransaction,
  shutdownPrisma,
} from '../../index';

// The app's db.ts: registration and type declaration.
registerPrismaClient(generated);

declare module 'repository_prisma' {
  interface PrismaClientRegistry {
    client: typeof generated;
  }
}

class UserRepository extends BaseRepository<'User'> {}
class PostRepository extends BaseRepository.forModel(generated.Prisma.ModelName.Post) {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const originalEnvironment = { ...process.env };
const temporaryDirectories: string[] = [];

/** A new SQLite file with the User and Post tables `prisma db push` creates. */
const createDatabase = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-registered-'));
  temporaryDirectories.push(directory);
  const databasePath = path.join(directory, 'registered.db');
  await initializePrisma({ datasourceUrl: `file:${databasePath}` });
  await rootPrismaClient.$executeRawUnsafe(
    'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL);'
  );
  await rootPrismaClient.$executeRawUnsafe('CREATE UNIQUE INDEX "User_email_key" ON "User"("email");');
  await rootPrismaClient.$executeRawUnsafe(
    'CREATE TABLE "Post" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "authorId" INTEGER NOT NULL, CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);'
  );
  await shutdownPrisma();
  return databasePath;
};

const emails = async (): Promise<string[]> =>
  (await prisma.user.findMany({ select: { email: true }, orderBy: { id: 'asc' } })).map(
    (user) => user.email
  );

afterEach(async () => {
  await shutdownPrisma().catch(() => undefined);
  registerPrismaClient(generated);
  process.env = { ...originalEnvironment };
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe.sequential('registered prisma-client generator client', () => {
  it('initializes with WAL on the target file and runs repository and prisma queries (AC-002)', async () => {
    const databasePath = await createDatabase();

    await initializePrisma({ datasourceUrl: `file:${databasePath}`, enableWAL: true });

    const databases = await rootPrismaClient.$queryRawUnsafe<{ name: string; file: string }[]>(
      'PRAGMA database_list;'
    );
    const main = databases.find((row) => row.name === 'main');
    expect(realpathSync(main!.file)).toBe(realpathSync(databasePath));
    const mode = await rootPrismaClient.$queryRawUnsafe<Record<string, string>[]>('PRAGMA journal_mode;');
    expect(Object.values(mode[0])[0].toLowerCase()).toBe('wal');

    const users = new UserRepository();
    const created = await users.create({ data: { email: 'ada@example.test' } });
    const id: number = created.id;
    await new PostRepository().create({ data: { title: 'Hello', authorId: id } });
    await users.update({ where: { id }, data: { email: 'ada@example.org' } });

    expect(await users.findUnique({ where: { id } })).toEqual({ id, email: 'ada@example.org' });
    expect(await prisma.post.count({ where: { authorId: id } })).toBe(1);
    expect(await emails()).toEqual(['ada@example.org']);
  });

  it('binds the registered client lazily from DATABASE_URL (AC-003)', async () => {
    const databasePath = await createDatabase();
    delete process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL = `file:${databasePath}`;

    await new UserRepository().create({ data: { email: 'lazy@example.test' } });

    expect(await emails()).toEqual(['lazy@example.test']);
  });

  it('commits and rolls back runInTransaction and @Transactional work (AC-004)', async () => {
    const databasePath = await createDatabase();
    await initializePrisma({ datasourceUrl: `file:${databasePath}` });
    const users = new UserRepository();

    class UserService {
      async createThenFail(email: string): Promise<void> {
        await users.create({ data: { email } });
        throw new Error('decorated rollback');
      }
    }
    // Applied as the compiler applies `@Transactional()`: vitest transforms this folder without the
    // root tsconfig (which excludes it), so `experimentalDecorators` syntax is not available here.
    const descriptor = Object.getOwnPropertyDescriptor(UserService.prototype, 'createThenFail')!;
    Object.defineProperty(
      UserService.prototype,
      'createThenFail',
      Transactional()(UserService.prototype, 'createThenFail', descriptor)
    );

    await runInTransaction(
      async () => {
        expect(getTransactionClient()).toBeDefined();
        await prisma.user.create({ data: { email: 'committed@example.test' } });
      },
      { isolationLevel: 'Serializable' }
    );
    await expect(
      runInTransaction(async () => {
        await users.create({ data: { email: 'rolled-back@example.test' } });
        throw new Error('rollback on purpose');
      })
    ).rejects.toThrow('rollback on purpose');
    await expect(new UserService().createThenFail('decorated@example.test')).rejects.toThrow(
      'decorated rollback'
    );

    expect(getTransactionClient()).toBeUndefined();
    expect(await emails()).toEqual(['committed@example.test']);
  });

  it('reads Models from the registered module and builds repositories from its model names (AC-005)', async () => {
    const databasePath = await createDatabase();
    await initializePrisma({ datasourceUrl: `file:${databasePath}` });
    const userModel: 'User' = Models.User;

    expect(userModel).toBe(generated.Prisma.ModelName.User);
    expect(Object.keys(Models)).toEqual(Object.keys(generated.Prisma.ModelName));
    class ForModelUsers extends BaseRepository.forModel(generated.Prisma.ModelName.User) {}
    await new ForModelUsers().create({ data: { email: 'for-model@example.test' } });
    expect(await emails()).toEqual(['for-model@example.test']);
  });

  it('keeps the bound client on a conflicting registration and uses the new one after shutdown (AC-010)', async () => {
    const databasePath = await createDatabase();
    let otherConstructed = 0;
    class OtherPrismaClient extends generated.PrismaClient {
      constructor(...args: ConstructorParameters<typeof generated.PrismaClient>) {
        super(...args);
        otherConstructed += 1;
      }
    }
    const other = { PrismaClient: OtherPrismaClient, Prisma: generated.Prisma };
    const registerOther = () =>
      // @ts-expect-error a module other than the declared one does not compile
      registerPrismaClient(other);
    delete process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL = `file:${databasePath}`;

    // Lazily bound.
    await prisma.user.create({ data: { email: 'lazy@example.test' } });
    expect(() => registerPrismaClient(generated)).not.toThrow();
    expect(registerOther).toThrow(expect.objectContaining({ code: 'PRISMA_CLIENT_CONFLICT' }));
    await shutdownPrisma();

    // Initializing, then ready.
    const initialization = initializePrisma({ datasourceUrl: `file:${databasePath}` });
    expect(registerOther).toThrow(expect.objectContaining({ code: 'PRISMA_CLIENT_CONFLICT' }));
    await initialization;
    expect(registerOther).toThrow(expect.objectContaining({ code: 'PRISMA_CLIENT_CONFLICT' }));
    expect(await emails()).toEqual(['lazy@example.test']);
    expect(otherConstructed).toBe(0);

    await shutdownPrisma();
    registerOther();
    await initializePrisma({ datasourceUrl: `file:${databasePath}` });

    expect(otherConstructed).toBe(1);
    expect(await emails()).toEqual(['lazy@example.test']);
  });

  it('rejects a malformed registration with a TypeError and keeps the registered client', async () => {
    const databasePath = await createDatabase();
    // @ts-expect-error not a generated client module
    expect(() => registerPrismaClient({ PrismaClient: generated.PrismaClient })).toThrow(TypeError);

    await initializePrisma({ datasourceUrl: `file:${databasePath}` });
    expect(await emails()).toEqual([]);
  });
});

/** Concurrent requests share the one root client, as in a server (DESIGN.md DC-001). */
describe.sequential('concurrent requests on the registered client', () => {
  it("keeps a request without a transaction out of another request's open transaction", async () => {
    const databasePath = await createDatabase();
    await initializePrisma({ datasourceUrl: `file:${databasePath}` });

    const requestA = runInTransaction(async () => {
      await prisma.user.create({ data: { email: 'in-transaction@example.test' } });
      await sleep(300);
      throw new Error('rollback on purpose');
    });
    const requestB = (async () => {
      await sleep(50);
      const seen = await prisma.user.findMany({ select: { email: true } });
      await prisma.user.create({ data: { email: 'independent@example.test' } });
      return seen.map((user) => user.email);
    })();

    await expect(requestA).rejects.toThrow('rollback on purpose');
    expect(await requestB).toEqual([]);
    expect(await emails()).toEqual(['independent@example.test']);
  });

  it('commits two concurrent transactions', async () => {
    const databasePath = await createDatabase();
    await initializePrisma({ datasourceUrl: `file:${databasePath}` });

    const results = await Promise.allSettled([
      runInTransaction(async () => {
        await prisma.user.create({ data: { email: 'first@example.test' } });
        await sleep(100);
      }),
      runInTransaction(async () => {
        await prisma.user.create({ data: { email: 'second@example.test' } });
      }),
    ]);

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
    expect((await emails()).sort()).toEqual(['first@example.test', 'second@example.test']);
  });
});
