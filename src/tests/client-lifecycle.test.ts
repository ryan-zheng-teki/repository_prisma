import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClientLifecycle } from '../lib/client/lifecycle';
import type { PrismaInitializationErrorCode } from '../lib/client/initialization-error';

type FakeClient = {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

const asPrismaClient = (client: FakeClient): PrismaClient =>
  client as unknown as PrismaClient;

const fakeClient = (overrides: Partial<FakeClient> = {}): FakeClient => ({
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  ...overrides,
});

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const expectInitializationCode = async (
  task: Promise<unknown>,
  code: PrismaInitializationErrorCode
): Promise<Error & { code: PrismaInitializationErrorCode }> => {
  try {
    await task;
    throw new Error(`Expected initialization to reject with ${code}.`);
  } catch (error) {
    expect(error).toMatchObject({
      name: 'PrismaInitializationError',
      code,
    });
    expect(error).toBeInstanceOf(Error);
    return error as Error & { code: PrismaInitializationErrorCode };
  }
};

describe.sequential('PrismaClientLifecycle classified failure and recovery', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
    vi.restoreAllMocks();
  });

  const physicalTarget = async (): Promise<{ databasePath: string; url: string }> => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-lifecycle-'));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, 'ready.db');
    await writeFile(databasePath, '');
    return { databasePath, url: `file:${databasePath}` };
  };

  it('keeps connection failure safe, reports the original cause only to diagnostics, and recovers on retry', async () => {
    const { databasePath, url } = await physicalTarget();
    const cause = new Error(`provider failure for ${databasePath}`);
    const cleanupFailure = new Error('cleanup failed');
    const failedClient = fakeClient({
      $connect: vi.fn().mockRejectedValue(cause),
      $disconnect: vi.fn().mockRejectedValue(cleanupFailure),
    });
    const recoveredClient = fakeClient({
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        { seq: 0, name: 'main', file: databasePath },
      ]),
    });
    const clients = [failedClient, recoveredClient];
    const lifecycle = new PrismaClientLifecycle({
      clientFactory: () => asPrismaClient(clients.shift()!),
    });
    const diagnostic = vi.fn(() => {
      throw new Error('listener failure must be ignored');
    });

    const publicError = await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: url, onDiagnostic: diagnostic }),
      'CONNECTION_FAILED'
    );

    expect(publicError.message).toBe(
      'The Prisma client could not connect to its datasource.'
    );
    expect('cause' in publicError).toBe(false);
    expect(publicError.message).not.toContain(databasePath);
    expect(diagnostic).toHaveBeenCalledWith({ code: 'CONNECTION_FAILED', cause });
    expect(failedClient.$disconnect).toHaveBeenCalledTimes(1);
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );

    await lifecycle.initialize({ datasourceUrl: url });
    expect(lifecycle.getClientForOperation()).toBe(recoveredClient);
    await lifecycle.shutdown();
  });

  it.each([
    {
      name: 'identity mismatch',
      expectedCode: 'DATABASE_IDENTITY_MISMATCH' as const,
      query: (databasePath: string) =>
        vi.fn().mockResolvedValue([{ seq: 0, name: 'main', file: `${databasePath}.wrong` }]),
    },
    {
      name: 'WAL activation failure',
      expectedCode: 'WAL_ACTIVATION_FAILED' as const,
      query: (databasePath: string) =>
        vi
          .fn()
          .mockResolvedValueOnce([{ seq: 0, name: 'main', file: databasePath }])
          .mockRejectedValueOnce(new Error('activation failed')),
    },
    {
      name: 'WAL verification failure',
      expectedCode: 'WAL_VERIFICATION_FAILED' as const,
      query: (databasePath: string) =>
        vi
          .fn()
          .mockResolvedValueOnce([{ seq: 0, name: 'main', file: databasePath }])
          .mockResolvedValueOnce([{ journal_mode: 'wal' }])
          .mockResolvedValueOnce([{ journal_mode: 'delete' }]),
    },
  ])('classifies $name, disconnects once, and blocks silent reuse', async ({
    expectedCode,
    query,
  }) => {
    const { databasePath, url } = await physicalTarget();
    const client = fakeClient({ $queryRawUnsafe: query(databasePath) });
    const lifecycle = new PrismaClientLifecycle({ clientFactory: () => asPrismaClient(client) });
    const diagnostic = vi.fn();

    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: url, enableWAL: true, onDiagnostic: diagnostic }),
      expectedCode
    );

    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic.mock.calls[0][0].code).toBe(expectedCode);
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );
  });

  it.each([
    ['file::memory:', 'SQLite memory'],
    ['file:memory-name?mode=memory&cache=shared', 'SQLite mode=memory'],
  ])('rejects strict WAL for %s before connection or SQLite SQL', async (url) => {
    const client = fakeClient();
    const lifecycle = new PrismaClientLifecycle({ clientFactory: () => asPrismaClient(client) });

    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: url, enableWAL: true }),
      'WAL_UNSUPPORTED_PROVIDER'
    );

    expect(client.$connect).not.toHaveBeenCalled();
    expect(client.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
  });
});

describe.sequential('PrismaClientLifecycle concurrency and shutdown', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it('shares identical requests, rejects different/stronger requests, and never publishes after shutdown', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-interleave-'));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, 'interleave.db');
    await writeFile(databasePath, '');
    const connect = deferred<void>();
    const firstClient = fakeClient({
      $connect: vi.fn(() => connect.promise),
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        { seq: 0, name: 'main', file: databasePath },
      ]),
    });
    const secondClient = fakeClient();
    const clients = [firstClient, secondClient];
    const lifecycle = new PrismaClientLifecycle({
      clientFactory: () => asPrismaClient(clients.shift()!),
    });
    const target = `file:${databasePath}`;

    const first = lifecycle.initialize({ datasourceUrl: target });
    const same = lifecycle.initialize({ datasourceUrl: target });
    expect(same).toBe(first);
    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: target, enableWAL: true }),
      'CLIENT_NOT_READY'
    );
    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: `file:${databasePath}.other` }),
      'DATASOURCE_CONFLICT'
    );
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );

    const shutdown = lifecycle.shutdown();
    const repeatedShutdown = lifecycle.shutdown();
    expect(repeatedShutdown).toBe(shutdown);
    const initializationResult = expectInitializationCode(first, 'CLIENT_NOT_READY');
    connect.resolve();
    await initializationResult;
    await shutdown;

    expect(firstClient.$disconnect).toHaveBeenCalledTimes(1);
    expect(firstClient.$queryRawUnsafe).toHaveBeenCalledTimes(1);

    await lifecycle.initialize({ datasourceUrl: 'file:rebound?mode=memory' });
    expect(lifecycle.getClientForOperation()).toBe(secondClient);
    await lifecycle.shutdown();
    await rm(directory, { recursive: true, force: true });
  });

  it('clears the lifecycle even when direct shutdown disconnect rejects', async () => {
    const disconnectFailure = new Error('disconnect failed');
    const firstClient = fakeClient({
      $disconnect: vi.fn().mockRejectedValue(disconnectFailure),
    });
    const replacementClient = fakeClient();
    const clients = [firstClient, replacementClient];
    const lifecycle = new PrismaClientLifecycle({
      clientFactory: () => asPrismaClient(clients.shift()!),
    });

    await lifecycle.initialize({ datasourceUrl: 'file:first?mode=memory' });
    await expect(lifecycle.shutdown()).rejects.toBe(disconnectFailure);

    await lifecycle.initialize({ datasourceUrl: 'file:replacement?mode=memory' });
    expect(lifecycle.getClientForOperation()).toBe(replacementClient);
    await lifecycle.shutdown();
  });

  it('keeps a healthy ready client authoritative when a different target is rejected', async () => {
    const client = fakeClient();
    const factory = vi.fn(() => asPrismaClient(client));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });
    const firstTarget = 'file:first?mode=memory';

    await lifecycle.initialize({ datasourceUrl: firstTarget });
    await lifecycle.initialize({ datasourceUrl: firstTarget });
    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: 'file:second?mode=memory' }),
      'DATASOURCE_CONFLICT'
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(lifecycle.getClientForOperation()).toBe(client);
    await lifecycle.shutdown();
  });

  it.each(['identity', 'activation', 'verification'] as const)(
    'coordinates shutdown while the %s stage is in flight without publishing the candidate',
    async (stage) => {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-stage-'));
      temporaryDirectories.push(directory);
      const databasePath = path.join(directory, `${stage}.db`);
      await writeFile(databasePath, '');
      const gate = deferred<void>();
      const query = vi.fn(async (sql: string) => {
        if (sql === 'PRAGMA database_list;') {
          if (stage === 'identity') {
            await gate.promise;
          }
          return [{ seq: 0, name: 'main', file: databasePath }];
        }
        if (sql === 'PRAGMA journal_mode = WAL;') {
          if (stage === 'activation') {
            await gate.promise;
          }
          return [{ journal_mode: 'wal' }];
        }
        if (sql === 'PRAGMA journal_mode;') {
          if (stage === 'verification') {
            await gate.promise;
          }
          return [{ journal_mode: 'wal' }];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      });
      const client = fakeClient({ $queryRawUnsafe: query });
      const lifecycle = new PrismaClientLifecycle({ clientFactory: () => asPrismaClient(client) });

      const initialization = lifecycle.initialize({
        datasourceUrl: `file:${databasePath}`,
        enableWAL: true,
      });
      const expectedCalls = stage === 'identity' ? 1 : stage === 'activation' ? 2 : 3;
      await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(expectedCalls));
      const initializationResult = expectInitializationCode(
        initialization,
        'CLIENT_NOT_READY'
      );
      const shutdown = lifecycle.shutdown();
      gate.resolve();

      await initializationResult;
      await shutdown;
      expect(client.$disconnect).toHaveBeenCalledTimes(1);

      const replacement = fakeClient();
      const replacementLifecycle = new PrismaClientLifecycle({
        clientFactory: () => asPrismaClient(replacement),
      });
      await replacementLifecycle.initialize({
        datasourceUrl: `file:${stage}?mode=memory`,
      });
      expect(replacementLifecycle.getClientForOperation()).toBe(replacement);
      await replacementLifecycle.shutdown();
      await rm(directory, { recursive: true, force: true });
    }
  );
});

describe.sequential('PrismaClientLifecycle non-SQLite datasource rejection', () => {
  const nonSqliteUrl = 'postgresql://user:secret@db.example.invalid:5432/app';
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalTestDatabaseUrl = process.env.DATABASE_URL_TEST;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalTestDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL_TEST;
    } else {
      process.env.DATABASE_URL_TEST = originalTestDatabaseUrl;
    }
  });

  const useEnvironmentUrl = (url: string): void => {
    delete process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL = url;
  };

  const expectNoDatasourceLeak = (error: Error, diagnosticCause?: unknown): void => {
    for (const text of [error.message, String(error), String(diagnosticCause ?? '')]) {
      expect(text).not.toContain('secret');
      expect(text).not.toContain('db.example.invalid');
    }
  };

  it.each([
    { name: 'without WAL', enableWAL: undefined },
    { name: 'with WAL', enableWAL: true },
  ])('rejects an explicit non-SQLite URL from idle $name before building a client', async ({
    enableWAL,
  }) => {
    const factory = vi.fn(() => asPrismaClient(fakeClient()));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });
    const diagnostic = vi.fn();

    const error = await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: nonSqliteUrl, enableWAL, onDiagnostic: diagnostic }),
      'UNSUPPORTED_DATASOURCE_PROVIDER'
    );

    expect(error.message).toBe(
      'repository_prisma supports SQLite datasources only; use a file: URL.'
    );
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic.mock.calls[0][0].code).toBe('UNSUPPORTED_DATASOURCE_PROVIDER');
    expectNoDatasourceLeak(error, diagnostic.mock.calls[0][0].cause);
    expect(factory).not.toHaveBeenCalled();
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );
  });

  it('rejects a non-SQLite URL while a SQLite client is lazily bound and keeps that client', async () => {
    const client = fakeClient();
    const factory = vi.fn(() => asPrismaClient(client));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });
    useEnvironmentUrl('file::memory:');
    expect(lifecycle.getClientForOperation()).toBe(client);

    const error = await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: nonSqliteUrl }),
      'UNSUPPORTED_DATASOURCE_PROVIDER'
    );

    expectNoDatasourceLeak(error);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(client.$disconnect).not.toHaveBeenCalled();
    expect(lifecycle.getClientForOperation()).toBe(client);
    await lifecycle.shutdown();
  });

  it('rejects a non-SQLite URL while a SQLite client is initializing and still publishes that client', async () => {
    const connect = deferred<void>();
    const client = fakeClient({ $connect: vi.fn(() => connect.promise) });
    const factory = vi.fn(() => asPrismaClient(client));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });

    const initialization = lifecycle.initialize({ datasourceUrl: 'file::memory:' });
    const error = await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: nonSqliteUrl }),
      'UNSUPPORTED_DATASOURCE_PROVIDER'
    );
    connect.resolve();
    await initialization;

    expectNoDatasourceLeak(error);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(lifecycle.getClientForOperation()).toBe(client);
    await lifecycle.shutdown();
  });

  it('rejects a non-SQLite URL while a SQLite client is ready and keeps that client', async () => {
    const client = fakeClient();
    const factory = vi.fn(() => asPrismaClient(client));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });
    await lifecycle.initialize({ datasourceUrl: 'file::memory:' });

    const error = await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: nonSqliteUrl, enableWAL: true }),
      'UNSUPPORTED_DATASOURCE_PROVIDER'
    );

    expectNoDatasourceLeak(error);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(client.$disconnect).not.toHaveBeenCalled();
    expect(lifecycle.getClientForOperation()).toBe(client);
    await lifecycle.shutdown();
  });

  it('rejects a lazy bind from a non-SQLite DATABASE_URL before building a client', () => {
    const factory = vi.fn(() => asPrismaClient(fakeClient()));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });
    useEnvironmentUrl(nonSqliteUrl);

    let error: unknown;
    try {
      lifecycle.getClientForOperation();
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      name: 'PrismaInitializationError',
      code: 'UNSUPPORTED_DATASOURCE_PROVIDER',
    });
    expectNoDatasourceLeak(error as Error);
    expect(factory).not.toHaveBeenCalled();
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );
  });

  it('keeps CLIENT_NOT_READY precedence for a non-SQLite URL while shutdown is in progress', async () => {
    const disconnect = deferred<void>();
    const client = fakeClient({ $disconnect: vi.fn(() => disconnect.promise) });
    const factory = vi.fn(() => asPrismaClient(client));
    const lifecycle = new PrismaClientLifecycle({ clientFactory: factory });
    await lifecycle.initialize({ datasourceUrl: 'file::memory:' });

    const shutdown = lifecycle.shutdown();
    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: nonSqliteUrl }),
      'CLIENT_NOT_READY'
    );
    disconnect.resolve();
    await shutdown;

    expect(factory).toHaveBeenCalledTimes(1);
  });
});
