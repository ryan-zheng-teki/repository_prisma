export { BaseRepository } from './lib/base-repository';
export { Transactional } from './lib/decorators';
export { runInTransaction, getTransactionClient } from './lib/context';
export { getPrismaClient } from './lib/prisma-manager';
export { prisma } from './lib/prisma-proxy';
export {
  initializePrisma,
  shutdownPrisma,
  rootPrismaClient,
  PrismaInitializationError,
} from './lib/client';
export type {
  InitializePrismaOptions,
  PrismaInitializationDiagnostic,
  PrismaInitializationErrorCode,
} from './lib/client';
export { defineRepository } from './lib/repository-factory';
export { Models } from './lib/models';
export { detectDatabaseProvider, getDatabaseUrl, isSqliteProvider, supportsCaseInsensitiveMode } from './lib/database';
export { buildContainsFilter, filterContainsCaseInsensitive } from './lib/filters';
export type { Delegate } from './lib/base-repository';
export type { ModelName } from './lib/models';
