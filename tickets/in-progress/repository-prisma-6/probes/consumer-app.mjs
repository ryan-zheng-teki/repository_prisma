import { initializePrisma, rootPrismaClient, shutdownPrisma, PrismaInitializationError } from 'repository_prisma';
try {
  await initializePrisma({ datasourceUrl: 'file:./app.db', onDiagnostic: ({ code, cause }) => console.log('diagnostic', code, String(cause?.message ?? cause).split('\n')[0].slice(0, 200)) });
  await rootPrismaClient.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL)');
  console.log('count', await rootPrismaClient.user.count());
  await shutdownPrisma();
  console.log('RESULT ok');
} catch (e) { console.log('RESULT failed', e instanceof PrismaInitializationError ? e.code : e.constructor.name, String(e.message).split('\n')[0]); }
