// The README's copy-paste db.ts for apps on Prisma's `prisma-client` generator. Import it first
// in your entry file. Here the generator output is the repository's `generated/prisma-client`;
// in an app it is the generator's `output` (for example `./generated/prisma/client`).
import * as generated from '../../generated/prisma-client/client';
import { registerPrismaClient } from 'repository_prisma';

registerPrismaClient(generated);

declare module 'repository_prisma' {
  interface PrismaClientRegistry {
    client: typeof generated;
  }
}
