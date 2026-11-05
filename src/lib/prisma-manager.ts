import type { RegisteredPrismaClient, TransactionClient } from './prisma-types';
import { getTransactionClient } from './context';
import { rootPrismaClient } from './client';

// Re-export for convenience if needed, or consumers import from client
export { rootPrismaClient };

export type PrismaClientLike = RegisteredPrismaClient | TransactionClient;

export const getPrismaClient = (): PrismaClientLike => {
  const tx = getTransactionClient();
  if (tx) {
    return tx;
  }
  return rootPrismaClient;
};
