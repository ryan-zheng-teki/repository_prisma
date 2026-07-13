import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDatasourceTarget } from '../lib/client/datasource-target';
import {
  activateSqliteWal,
  verifySqliteIdentity,
  verifySqliteWal,
} from '../lib/client/sqlite-readiness';

const queryClient = (query: ReturnType<typeof vi.fn>): PrismaClient =>
  ({ $queryRawUnsafe: query } as unknown as PrismaClient);

describe('datasource target normalization', () => {
  const originalPlatform = process.platform;
  const originalCwd = process.cwd();
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
      enumerable: true,
    });
    process.chdir(originalCwd);
    vi.doUnmock('node:path');
    vi.resetModules();
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it('preserves physical SQLite spelling and query parameters while resolving against cwd', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-target-'));
    temporaryDirectories.push(directory);
    process.chdir(directory);
    const cwd = process.cwd();

    const target = resolveDatasourceTarget(
      ' file:./nested/literal%20 space.db?connection_limit=1 '
    );

    expect(target).toEqual({
      kind: 'sqlite-file',
      clientUrl: `file:${path.join(cwd, 'nested/literal%20 space.db')}?connection_limit=1`,
      bindingKey: `file:${path.join(cwd, 'nested/literal%20 space.db')}?connection_limit=1`,
      expectedPath: path.join(cwd, 'nested/literal%20 space.db'),
    });
  });

  it.each([
    ['file::memory:', 'file::memory:'],
    ['file:?mode=memory&cache=shared', 'file:?mode=memory&cache=shared'],
    ['file:shared?mode=MEMORY', 'file:shared?mode=MEMORY'],
  ])('classifies %s as SQLite memory', (url, clientUrl) => {
    expect(resolveDatasourceTarget(url)).toEqual({
      kind: 'sqlite-memory',
      clientUrl,
      bindingKey: clientUrl,
    });
  });

  it('classifies non-SQLite targets without issuing or inventing physical identity', () => {
    expect(resolveDatasourceTarget('postgresql://example.invalid/app')).toEqual({
      kind: 'other',
      provider: 'postgresql',
      clientUrl: 'postgresql://example.invalid/app',
      bindingKey: 'postgresql://example.invalid/app',
    });
  });

  it('case-folds Windows drive and UNC binding paths while preserving Prisma client spelling', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
      enumerable: true,
    });
    vi.doMock('node:path', async () => {
      const nodePath = await vi.importActual<typeof import('node:path')>('node:path');
      return { default: nodePath.win32 };
    });
    vi.resetModules();
    const { resolveDatasourceTarget: resolveWindowsTarget } = await import(
      '../lib/client/datasource-target'
    );

    const upperDrive = resolveWindowsTarget('file:/C:/Data/App.db?x=1');
    const lowerDrive = resolveWindowsTarget('file:c:/data/app.db?x=1');
    expect(upperDrive).toMatchObject({
      kind: 'sqlite-file',
      clientUrl: 'file:C:/Data/App.db?x=1',
      bindingKey: 'file:c:/data/app.db?x=1',
      expectedPath: 'C:\\Data\\App.db',
    });
    expect(lowerDrive.bindingKey).toBe(upperDrive.bindingKey);

    const upperUnc = resolveWindowsTarget('file://Server/Share/App.db');
    const lowerUnc = resolveWindowsTarget('file://server/share/app.db');
    expect(upperUnc).toMatchObject({
      kind: 'sqlite-file',
      clientUrl: 'file://Server/Share/App.db',
      bindingKey: 'file://server/share/app.db',
      expectedPath: '\\\\Server\\Share\\App.db',
    });
    expect(lowerUnc.bindingKey).toBe(upperUnc.bindingKey);
  });
});

describe('SQLite readiness parsing and canonical identity', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it('accepts a symlink alias when expected and reported paths resolve to the same file', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-alias-'));
    directories.push(directory);
    const physical = path.join(directory, 'physical.db');
    const alias = path.join(directory, 'alias.db');
    await writeFile(physical, '');
    await symlink(physical, alias);
    const query = vi.fn().mockResolvedValue([
      { seq: 0, name: 'MAIN', file: physical },
    ]);

    await expect(
      verifySqliteIdentity(queryClient(query), {
        kind: 'sqlite-file',
        clientUrl: `file:${alias}`,
        bindingKey: `file:${alias}`,
        expectedPath: alias,
      })
    ).resolves.toBeUndefined();
  });

  it.each([
    ['non-array', { not: 'rows' }],
    ['missing main', [{ seq: 1, name: 'temp', file: '/tmp/temp.db' }]],
    [
      'multiple main rows',
      [
        { seq: 0, name: 'main', file: '/tmp/a.db' },
        { seq: 1, name: 'MAIN', file: '/tmp/b.db' },
      ],
    ],
    ['missing main file', [{ seq: 0, name: 'main', file: '' }]],
  ])('rejects a %s database_list response', async (_name, rows) => {
    const query = vi.fn().mockResolvedValue(rows);
    await expect(
      verifySqliteIdentity(queryClient(query), {
        kind: 'sqlite-file',
        clientUrl: 'file:/tmp/expected.db',
        bindingKey: 'file:/tmp/expected.db',
        expectedPath: '/tmp/expected.db',
      })
    ).rejects.toBeInstanceOf(Error);
  });

  it('uses separate activation and case-insensitive verification queries', async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
      { journal_mode: 'WaL' },
    ]);
    const client = queryClient(query);

    await activateSqliteWal(client);
    await verifySqliteWal(client);

    expect(query.mock.calls).toEqual([
      ['PRAGMA journal_mode = WAL;'],
      ['PRAGMA journal_mode;'],
    ]);
  });

  it.each([
    ['non-array', { journal_mode: 'wal' }],
    ['zero rows', []],
    ['multiple rows', [{ journal_mode: 'wal' }, { journal_mode: 'wal' }]],
    ['multiple fields', [{ journal_mode: 'wal', extra: 'wal' }]],
    ['non-string', [{ journal_mode: 1 }]],
    ['non-WAL', [{ journal_mode: 'delete' }]],
  ])('rejects a %s journal-mode verification response', async (_name, rows) => {
    await expect(
      verifySqliteWal(queryClient(vi.fn().mockResolvedValue(rows)))
    ).rejects.toBeInstanceOf(Error);
  });
});
