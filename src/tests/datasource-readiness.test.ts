import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDatasourceTarget } from '../lib/client/datasource-target';
import { InitializationStageFailure } from '../lib/client/initialization-error';
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

  it('resolves the physical SQLite path against cwd and keeps query parameters only in the binding key', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-target-'));
    temporaryDirectories.push(directory);
    process.chdir(directory);
    const cwd = process.cwd();

    const target = resolveDatasourceTarget(
      ' file:./nested/literal%20 space.db?connection_limit=1 '
    );

    expect(target).toEqual({
      kind: 'sqlite-file',
      bindingKey: `file:${path.join(cwd, 'nested/literal%20 space.db')}?connection_limit=1`,
      expectedPath: path.join(cwd, 'nested/literal%20 space.db'),
    });
  });

  it.each([
    ['file::memory:', 'file::memory:'],
    ['file:?mode=memory&cache=shared', 'file:?mode=memory&cache=shared'],
    ['file:shared?mode=MEMORY', 'file:shared?mode=MEMORY'],
  ])('classifies %s as SQLite memory', (url, bindingKey) => {
    expect(resolveDatasourceTarget(url)).toEqual({
      kind: 'sqlite-memory',
      bindingKey,
    });
  });

  it.each([
    'postgresql://user:secret@db.example.invalid:5432/app',
    'postgres://user:secret@db.example.invalid/app',
    'mysql://user:secret@db.example.invalid/app',
    'sqlserver://db.example.invalid;password=secret',
    'mongodb+srv://user:secret@db.example.invalid/app',
  ])('rejects the non-SQLite target %s with a cause that carries no URL', (url) => {
    let failure: unknown;
    try {
      resolveDatasourceTarget(url);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(InitializationStageFailure);
    const { code, cause } = failure as InitializationStageFailure;
    expect(code).toBe('UNSUPPORTED_DATASOURCE_PROVIDER');
    expect(String(cause)).not.toContain('secret');
    expect(String(cause)).not.toContain('db.example.invalid');
  });

  it('case-folds Windows drive and UNC binding paths while preserving the opened path spelling', async () => {
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
      bindingKey: 'file:c:/data/app.db?x=1',
      expectedPath: 'C:\\Data\\App.db',
    });
    expect(lowerDrive.bindingKey).toBe(upperDrive.bindingKey);

    const upperUnc = resolveWindowsTarget('file://Server/Share/App.db');
    const lowerUnc = resolveWindowsTarget('file://server/share/app.db');
    expect(upperUnc).toMatchObject({
      kind: 'sqlite-file',
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
