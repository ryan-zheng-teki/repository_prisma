import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from '../lib/client';
import { runInTransaction } from '../lib/context';
import { prisma } from '../lib/prisma-proxy';
import { BaseRepository } from '../lib/base-repository';
import { Models } from '../lib/models';

class UserRepository extends BaseRepository.forModel(Models.User) {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emails = async (): Promise<string[]> =>
  (await rootPrismaClient.user.findMany({ select: { email: true }, orderBy: { id: 'asc' } })).map(
    (user) => user.email
  );

/**
 * Concurrent requests share the one root client, as in a server. These tests check that a
 * request outside any transaction never joins another request's open transaction (AC-013).
 */
describe.sequential('transaction isolation between concurrent requests on one SQLite file', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await shutdownPrisma().catch(() => undefined);
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  const initializeDatabase = async (): Promise<void> => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-isolation-'));
    temporaryDirectories.push(directory);
    await initializePrisma({ datasourceUrl: `file:${path.join(directory, 'isolation.db')}` });
    // The table shapes `prisma db push` creates for the User and Post models.
    await rootPrismaClient.$executeRawUnsafe(
      'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL);'
    );
    await rootPrismaClient.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "User_email_key" ON "User"("email");'
    );
    await rootPrismaClient.$executeRawUnsafe(
      'CREATE TABLE "Post" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "authorId" INTEGER NOT NULL, CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);'
    );
  };

  it('keeps a request without a transaction out of another request\'s open transaction', async () => {
    await initializeDatabase();

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
    await initializeDatabase();

    const results = await Promise.allSettled([
      runInTransaction(async () => {
        await prisma.user.create({ data: { email: 'first@example.test' } });
        await sleep(100);
      }),
      runInTransaction(async () => {
        await prisma.user.create({ data: { email: 'second@example.test' } });
        await sleep(100);
      }),
    ]);

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
    expect((await emails()).sort()).toEqual(['first@example.test', 'second@example.test']);
  });

  it('runs a nested write concurrently with an interactive transaction', async () => {
    await initializeDatabase();

    const [transaction, nestedWrite] = await Promise.allSettled([
      runInTransaction(async () => {
        await prisma.user.create({ data: { email: 'interactive@example.test' } });
        await sleep(200);
      }),
      (async () => {
        await sleep(20);
        // Prisma runs a nested create in its own internal transaction.
        return prisma.user.create({
          data: { email: 'nested@example.test', posts: { create: { title: 'first post' } } },
        });
      })(),
    ]);

    expect(transaction.status).toBe('fulfilled');
    expect(nestedWrite.status).toBe('fulfilled');
    expect((await emails()).sort()).toEqual(['interactive@example.test', 'nested@example.test']);
    expect(await rootPrismaClient.post.count()).toBe(1);
  });

  it('runs a batch transaction concurrently with an interactive transaction', async () => {
    await initializeDatabase();

    const [interactive, batch] = await Promise.allSettled([
      runInTransaction(async () => {
        await prisma.user.create({ data: { email: 'interactive@example.test' } });
        await sleep(200);
      }),
      (async () => {
        await sleep(20);
        return rootPrismaClient.$transaction([
          rootPrismaClient.user.create({ data: { email: 'batch-1@example.test' } }),
          rootPrismaClient.user.create({ data: { email: 'batch-2@example.test' } }),
        ]);
      })(),
    ]);

    expect(interactive.status).toBe('fulfilled');
    expect(batch.status).toBe('fulfilled');
    expect((await emails()).sort()).toEqual([
      'batch-1@example.test',
      'batch-2@example.test',
      'interactive@example.test',
    ]);
  });

  it('keeps concurrent plain requests isolated and loses no writes while transactions commit and roll back', async () => {
    await initializeDatabase();
    const users = new UserRepository();
    const plainCount = 30;
    const transactionCount = 6;

    // Odd-numbered transactions roll back, so their rows must never be seen or kept.
    const transactions = Array.from({ length: transactionCount }, (_, index) =>
      (async () => {
        await sleep(index * 15);
        await runInTransaction(async () => {
          await users.create({ data: { email: `tx-${index}@example.test` } });
          await sleep(25);
          await prisma.user.create({ data: { email: `tx-${index}-second@example.test` } });
          if (index % 2 === 1) {
            throw new Error(`rollback ${index}`);
          }
        });
      })()
    );
    // Plain requests rotate through the three public ways to reach the root client.
    const plainRequests = Array.from({ length: plainCount }, (_, index) =>
      (async () => {
        await sleep(index * 4);
        const read =
          index % 3 === 0
            ? users.findMany({ select: { email: true } })
            : index % 3 === 1
              ? prisma.user.findMany({ select: { email: true } })
              : rootPrismaClient.user.findMany({ select: { email: true } });
        const seen = (await read).map((user: { email: string }) => user.email);
        const data = { email: `plain-${index}@example.test` };
        await (index % 2 === 0 ? users.create({ data }) : prisma.user.create({ data }));
        return seen;
      })()
    );

    const transactionResults = await Promise.allSettled(transactions);
    const seenByPlainRequests = (await Promise.all(plainRequests)).flat();

    const rolledBack = (email: string) => /^tx-[135](-second)?@/.test(email);
    expect(transactionResults.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
      'rejected',
      'fulfilled',
      'rejected',
    ]);
    expect(seenByPlainRequests.filter(rolledBack)).toEqual([]);
    const expected = [
      ...Array.from({ length: plainCount }, (_, index) => `plain-${index}@example.test`),
      ...[0, 2, 4].flatMap((index) => [
        `tx-${index}@example.test`,
        `tx-${index}-second@example.test`,
      ]),
    ].sort();
    expect((await emails()).sort()).toEqual(expected);
  });

  it('fails a transaction that uses rootPrismaClient inside its own callback with Prisma\'s timeout (SCN-007)', async () => {
    await initializeDatabase();

    const started = Date.now();
    const misuse = runInTransaction(
      async () => {
        // Discouraged: the root client waits for the enclosing transaction.
        await rootPrismaClient.user.count();
      },
      { timeout: 1000 }
    );

    await expect(misuse).rejects.toMatchObject({
      code: 'P2028',
      message: expect.stringContaining('expired transaction'),
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
    await expect(rootPrismaClient.user.count()).resolves.toBe(0);
    await prisma.user.create({ data: { email: 'after@example.test' } });
    expect(await emails()).toEqual(['after@example.test']);
  });

  it('fails a transaction queued past its maxWait and keeps the connection usable', async () => {
    await initializeDatabase();

    const longTransaction = runInTransaction(async () => {
      await prisma.user.create({ data: { email: 'long@example.test' } });
      await sleep(800);
    });
    const queued = (async () => {
      await sleep(20);
      return runInTransaction(
        async () => {
          await prisma.user.create({ data: { email: 'queued@example.test' } });
        },
        { maxWait: 200 }
      );
    })();

    await expect(queued).rejects.toMatchObject({
      code: 'P2028',
      message: expect.stringContaining('Unable to start a transaction in the given time'),
    });
    await longTransaction;
    expect(await emails()).toEqual(['long@example.test']);

    await prisma.user.create({ data: { email: 'plain-after@example.test' } });
    await runInTransaction(async () => {
      await prisma.user.create({ data: { email: 'transaction-after@example.test' } });
    });
    expect(await emails()).toEqual([
      'long@example.test',
      'plain-after@example.test',
      'transaction-after@example.test',
    ]);
  });
});
