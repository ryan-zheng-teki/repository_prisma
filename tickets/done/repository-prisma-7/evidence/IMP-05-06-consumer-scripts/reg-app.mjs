// ESM consumer on the prisma-client generator: registers the compiled generated client, explicit init.
import * as generated from './reg-out/prisma/client.js';
import { registerPrismaClient, initializePrisma, rootPrismaClient, shutdownPrisma, PrismaInitializationError } from 'repository_prisma';
registerPrismaClient(generated);
const first = (value) => String(value ?? '').split('\n')[0].slice(0, 170);
let diagnostic;
try {
  await initializePrisma({ datasourceUrl: 'file:./reg.db', onDiagnostic: (d) => { diagnostic = d; } });
  await rootPrismaClient.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL)');
  console.log('RESULT ok (registered prisma-client)', 'count', await rootPrismaClient.user.count());
} catch (e) {
  console.log('RESULT failed (registered prisma-client)', e instanceof PrismaInitializationError ? e.code : e.constructor.name);
  console.log('  message:', e.message);
  console.log('  diagnostic:', diagnostic?.code, '|', first(diagnostic?.cause?.message), '| cause.code =', diagnostic?.cause?.code ?? '-');
}
await shutdownPrisma().catch(() => {});
