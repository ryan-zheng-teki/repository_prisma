import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import type { ResolvedDatasourceTarget } from './datasource-target';
import {
  gateSqliteConnection,
  type SqliteDriverAdapterFactory,
} from './sqlite-connection-gate';

/**
 * Builds the Prisma 7 driver adapter the library uses to open a resolved SQLite target.
 *
 * - A file target opens its resolved physical path. The URL query string is not passed
 *   on, because the adapter would treat it as part of the file name.
 * - A memory target opens a private in-memory database.
 * - `DateTime` values are stored as INTEGER unix milliseconds, the representation
 *   Prisma 5 used, so rows written before the upgrade keep filtering and ordering
 *   correctly.
 * - The connection is gated, so work outside a transaction never runs inside another
 *   request's open transaction (see `sqlite-connection-gate.ts`).
 */
export const createSqliteDriverAdapter = (
  target: ResolvedDatasourceTarget
): SqliteDriverAdapterFactory =>
  gateSqliteConnection(
    new PrismaBetterSqlite3(
      { url: target.kind === 'sqlite-file' ? target.expectedPath : ':memory:' },
      { timestampFormat: 'unixepoch-ms' }
    )
  );

/** The message prefix of the `bindings` loader when better-sqlite3's native module is missing. */
const BINDINGS_NOT_FOUND = 'Could not locate the bindings file';
/** How many errors of a `cause` chain are inspected: the error and up to four causes. */
const MAX_INSPECTED_ERRORS = 5;

/**
 * Whether an error from opening the SQLite connection means that better-sqlite3 could not
 * load its native module: the `bindings` loader found no built module, or Node could not
 * load it (`ERR_DLOPEN_FAILED`, for example a module built for another Node.js version).
 * The error and its `cause` chain are inspected. Any other error, including one whose shape
 * a future driver version changes, is not a driver-load failure. Never throws.
 */
export const isSqliteDriverLoadFailure = (error: unknown): boolean => {
  const inspected = new Set<object>();
  let current = error;
  while (
    typeof current === 'object' &&
    current !== null &&
    !inspected.has(current) &&
    inspected.size < MAX_INSPECTED_ERRORS
  ) {
    inspected.add(current);
    try {
      const { code, message, cause } = current as {
        code?: unknown;
        message?: unknown;
        cause?: unknown;
      };
      if (code === 'ERR_DLOPEN_FAILED') {
        return true;
      }
      if (typeof message === 'string' && message.startsWith(BINDINGS_NOT_FOUND)) {
        return true;
      }
      current = cause;
    } catch {
      return false;
    }
  }
  return false;
};
