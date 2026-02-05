import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

let rootClient: PrismaClient | null = null;

const getOrCreateRootClient = (): PrismaClient => {
  if (!rootClient) {
    rootClient = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  return rootClient;
};

// Global instance (singleton-like), but lazily created to avoid env timing issues.
export const rootPrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getOrCreateRootClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export type InitializePrismaOptions = {
  enableWAL?: boolean;
};

export const initializePrisma = async (
  options: InitializePrismaOptions = {}
): Promise<void> => {
  const { enableWAL = false } = options;

  const client = getOrCreateRootClient();
  await client.$connect();

  if (!enableWAL) {
    return;
  }

  try {
    await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  } catch (error) {
    // Best-effort for SQLite-only optimization.
    console.warn('Failed to enable WAL mode:', error);
  }
};

export const shutdownPrisma = async (): Promise<void> => {
  if (!rootClient) {
    return;
  }
  await rootClient.$disconnect();
  rootClient = null;
};
