import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * An app on the `prisma-client` generator that recovers from a failed start (REQ-005, REQ-006,
 * AC-009, AC-010): the registration is accepted after a failed initialization without
 * `shutdownPrisma()`. Real generated client, real SQLite files. As in such an app,
 * `@prisma/client` has no prisma-client-js output: the default load fails, so every passing case
 * ran on the registered client. Unlike `registered-client.test.ts`, nothing is registered when
 * the file loads. Compiled by the registered typecheck program.
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

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as generated from '../../../generated/prisma-client/client';
import {
  PrismaInitializationError,
  initializePrisma,
  prisma,
  registerPrismaClient,
  rootPrismaClient,
  shutdownPrisma,
} from '../../index';

declare module 'repository_prisma' {
  interface PrismaClientRegistry {
    client: typeof generated;
  }
}

const originalEnvironment = { ...process.env };
const temporaryDirectories: string[] = [];

const temporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-recovery-'));
  temporaryDirectories.push(directory);
  return directory;
};

/** A database URL for a new SQLite file with the User table `prisma db push` creates. */
const createDatabase = async (): Promise<string> => {
  const databasePath = path.join(await temporaryDirectory(), 'recovery.db');
  // The app's own client, outside the library, only to create the schema.
  const setup = new generated.PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databasePath }) });
  await setup.$executeRawUnsafe(
    'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL UNIQUE);'
  );
  await setup.$disconnect();
  return `file:${databasePath}`;
};

const failureOf = async (action: () => unknown): Promise<PrismaInitializationError> => {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(PrismaInitializationError);
    return error as PrismaInitializationError;
  }
  throw new Error('expected a PrismaInitializationError');
};

afterEach(async () => {
  await shutdownPrisma().catch(() => undefined);
  process.env = { ...originalEnvironment };
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

// Order matters: the first case starts with nothing registered.
describe.sequential('recovering from a failed start with the registered client', () => {
  it('registers after initializePrisma failed for a missing client, without shutdownPrisma (AC-009, REQ-006)', async () => {
    const databaseUrl = await createDatabase();
    const diagnostics: unknown[] = [];

    const failure = await failureOf(() =>
      initializePrisma({ datasourceUrl: databaseUrl, onDiagnostic: (value) => diagnostics.push(value) })
    );
    expect(failure.code).toBe('PRISMA_CLIENT_UNAVAILABLE');
    expect(failure.message).not.toMatch(/node_modules|[\\/]tmp[\\/]|file:/);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRISMA_CLIENT_UNAVAILABLE',
        cause: expect.objectContaining({ code: 'MODULE_NOT_FOUND' }),
      }),
    ]);

    registerPrismaClient(generated);
    await initializePrisma({ datasourceUrl: databaseUrl });

    await prisma.user.create({ data: { email: 'recovered@example.test' } });
    expect(await prisma.user.count()).toBe(1);
  });

  it('accepts a different client after initializePrisma failed to connect, without shutdownPrisma (AC-010, REQ-006)', async () => {
    const databaseUrl = await createDatabase();
    // A real connection failure: the database directory does not exist.
    const unreachableUrl = `file:${path.join(await temporaryDirectory(), 'missing-directory', 'app.db')}`;
    let otherConstructed = 0;
    class OtherPrismaClient extends generated.PrismaClient {
      constructor(...args: ConstructorParameters<typeof generated.PrismaClient>) {
        super(...args);
        otherConstructed += 1;
      }
    }
    registerPrismaClient(generated);

    const failure = await failureOf(() => initializePrisma({ datasourceUrl: unreachableUrl }));
    expect(failure.code).toBe('CONNECTION_FAILED');

    // @ts-expect-error a module other than the declared one does not compile
    registerPrismaClient({ PrismaClient: OtherPrismaClient, Prisma: generated.Prisma });
    await initializePrisma({ datasourceUrl: databaseUrl });

    expect(otherConstructed).toBe(1);
    await rootPrismaClient.user.create({ data: { email: 'other@example.test' } });
    expect(await prisma.user.findMany({ select: { email: true } })).toEqual([
      { email: 'other@example.test' },
    ]);
  });

  it('accepts a different client after the first lazy use failed, and binds it on initializePrisma (AC-010, REQ-006)', async () => {
    const databaseUrl = await createDatabase();
    delete process.env.DATABASE_URL_TEST;
    delete process.env.DATABASE_URL;
    let otherConstructed = 0;
    class OtherPrismaClient extends generated.PrismaClient {
      constructor(...args: ConstructorParameters<typeof generated.PrismaClient>) {
        super(...args);
        otherConstructed += 1;
      }
    }
    registerPrismaClient(generated);

    // Lazy use without a datasource URL fails and leaves the lifecycle failed.
    expect((await failureOf(() => prisma.user)).code).toBe('DATABASE_URL_MISSING');

    // @ts-expect-error a module other than the declared one does not compile
    registerPrismaClient({ PrismaClient: OtherPrismaClient, Prisma: generated.Prisma });
    // As designed, lazy use stays CLIENT_NOT_READY until initializePrisma() or shutdownPrisma().
    expect((await failureOf(() => prisma.user)).code).toBe('CLIENT_NOT_READY');
    await initializePrisma({ datasourceUrl: databaseUrl });

    expect(otherConstructed).toBe(1);
    expect(await prisma.user.count()).toBe(0);
  });
});
