import { AsyncLocalStorage } from 'async_hooks';
import { Prisma } from '@prisma/client';
import { rootPrismaClient } from './client';

// The storage holds the Transaction Client
export const prismaContext = new AsyncLocalStorage<Prisma.TransactionClient>();

export const getTransactionClient = (): Prisma.TransactionClient | undefined => {
  return prismaContext.getStore();
};

// Internal helper for running within ALS
export const runInTransactionContext = <T>(
  tx: Prisma.TransactionClient,
  callback: () => Promise<T>
): Promise<T> => {
  return prismaContext.run(tx, callback);
};

// Public HOF that STARTS a transaction and puts it in ALS
export const runInTransaction = <T>(callback: () => Promise<T>): Promise<T> => {
  const existing = getTransactionClient();

  if (existing) {
    return runInTransactionContext(existing, callback);
  }

  // Use the standard client to start a tx
  return rootPrismaClient.$transaction((tx) => {
    // Inside the tx callback, we set the ALS context
    return runInTransactionContext(tx, callback);
  });
};
