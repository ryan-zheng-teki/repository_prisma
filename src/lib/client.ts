import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// Global instance (singleton-like)
export const rootPrismaClient = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export type InitializePrismaOptions = {
  enableWAL?: boolean;
};

export const initializePrisma = async (
  options: InitializePrismaOptions = {}
): Promise<void> => {
  const { enableWAL = false } = options;

  await rootPrismaClient.$connect();

  if (!enableWAL) {
    return;
  }

  try {
    await rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  } catch (error) {
    // Best-effort for SQLite-only optimization.
    console.warn('Failed to enable WAL mode:', error);
  }
};

export const shutdownPrisma = async (): Promise<void> => {
  await rootPrismaClient.$disconnect();
};
