import { describe, expect, it, vi } from 'vitest';
import {
  gateSqliteConnection,
  type SqliteDriverAdapterFactory,
} from '../lib/client/sqlite-connection-gate';

type Adapter = Awaited<ReturnType<SqliteDriverAdapterFactory['connect']>>;
type Transaction = Awaited<ReturnType<Adapter['startTransaction']>>;
type Query = Parameters<Adapter['queryRaw']>[0];

const sql = (text: string): Query => ({ sql: text, args: [], argTypes: [] }) as Query;
const emptyResult = { columnNames: [], columnTypes: [], rows: [] };
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

type FakeTransaction = Transaction & {
  commit: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
  queryRaw: ReturnType<typeof vi.fn>;
  executeRaw: ReturnType<typeof vi.fn>;
};

const fakeTransaction = (
  overrides: Partial<Record<keyof Transaction, unknown>> = {}
): FakeTransaction =>
  ({
    provider: 'sqlite',
    adapterName: 'fake-sqlite',
    options: { usePhantomQuery: false },
    queryRaw: vi.fn().mockResolvedValue(emptyResult),
    executeRaw: vi.fn().mockResolvedValue(1),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as FakeTransaction;

/** A fake inner connection that records when each plain operation starts and ends. */
const fakeConnection = (
  adapterOverrides: Partial<Record<keyof Adapter, unknown>> = {}
) => {
  const events: string[] = [];
  const plain = (kind: string, result: unknown) =>
    vi.fn(async (input: Query | string) => {
      const label = `${kind}:${typeof input === 'string' ? input : input.sql}`;
      events.push(`start ${label}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`end ${label}`);
      return result;
    });
  const transactions: FakeTransaction[] = [];
  const base = {
    provider: 'sqlite',
    adapterName: 'fake-sqlite',
    queryRaw: plain('query', emptyResult),
    executeRaw: plain('execute', 1),
    executeScript: plain('script', undefined),
    startTransaction: vi.fn(async () => {
      const transaction = fakeTransaction();
      transactions.push(transaction);
      return transaction;
    }),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
  const inner = Object.assign(base, adapterOverrides);
  const factory = {
    provider: 'sqlite',
    adapterName: 'fake-sqlite',
    connect: vi.fn(async () => inner),
  } as unknown as SqliteDriverAdapterFactory;
  return { factory, inner, events, transactions };
};

const connectGated = async (connection: ReturnType<typeof fakeConnection>) =>
  gateSqliteConnection(connection.factory).connect();

describe('SQLite connection gate', () => {
  it('forwards adapter information, connection info, savepoints and dispose unchanged', async () => {
    const savepointTransaction = fakeTransaction({
      createSavepoint: vi.fn().mockResolvedValue(undefined),
      rollbackToSavepoint: vi.fn().mockResolvedValue(undefined),
      releaseSavepoint: vi.fn().mockResolvedValue(undefined),
    });
    const connectionInfo = { supportsRelationJoins: false };
    const connection = fakeConnection({
      getConnectionInfo: vi.fn(() => connectionInfo),
      startTransaction: vi.fn().mockResolvedValue(savepointTransaction),
    });
    const factory = gateSqliteConnection(connection.factory);
    expect(factory).toMatchObject({ provider: 'sqlite', adapterName: 'fake-sqlite' });

    const adapter = await factory.connect();
    expect(adapter).toMatchObject({ provider: 'sqlite', adapterName: 'fake-sqlite' });
    expect(adapter.getConnectionInfo?.()).toBe(connectionInfo);
    await adapter.dispose();
    expect(connection.inner.dispose).toHaveBeenCalledTimes(1);

    const transaction = await adapter.startTransaction('SERIALIZABLE');
    expect(connection.inner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
    expect(transaction).toMatchObject({
      provider: 'sqlite',
      adapterName: 'fake-sqlite',
      options: { usePhantomQuery: false },
    });
    await transaction.createSavepoint?.('sp1');
    await transaction.rollbackToSavepoint?.('sp1');
    await transaction.releaseSavepoint?.('sp1');
    expect(savepointTransaction.createSavepoint).toHaveBeenCalledWith('sp1');
    expect(savepointTransaction.rollbackToSavepoint).toHaveBeenCalledWith('sp1');
    expect(savepointTransaction.releaseSavepoint).toHaveBeenCalledWith('sp1');
    await transaction.commit();
  });

  it('leaves optional methods absent when the inner adapter has none', async () => {
    const adapter = await connectGated(fakeConnection());
    expect(adapter.getConnectionInfo).toBeUndefined();

    const transaction = await adapter.startTransaction();
    expect(transaction.createSavepoint).toBeUndefined();
    expect(transaction.rollbackToSavepoint).toBeUndefined();
    expect(transaction.releaseSavepoint).toBeUndefined();
    await transaction.rollback();
  });

  it('runs plain operations one at a time in call order', async () => {
    const connection = fakeConnection();
    const adapter = await connectGated(connection);

    await Promise.all([
      adapter.queryRaw(sql('a')),
      adapter.executeRaw(sql('b')),
      adapter.executeScript('c'),
    ]);

    expect(connection.events).toEqual([
      'start query:a',
      'end query:a',
      'start execute:b',
      'end execute:b',
      'start script:c',
      'end script:c',
    ]);
  });

  it('holds plain operations while a transaction is open and runs its own statements directly', async () => {
    const connection = fakeConnection();
    const adapter = await connectGated(connection);
    const transaction = await adapter.startTransaction();

    const plainQuery = adapter.queryRaw(sql('outside'));
    const plainScript = adapter.executeScript('outside-script');
    await expect(transaction.executeRaw(sql('inside'))).resolves.toBe(1);
    await expect(transaction.queryRaw(sql('inside'))).resolves.toEqual(emptyResult);
    await settle();
    expect(connection.inner.queryRaw).not.toHaveBeenCalled();
    expect(connection.inner.executeScript).not.toHaveBeenCalled();

    await transaction.commit();
    await Promise.all([plainQuery, plainScript]);
    expect(connection.inner.queryRaw).toHaveBeenCalledTimes(1);
    expect(connection.inner.executeScript).toHaveBeenCalledTimes(1);
  });

  it('queues transactions in order and releases the lock on rollback', async () => {
    const connection = fakeConnection();
    const adapter = await connectGated(connection);
    const first = await adapter.startTransaction();

    let secondStarted = false;
    const second = adapter.startTransaction().then((transaction) => {
      secondStarted = true;
      return transaction;
    });
    await settle();
    expect(secondStarted).toBe(false);
    expect(connection.inner.startTransaction).toHaveBeenCalledTimes(1);

    await first.rollback();
    const secondTransaction = await second;
    expect(connection.inner.startTransaction).toHaveBeenCalledTimes(2);
    await secondTransaction.commit();
    await expect(adapter.queryRaw(sql('after'))).resolves.toEqual(emptyResult);
  });

  it.each(['commit', 'rollback'] as const)(
    'releases the lock when %s throws and reports the failure',
    async (end) => {
      const failure = new Error(`${end} failed`);
      const failingTransaction = fakeTransaction({
        [end]: vi.fn().mockRejectedValue(failure),
      });
      const connection = fakeConnection({
        startTransaction: vi.fn().mockResolvedValue(failingTransaction),
      });
      const adapter = await connectGated(connection);
      const transaction = await adapter.startTransaction();

      await expect(transaction[end]()).rejects.toBe(failure);
      await expect(adapter.queryRaw(sql('after'))).resolves.toEqual(emptyResult);
    }
  );

  it('releases the lock only once when a transaction ends twice', async () => {
    const connection = fakeConnection();
    const adapter = await connectGated(connection);
    const first = await adapter.startTransaction();
    await first.commit();
    const second = await adapter.startTransaction();

    await first.rollback();
    const plainQuery = adapter.queryRaw(sql('behind-second'));
    await settle();
    expect(connection.inner.queryRaw).not.toHaveBeenCalled();

    await second.commit();
    await plainQuery;
    expect(connection.inner.queryRaw).toHaveBeenCalledTimes(1);
  });

  it('releases the lock when starting a transaction fails', async () => {
    const failure = new Error('BEGIN failed');
    const connection = fakeConnection();
    connection.inner.startTransaction.mockRejectedValueOnce(failure);
    const adapter = await connectGated(connection);

    await expect(adapter.startTransaction()).rejects.toBe(failure);
    await expect(adapter.queryRaw(sql('after'))).resolves.toEqual(emptyResult);
    const transaction = await adapter.startTransaction();
    await transaction.commit();
  });

  it('releases the lock when a plain operation fails', async () => {
    const failure = new Error('query failed');
    const connection = fakeConnection();
    connection.inner.executeRaw.mockRejectedValueOnce(failure);
    const adapter = await connectGated(connection);

    await expect(adapter.executeRaw(sql('broken'))).rejects.toBe(failure);
    await expect(adapter.queryRaw(sql('after'))).resolves.toEqual(emptyResult);
  });
});
