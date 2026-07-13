import {
  access,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  initializePrisma,
  PrismaInitializationError,
  rootPrismaClient,
  shutdownPrisma,
} from '../lib/client';
import { runInTransaction } from '../lib/context';
import { getPrismaClient } from '../lib/prisma-manager';
import { prisma } from '../lib/prisma-proxy';

type DatabaseListRow = { name: string; file: string };
type JournalModeRow = Record<string, string>;

const originalEnvironment = { ...process.env };
const originalCwd = process.cwd();

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const mainPath = async (): Promise<string> => {
  const rows = await rootPrismaClient.$queryRawUnsafe<DatabaseListRow[]>(
    'PRAGMA database_list;'
  );
  const main = rows.find((row) => row.name.toLowerCase() === 'main');
  if (!main) {
    throw new Error('Expected SQLite main row.');
  }
  return realpath(main.file);
};

const journalMode = async (): Promise<string> => {
  const rows = await rootPrismaClient.$queryRawUnsafe<JournalModeRow[]>(
    'PRAGMA journal_mode;'
  );
  return String(Object.values(rows[0])[0]).toLowerCase();
};

describe.sequential('public initialization and real SQLite identity', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await shutdownPrisma().catch(() => undefined);
    process.env = { ...originalEnvironment };
    process.chdir(originalCwd);
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  const temporaryDirectory = async (): Promise<string> => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-public-'));
    temporaryDirectories.push(directory);
    return directory;
  };

  it('opens DATABASE_URL_TEST under test and leaves DATABASE_URL untouched', async () => {
    const directory = await temporaryDirectory();
    const defaultDatabase = path.join(directory, 'default.db');
    const testDatabase = path.join(directory, 'test-selected.db');
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `file:${defaultDatabase}`;
    process.env.DATABASE_URL_TEST = `file:${testDatabase}`;

    await initializePrisma();

    expect(await mainPath()).toBe(await realpath(testDatabase));
    expect(await fileExists(defaultDatabase)).toBe(false);
  });

  it('lets a non-empty explicit datasource win and treats whitespace as omitted', async () => {
    const directory = await temporaryDirectory();
    const defaultDatabase = path.join(directory, 'default.db');
    const testDatabase = path.join(directory, 'test.db');
    const explicitDatabase = path.join(directory, 'explicit.db');
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `file:${defaultDatabase}`;
    process.env.DATABASE_URL_TEST = `file:${testDatabase}`;

    await initializePrisma({ datasourceUrl: `  file:${explicitDatabase}  ` });
    expect(await mainPath()).toBe(await realpath(explicitDatabase));
    expect(await fileExists(defaultDatabase)).toBe(false);
    expect(await fileExists(testDatabase)).toBe(false);
    await shutdownPrisma();

    await initializePrisma({ datasourceUrl: '   ' });
    expect(await mainPath()).toBe(await realpath(testDatabase));
  });

  it('normalizes cwd-relative paths with spaces, literal percent spelling, and query parameters', async () => {
    const directory = await temporaryDirectory();
    const nestedDirectory = path.join(directory, 'nested folder');
    await mkdir(nestedDirectory);
    process.chdir(directory);
    const relativePath = './nested folder/literal%20 name.db';
    const expectedPath = path.join(nestedDirectory, 'literal%20 name.db');

    await initializePrisma({
      datasourceUrl: `file:${relativePath}?connection_limit=1`,
    });

    expect(await mainPath()).toBe(await realpath(expectedPath));
    expect(await fileExists(path.join(nestedDirectory, 'literal name.db'))).toBe(false);
  });

  it('accepts a symlink spelling when canonical physical identity is the same', async () => {
    const directory = await temporaryDirectory();
    const physicalDatabase = path.join(directory, 'physical.db');
    const aliasDatabase = path.join(directory, 'alias.db');
    await writeFile(physicalDatabase, '');
    await symlink(physicalDatabase, aliasDatabase);

    await initializePrisma({
      datasourceUrl: `file:${aliasDatabase}?connection_limit=1`,
    });

    expect(await mainPath()).toBe(await realpath(physicalDatabase));
  });

  it('preserves delete mode without WAL, then upgrades and independently verifies WAL', async () => {
    const directory = await temporaryDirectory();
    const databasePath = path.join(directory, 'journal.db');
    const datasourceUrl = `file:${databasePath}`;

    await initializePrisma({ datasourceUrl });
    expect(await journalMode()).toBe('delete');

    await initializePrisma({ datasourceUrl, enableWAL: true });
    expect(await journalMode()).toBe('wal');
  });

  it('blocks access after a safe missing-target failure and permits corrected explicit retry', async () => {
    const directory = await temporaryDirectory();
    const correctedDatabase = path.join(directory, 'corrected.db');
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_TEST;
    const diagnosticCauses: unknown[] = [];

    let error: unknown;
    try {
      await initializePrisma({
        onDiagnostic: ({ cause }) => diagnosticCauses.push(cause),
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(PrismaInitializationError);
    expect(error).toMatchObject({ code: 'DATABASE_URL_MISSING' });
    expect((error as Error).message).not.toContain(directory);
    expect('cause' in (error as object)).toBe(false);
    expect(diagnosticCauses).toHaveLength(1);
    expect(() => rootPrismaClient.user).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );

    await initializePrisma({ datasourceUrl: `file:${correctedDatabase}` });
    expect(await mainPath()).toBe(await realpath(correctedDatabase));
  });

  it('rejects a lazy-bound target switch without opening the second file, then rebinds captured methods after shutdown', async () => {
    const directory = await temporaryDirectory();
    const firstDatabase = path.join(directory, 'first.db');
    const secondDatabase = path.join(directory, 'second.db');
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = `file:${firstDatabase}`;
    delete process.env.DATABASE_URL_TEST;

    const capturedQuery = rootPrismaClient.$queryRawUnsafe;
    await capturedQuery('PRAGMA database_list;');

    await expect(
      initializePrisma({ datasourceUrl: `file:${secondDatabase}` })
    ).rejects.toMatchObject({ code: 'DATASOURCE_CONFLICT' });
    expect(await fileExists(secondDatabase)).toBe(false);
    expect(await mainPath()).toBe(await realpath(firstDatabase));

    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: `file:${secondDatabase}` });
    const reboundRows = await capturedQuery('PRAGMA database_list;') as DatabaseListRow[];
    const reboundMain = reboundRows.find((row) => row.name.toLowerCase() === 'main');
    expect(reboundMain).toBeDefined();
    expect(await realpath(reboundMain!.file)).toBe(await realpath(secondDatabase));
  });

  it('reads representative existing data directly without schema migration', async () => {
    const directory = await temporaryDirectory();
    const databasePath = path.join(directory, 'existing.db');
    const datasourceUrl = `file:${databasePath}`;
    const seedClient = new PrismaClient({ datasourceUrl });
    await seedClient.$executeRawUnsafe(
      'CREATE TABLE existing_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL);'
    );
    await seedClient.$executeRawUnsafe(
      "INSERT INTO existing_probe (id, value) VALUES (1, 'preserved');"
    );
    await seedClient.$disconnect();

    await initializePrisma({ datasourceUrl });
    const rows = await rootPrismaClient.$queryRawUnsafe<Array<{ id: number; value: string }>>(
      'SELECT id, value FROM existing_probe;'
    );

    expect(rows).toEqual([{ id: 1, value: 'preserved' }]);
  });
});

describe.sequential('context-aware public forwarding with the current Prisma schema', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await shutdownPrisma().catch(() => undefined);
    process.env = { ...originalEnvironment };
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it('uses a captured context method inside ALS and the root owner after ALS exits', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-als-'));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, 'als.db');
    const schemaDatabaseUrl = `file:${databasePath}`;
    const schemaClient = new PrismaClient({ datasourceUrl: schemaDatabaseUrl });
    await schemaClient.$executeRawUnsafe(
      'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL);'
    );
    await schemaClient.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "User_email_key" ON "User"("email");'
    );
    await schemaClient.$disconnect();

    await initializePrisma({ datasourceUrl: schemaDatabaseUrl });
    const capturedCreate = prisma.user.create;
    const rolledBackEmail = `als-rollback-${randomUUID()}@example.com`;
    const committedEmail = `als-root-${randomUUID()}@example.com`;

    await expect(
      runInTransaction(async () => {
        expect(getPrismaClient()).not.toBe(rootPrismaClient);
        await capturedCreate({ data: { email: rolledBackEmail } });
        throw new Error('rollback captured context call');
      })
    ).rejects.toThrow('rollback captured context call');

    expect(
      await rootPrismaClient.user.findUnique({ where: { email: rolledBackEmail } })
    ).toBeNull();
    expect(getPrismaClient()).toBe(rootPrismaClient);

    await capturedCreate({ data: { email: committedEmail } });
    expect(
      await rootPrismaClient.user.findUnique({ where: { email: committedEmail } })
    ).toMatchObject({ email: committedEmail });
    await rootPrismaClient.user.delete({ where: { email: committedEmail } });
  });
});
