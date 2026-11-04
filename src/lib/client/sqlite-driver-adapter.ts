import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import type { ResolvedDatasourceTarget } from './datasource-target';

/**
 * Builds the Prisma 7 driver adapter the library uses to open a resolved SQLite target.
 *
 * - A file target opens its resolved physical path. The URL query string is not passed
 *   on, because the adapter would treat it as part of the file name.
 * - A memory target opens a private in-memory database.
 * - `DateTime` values are stored as INTEGER unix milliseconds, the representation
 *   Prisma 5 used, so rows written before the upgrade keep filtering and ordering
 *   correctly.
 */
export const createSqliteDriverAdapter = (
  target: ResolvedDatasourceTarget
): PrismaBetterSqlite3 =>
  new PrismaBetterSqlite3(
    { url: target.kind === 'sqlite-file' ? target.expectedPath : ':memory:' },
    { timestampFormat: 'unixepoch-ms' }
  );
