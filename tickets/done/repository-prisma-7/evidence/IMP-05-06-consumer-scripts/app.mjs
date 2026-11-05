// ESM consumer (prisma-client-js). Usage: node app.mjs [explicit|lazy]
import { initializePrisma, rootPrismaClient, shutdownPrisma, PrismaInitializationError } from 'repository_prisma';
const first = (value) => String(value ?? '').split('\n')[0].slice(0, 170);
const createTable = 'CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL)';
if (process.argv[2] === 'lazy') {
  process.env.DATABASE_URL = 'file:./lazy.db';
  try { await rootPrismaClient.$executeRawUnsafe(createTable); console.log('RESULT ok (lazy)', await rootPrismaClient.user.count()); }
  catch (e) { console.log('RESULT failed (lazy)', e.constructor.name, e.code ?? '-', '|', first(e.message)); }
} else {
  let diagnostic;
  try {
    await initializePrisma({ datasourceUrl: 'file:./app.db', onDiagnostic: (d) => { diagnostic = d; } });
    await rootPrismaClient.$executeRawUnsafe(createTable);
    console.log('RESULT ok', 'count', await rootPrismaClient.user.count());
  } catch (e) {
    console.log('RESULT failed', e instanceof PrismaInitializationError ? e.code : e.constructor.name);
    console.log('  message:', e.message);
    console.log('  diagnostic:', diagnostic?.code, '|', first(diagnostic?.cause?.message), '| cause.code =', diagnostic?.cause?.code ?? '-');
  }
}
await shutdownPrisma().catch(() => {});
