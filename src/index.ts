export { BaseRepository } from './lib/base-repository';
export { Transactional } from './lib/decorators';
export { runInTransaction, getTransactionClient } from './lib/context';
export { getPrismaClient } from './lib/prisma-manager';
export { prisma } from './lib/prisma-proxy';
export { initializePrisma, shutdownPrisma, rootPrismaClient } from './lib/client';
export type { Delegate } from './lib/base-repository';
