import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
const describe = (e, depth = 0) => {
  if (!e || depth > 4) return null;
  return { cls: e?.constructor?.name, code: e?.code, errorCode: e?.errorCode, msg: String(e?.message).split('\n')[0].slice(0, 140), cause: describe(e?.cause, depth + 1) };
};
const mode = process.argv[2];
if (mode === 'explicit') {
  let cause;
  try { await initializePrisma({ datasourceUrl: 'file:./x.db', onDiagnostic: (d) => { cause = d.cause; } }); console.log('init ok'); }
  catch (e) { console.log(JSON.stringify({ thrown: describe(e), diagnosticCause: describe(cause) }, null, 1)); }
} else {
  process.env.DATABASE_URL = 'file:./y.db';
  try { await rootPrismaClient.user.count(); console.log('lazy ok'); }
  catch (e) { console.log(JSON.stringify({ lazyThrown: describe(e) }, null, 1)); }
}
await shutdownPrisma().catch(() => {});
