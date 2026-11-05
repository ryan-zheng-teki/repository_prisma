import { AsyncLocalStorage } from 'async_hooks';
import type { TransactionClient, TransactionIsolationLevel } from './prisma-types';
import { rootPrismaClient } from './client';

// The storage holds the Transaction Client
export const prismaContext = new AsyncLocalStorage<TransactionClient>();

export const getTransactionClient = (): TransactionClient | undefined => {
  return prismaContext.getStore();
};

// Internal helper for running within ALS
export const runInTransactionContext = <T>(
  tx: TransactionClient,
  callback: () => Promise<T>
): Promise<T> => {
  return prismaContext.run(tx, callback);
};

export type RunInTransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: TransactionIsolationLevel;
};

// Public HOF that STARTS a transaction and puts it in ALS
export const runInTransaction = <T>(
  callback: () => Promise<T>,
  options?: RunInTransactionOptions
): Promise<T> => {
  const existing = getTransactionClient();

  if (existing) {
    return runInTransactionContext(existing, callback);
  }

  const execute = (tx: TransactionClient) =>
    runInTransactionContext(tx, callback);

  // Preserve Prisma's one-argument call and defaults when options are omitted.
  return options === undefined
    ? rootPrismaClient.$transaction(execute)
    : rootPrismaClient.$transaction(execute, options);
};
