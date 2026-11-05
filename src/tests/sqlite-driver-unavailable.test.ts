import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClientLifecycle } from '../lib/client/lifecycle';
import { isSqliteDriverLoadFailure } from '../lib/client/sqlite-driver-adapter';

const modulePath = '/private/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node';

/** An error with a `cause` (the project's TypeScript lib predates `ErrorOptions`). */
const withCause = (message: string, cause: unknown): Error =>
  Object.assign(new Error(message), { cause });

/** The shape the `bindings` loader throws when better-sqlite3's native module is missing. */
const bindingsNotFound = (): Error =>
  new Error(`Could not locate the bindings file. Tried:\n → ${modulePath}`);

/** The shape Node throws when the native module was built for another Node.js version. */
const dlopenFailed = (): Error =>
  Object.assign(
    new Error(`The module '${modulePath}' was compiled against a different Node.js version.`),
    { code: 'ERR_DLOPEN_FAILED' }
  );

describe('isSqliteDriverLoadFailure', () => {
  it.each([
    ['the bindings "not found" error', bindingsNotFound()],
    ['an ERR_DLOPEN_FAILED error', dlopenFailed()],
    ['a bindings error as a cause', withCause('connect failed', bindingsNotFound())],
    [
      'an ERR_DLOPEN_FAILED error four causes deep',
      withCause('1', withCause('2', withCause('3', withCause('4', dlopenFailed())))),
    ],
    ['a plain object with the code', { code: 'ERR_DLOPEN_FAILED' }],
  ])('recognizes %s', (_name, error) => {
    expect(isSqliteDriverLoadFailure(error)).toBe(true);
  });

  it.each([
    ['an unrelated error', new Error('Cannot open database because the directory does not exist')],
    ['an error with another code', Object.assign(new Error('busy'), { code: 'SQLITE_BUSY' })],
    ['the bindings text not at the start', new Error('Wrapped: Could not locate the bindings file')],
    [
      'a driver error deeper than the inspected chain',
      withCause('1', withCause('2', withCause('3', withCause('4', withCause('5', dlopenFailed()))))),
    ],
    ['a string', 'Could not locate the bindings file'],
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
  ])('does not recognize %s', (_name, error) => {
    expect(isSqliteDriverLoadFailure(error)).toBe(false);
  });

  it('stops on a cause cycle', () => {
    const first = new Error('first');
    const second = withCause('second', first);
    (first as Error & { cause?: unknown }).cause = second;

    expect(isSqliteDriverLoadFailure(first)).toBe(false);
  });

  it('never throws, even when reading the error throws', () => {
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error('getter failed');
        },
      }
    );

    expect(isSqliteDriverLoadFailure(hostile)).toBe(false);
    expect(
      isSqliteDriverLoadFailure({
        get code(): never {
          throw new Error('getter failed');
        },
      })
    ).toBe(false);
  });
});

type FakeClient = {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

const asPrismaClient = (client: FakeClient): PrismaClient => client as unknown as PrismaClient;

describe.sequential('PrismaClientLifecycle when the SQLite driver cannot load (AC-001)', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  const physicalTargetUrl = async (): Promise<string> => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-driver-'));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, 'driver.db');
    await writeFile(databasePath, '');
    return `file:${databasePath}`;
  };

  const initializeWithConnectFailure = async (connectFailure: unknown) => {
    const client: FakeClient = {
      $connect: vi.fn().mockRejectedValue(connectFailure),
      $disconnect: vi.fn().mockResolvedValue(undefined),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    };
    const lifecycle = new PrismaClientLifecycle({ clientFactory: () => asPrismaClient(client) });
    const diagnostic = vi.fn();
    let error: unknown;
    try {
      await lifecycle.initialize({ datasourceUrl: await physicalTargetUrl(), onDiagnostic: diagnostic });
    } catch (caught) {
      error = caught;
    }
    return { lifecycle, client, diagnostic, error: error as Error & { code?: string } };
  };

  it.each([
    ['(a) the bindings "not found" error', bindingsNotFound()],
    ['(b) an ERR_DLOPEN_FAILED error', dlopenFailed()],
    ['(c) a bindings error as a cause', withCause('connect failed', bindingsNotFound())],
    ['(c) an ERR_DLOPEN_FAILED error as a cause', withCause('connect failed', dlopenFailed())],
  ])('rejects %s with SQLITE_DRIVER_UNAVAILABLE and a path-free message', async (_name, failure) => {
    const { lifecycle, client, diagnostic, error } = await initializeWithConnectFailure(failure);

    expect(error).toMatchObject({
      name: 'PrismaInitializationError',
      code: 'SQLITE_DRIVER_UNAVAILABLE',
      message:
        'The SQLite driver (better-sqlite3) could not load its native module. Allow its build or ' +
        'rebuild it for this Node.js version; see "Allow the native SQLite build" in the ' +
        'repository_prisma README.',
    });
    expect('cause' in error).toBe(false);
    expect(String(error)).not.toContain('node_modules');
    expect(String(error)).not.toContain('/private/app');
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic).toHaveBeenCalledWith({ code: 'SQLITE_DRIVER_UNAVAILABLE', cause: failure });
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );
  });

  it('(d) keeps CONNECTION_FAILED for any other connect failure', async () => {
    const failure = new Error('Cannot open database because the directory does not exist');
    const { lifecycle, diagnostic, error } = await initializeWithConnectFailure(failure);

    expect(error).toMatchObject({ name: 'PrismaInitializationError', code: 'CONNECTION_FAILED' });
    expect(diagnostic).toHaveBeenCalledWith({ code: 'CONNECTION_FAILED', cause: failure });
    expect(() => lifecycle.getClientForOperation()).toThrowError(
      expect.objectContaining({ code: 'CLIENT_NOT_READY' })
    );
  });
});
