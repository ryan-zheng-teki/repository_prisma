import type { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

/** The driver-adapter factory shape Prisma needs from a SQLite adapter. */
export type SqliteDriverAdapterFactory = Pick<
  PrismaBetterSqlite3,
  'provider' | 'adapterName' | 'connect'
>;
type SqliteDriverAdapter = Awaited<ReturnType<SqliteDriverAdapterFactory['connect']>>;
type SqliteTransaction = Awaited<ReturnType<SqliteDriverAdapter['startTransaction']>>;
type SqliteQuery = Parameters<SqliteDriverAdapter['queryRaw']>[0];
type IsolationLevel = Parameters<SqliteDriverAdapter['startTransaction']>[0];
type Release = () => void;

/**
 * A FIFO lock with no timeout of its own: Prisma's transaction `maxWait` and `timeout`
 * bound how long a transaction waits and holds it.
 */
const createConnectionLock = (): (() => Promise<Release>) => {
  let tail: Promise<void> = Promise.resolve();
  return () => {
    let release!: Release;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = tail.then(() => release);
    tail = acquired.then(() => released);
    return acquired;
  };
};

const gateTransaction = (
  inner: SqliteTransaction,
  release: Release
): SqliteTransaction => {
  let ended = false;
  const releaseOnce = (): void => {
    if (!ended) {
      ended = true;
      release();
    }
  };
  const end = async (finish: () => Promise<void>): Promise<void> => {
    try {
      await finish();
    } finally {
      releaseOnce();
    }
  };

  // Statements of the transaction already run under the lock it holds.
  return {
    provider: inner.provider,
    adapterName: inner.adapterName,
    options: inner.options,
    queryRaw: (query: SqliteQuery) => inner.queryRaw(query),
    executeRaw: (query: SqliteQuery) => inner.executeRaw(query),
    commit: () => end(() => inner.commit()),
    rollback: () => end(() => inner.rollback()),
    ...(inner.createSavepoint && {
      createSavepoint: (name: string) => inner.createSavepoint!(name),
    }),
    ...(inner.rollbackToSavepoint && {
      rollbackToSavepoint: (name: string) => inner.rollbackToSavepoint!(name),
    }),
    ...(inner.releaseSavepoint && {
      releaseSavepoint: (name: string) => inner.releaseSavepoint!(name),
    }),
  };
};

const gateAdapter = (inner: SqliteDriverAdapter): SqliteDriverAdapter => {
  const acquire = createConnectionLock();
  const exclusive = async <T>(work: () => Promise<T>): Promise<T> => {
    const release = await acquire();
    try {
      return await work();
    } finally {
      release();
    }
  };

  return {
    provider: inner.provider,
    adapterName: inner.adapterName,
    queryRaw: (query: SqliteQuery) => exclusive(() => inner.queryRaw(query)),
    executeRaw: (query: SqliteQuery) => exclusive(() => inner.executeRaw(query)),
    executeScript: (script: string) => exclusive(() => inner.executeScript(script)),
    startTransaction: async (isolationLevel?: IsolationLevel) => {
      const release = await acquire();
      try {
        return gateTransaction(await inner.startTransaction(isolationLevel), release);
      } catch (error) {
        release();
        throw error;
      }
    },
    ...(inner.getConnectionInfo && {
      getConnectionInfo: () => inner.getConnectionInfo!(),
    }),
    dispose: () => inner.dispose(),
  };
};

/**
 * Gives each SQLite connection one lock. Prisma's better-sqlite3 adapter runs every client
 * operation on a single connection, and only its transactions take that adapter's own lock.
 * Without this gate, a plain query from another request would run inside an open
 * transaction: it would see uncommitted rows, and its writes would be rolled back with that
 * transaction.
 *
 * - A plain `queryRaw`, `executeRaw` or `executeScript` holds the lock for its call.
 * - `startTransaction` takes the lock, and the transaction releases it exactly once, when it
 *   commits or rolls back (even if that fails). If starting fails, the lock is released.
 */
export const gateSqliteConnection = (
  factory: SqliteDriverAdapterFactory
): SqliteDriverAdapterFactory => ({
  provider: factory.provider,
  adapterName: factory.adapterName,
  connect: async () => gateAdapter(await factory.connect()),
});
