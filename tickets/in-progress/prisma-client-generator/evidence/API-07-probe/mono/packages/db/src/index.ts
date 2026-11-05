// The README's db.ts, as the entry of a workspace package that owns the generated client.
import * as generated from './generated/prisma/client.js';
import { registerPrismaClient } from 'repository_prisma';

registerPrismaClient(generated);

declare module 'repository_prisma' {
  interface PrismaClientRegistry {
    client: typeof generated;
  }
}

export { Prisma } from './generated/prisma/client.js';
