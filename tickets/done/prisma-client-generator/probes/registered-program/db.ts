import * as generated from '../../generated/prisma-client/client';
import { registerPrismaClient } from 'repository_prisma';
registerPrismaClient(generated);
declare module 'repository_prisma' {
  interface PrismaClientRegistry { client: typeof generated }
}
