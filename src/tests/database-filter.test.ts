import { afterEach, describe, expect, it } from 'vitest';
import {
  detectDatabaseProvider,
  getDatabaseUrl,
  inferDatabaseProviderFromUrl,
  supportsCaseInsensitiveMode,
} from '../lib/database';
import {
  buildContainsFilter,
  filterContainsCaseInsensitive,
} from '../lib/filters';

const savedEnvironment = { ...process.env };

describe('database metadata and filter regressions', () => {
  afterEach(() => {
    process.env = { ...savedEnvironment };
  });

  it('uses the documented environment precedence and ignores empty values', () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://default/app';
    process.env.DATABASE_URL_TEST = 'file:/tmp/test.db';
    expect(getDatabaseUrl()).toBe('file:/tmp/test.db');

    process.env.DATABASE_URL_TEST = '   ';
    expect(getDatabaseUrl()).toBe('postgresql://default/app');

    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL_TEST = 'mysql://fallback/app';
    expect(getDatabaseUrl()).toBe('mysql://fallback/app');
  });

  it.each([
    ['file:/tmp/app.db', 'sqlite'],
    ['postgres://localhost/app', 'postgresql'],
    ['postgresql://localhost/app', 'postgresql'],
    ['mysql://localhost/app', 'mysql'],
    ['mongodb+srv://localhost/app', 'mongodb'],
    ['sqlserver://localhost/app', 'sqlserver'],
    ['cockroachdb://localhost/app', 'cockroachdb'],
    ['unknown://localhost/app', 'unknown'],
  ] as const)('infers %s as %s', (url, provider) => {
    expect(inferDatabaseProviderFromUrl(url)).toBe(provider);
  });

  it('preserves SQLite-safe contains filters and optional in-memory case folding', () => {
    process.env.PRISMA_DATASOURCE_PROVIDER = 'sqlite';
    expect(detectDatabaseProvider()).toBe('sqlite');
    expect(supportsCaseInsensitiveMode()).toBe(false);
    expect(buildContainsFilter('Alice', { caseInsensitive: true })).toEqual({
      contains: 'Alice',
    });
    expect(
      filterContainsCaseInsensitive(
        [{ name: 'ALICE' }, { name: 'Bob' }, { name: 'malice' }],
        'alice',
        (row) => row.name
      )
    ).toEqual([{ name: 'ALICE' }, { name: 'malice' }]);
  });

  it('retains provider-supported insensitive filter mode', () => {
    process.env.PRISMA_DATASOURCE_PROVIDER = 'postgresql';
    expect(buildContainsFilter('Alice', { caseInsensitive: true })).toEqual({
      contains: 'Alice',
      mode: 'insensitive',
    });
  });
});
