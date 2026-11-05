// CJS consumer (prisma-client-js), explicit initialization.
const { initializePrisma, rootPrismaClient, shutdownPrisma, PrismaInitializationError } = require('repository_prisma');
const first = (value) => String(value ?? '').split('\n')[0].slice(0, 170);
(async () => {
  let diagnostic;
  try {
    await initializePrisma({ datasourceUrl: 'file:./app-cjs.db', onDiagnostic: (d) => { diagnostic = d; } });
    await rootPrismaClient.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL)');
    console.log('RESULT ok (cjs)', 'count', await rootPrismaClient.user.count());
  } catch (e) {
    console.log('RESULT failed (cjs)', e instanceof PrismaInitializationError ? e.code : e.constructor.name);
    console.log('  message:', e.message);
    console.log('  diagnostic:', diagnostic?.code, '|', first(diagnostic?.cause?.message), '| cause.code =', diagnostic?.cause?.code ?? '-');
  }
  await shutdownPrisma().catch(() => {});
})();
