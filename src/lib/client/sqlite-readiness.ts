import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { SqliteFileDatasourceTarget } from './datasource-target';

type DatabaseListRow = {
  name?: unknown;
  file?: unknown;
};

type JournalModeRow = Record<string, unknown>;

const canonicalPath = async (filePath: string): Promise<string> => {
  const resolved = path.normalize(await realpath(filePath));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

export const verifySqliteIdentity = async (
  client: PrismaClient,
  target: SqliteFileDatasourceTarget
): Promise<void> => {
  const rows = await client.$queryRawUnsafe<DatabaseListRow[]>('PRAGMA database_list;');
  if (!Array.isArray(rows)) {
    throw new Error('SQLite database identity response was malformed.');
  }

  const mainRows = rows.filter(
    (row) => typeof row?.name === 'string' && row.name.toLowerCase() === 'main'
  );
  if (mainRows.length !== 1 || typeof mainRows[0].file !== 'string' || mainRows[0].file.length === 0) {
    throw new Error('SQLite main database identity was unavailable.');
  }

  const [expected, actual] = await Promise.all([
    canonicalPath(target.expectedPath),
    canonicalPath(mainRows[0].file),
  ]);
  if (expected !== actual) {
    throw new Error('SQLite main database identity did not match the configured target.');
  }
};

export const activateSqliteWal = async (client: PrismaClient): Promise<void> => {
  await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
};

export const verifySqliteWal = async (client: PrismaClient): Promise<void> => {
  const rows = await client.$queryRawUnsafe<JournalModeRow[]>('PRAGMA journal_mode;');
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error('SQLite journal mode response was malformed.');
  }

  const values = Object.values(rows[0]);
  if (
    values.length !== 1 ||
    typeof values[0] !== 'string' ||
    values[0].toLowerCase() !== 'wal'
  ) {
    throw new Error('SQLite journal mode was not WAL.');
  }
};
