import { PrismaClient, Prisma } from '../src/generated/prisma/client';
const { registerPrismaClient, initializePrisma, shutdownPrisma, BaseRepository, prisma, runInTransaction } = require('repository_prisma');
registerPrismaClient({ PrismaClient, Prisma });
async function main() {
  await initializePrisma({ datasourceUrl: `file:${process.cwd()}/cjs.db` });
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL UNIQUE)');
  await prisma.user.deleteMany();
  await runInTransaction(async () => { await prisma.user.create({ data: { email: 'cjs@x' } }); });
  console.log('cjs', JSON.stringify(await prisma.user.findMany()), typeof module, typeof require);
  await shutdownPrisma();
}
main();
