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
    const lifecycle = new PrismaClientLifecycle(() =>
      asPrismaClient(clients.shift()!)
    );
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
    const lifecycle = new PrismaClientLifecycle(() => asPrismaClient(client));
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
    ['postgresql://user:password@localhost:5432/app', 'non-SQLite'],
    ['file::memory:', 'SQLite memory'],
    ['file:memory-name?mode=memory&cache=shared', 'SQLite mode=memory'],
  ])('rejects strict WAL for %s before connection or SQLite SQL', async (url) => {
    const client = fakeClient();
    const lifecycle = new PrismaClientLifecycle(() => asPrismaClient(client));

    await expectInitializationCode(
      lifecycle.initialize({ datasourceUrl: url, enableWAL: true }),
      'WAL_UNSUPPORTED_PROVIDER'
    );

    expect(client.$connect).not.toHaveBeenCalled();
    expect(client.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('initializes a non-SQLite datasource without WAL and issues no SQLite SQL', async () => {
    const client = fakeClient();
    const lifecycle = new PrismaClientLifecycle(() => asPrismaClient(client));

    await lifecycle.initialize({
      datasourceUrl: 'postgresql://user:password@localhost:5432/app',
    });

    expect(client.$connect).toHaveBeenCalledTimes(1);
    expect(client.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(lifecycle.getClientForOperation()).toBe(client);
    await lifecycle.shutdown();
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
    const lifecycle = new PrismaClientLifecycle(() =>
      asPrismaClient(clients.shift()!)
    );
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

    await lifecycle.initialize({
      datasourceUrl: 'postgresql://user:password@localhost:5432/rebound',
    });
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
    const lifecycle = new PrismaClientLifecycle(() =>
      asPrismaClient(clients.shift()!)
    );

    await lifecycle.initialize({
      datasourceUrl: 'postgresql://user:password@localhost:5432/first',
    });
    await expect(lifecycle.shutdown()).rejects.toBe(disconnectFailure);

    await lifecycle.initialize({
      datasourceUrl: 'postgresql://user:password@localhost:5432/replacement',
    });
    expect(lifecycle.getClientForOperation()).toBe(replacementClient);
    await lifecycle.shutdown();
  });

  it('keeps a healthy ready client authoritative when a different target is rejected', async () => {
    const client = fakeClient();
    const factory = vi.fn(() => asPrismaClient(client));
    const lifecycle = new PrismaClientLifecycle(factory);
    const firstTarget = 'postgresql://user:password@localhost:5432/first';

    await lifecycle.initialize({ datasourceUrl: firstTarget });
    await lifecycle.initialize({ datasourceUrl: firstTarget });
    await expectInitializationCode(
      lifecycle.initialize({
        datasourceUrl: 'postgresql://user:password@localhost:5432/second',
      }),
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
      const lifecycle = new PrismaClientLifecycle(() => asPrismaClient(client));

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
      const replacementLifecycle = new PrismaClientLifecycle(() =>
        asPrismaClient(replacement)
      );
      await replacementLifecycle.initialize({
        datasourceUrl: `postgresql://user:password@localhost:5432/${stage}`,
      });
      expect(replacementLifecycle.getClientForOperation()).toBe(replacement);
      await replacementLifecycle.shutdown();
      await rm(directory, { recursive: true, force: true });
    }
  );
});
