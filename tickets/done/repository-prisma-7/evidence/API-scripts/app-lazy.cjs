// CJS consumer, lazy binding: no initializePrisma; DATABASE_URL decides; the first query reaches the driver.
const { rootPrismaClient, shutdownPrisma } = require('repository_prisma');
const first = (value) => String(value ?? '').split('\n')[0].slice(0, 170);
(async () => {
  process.env.DATABASE_URL = 'file:./lazy-cjs.db';
  try {
    await rootPrismaClient.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL)');
    console.log('RESULT ok (lazy cjs)', await rootPrismaClient.user.count());
  } catch (e) { console.log('RESULT failed (lazy cjs)', e.constructor.name, e.code ?? '-', '|', first(e.message)); }
  await shutdownPrisma().catch(() => {});
})();
