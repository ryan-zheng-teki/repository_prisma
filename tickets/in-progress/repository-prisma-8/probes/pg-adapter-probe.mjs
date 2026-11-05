import { PrismaPg } from '@prisma/adapter-pg';
const PG = 'postgresql://postgres:probe@localhost:55432/probe';
globalThis.__probeAdapter = new PrismaPg({ connectionString: PG });
process.env.DATABASE_URL = 'file:./unused-by-adapter.db'; // satisfies the library's SQLite-only URL resolution
const repo = await import('repository_prisma');
const { prisma, rootPrismaClient, runInTransaction, initializePrisma, shutdownPrisma } = repo;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
await rootPrismaClient.$executeRawUnsafe('DELETE FROM "User"');
// 1. lazy CRUD
await prisma.user.create({ data: { email: 'a@x' } });
out.crud = (await prisma.user.findMany()).map((u) => u.email);
// 2. commit / rollback
await runInTransaction(async () => { await prisma.user.create({ data: { email: 'tx-commit@x' } }); });
out.rollback = await runInTransaction(async () => { await prisma.user.create({ data: { email: 'tx-rollback@x' } }); throw new Error('rb'); }).catch((e) => e.message);
// 3. CR-01 isolation shape: B outside tx during A's open tx
const A = runInTransaction(async () => { await prisma.user.create({ data: { email: 'in-tx@x' } }); await sleep(300); throw new Error('rollback-on-purpose'); }).catch((e) => e.message);
const B = (async () => { await sleep(50); const seen = (await prisma.user.findMany({ where: { email: 'in-tx@x' } })).length; await prisma.user.create({ data: { email: 'independent@x' } }); return seen; })();
const [, seenUncommitted] = await Promise.all([A, B]);
out.isolation = { seenUncommitted, independentSurvived: (await prisma.user.count({ where: { email: 'independent@x' } })) === 1, inTxGone: (await prisma.user.count({ where: { email: 'in-tx@x' } })) === 0 };
// 4. concurrent transactions overlap (pool): both hold 300 ms
const t0 = Date.now();
await Promise.all([1, 2].map((i) => runInTransaction(async () => { await prisma.user.create({ data: { email: `par-${i}@x` } }); await sleep(300); })));
out.parallelTxMs = Date.now() - t0;
out.finalUsers = (await rootPrismaClient.user.findMany({ orderBy: { id: 'asc' } })).map((u) => u.email);
await shutdownPrisma();
// 5. explicit initializePrisma with the adapter
let diag;
out.explicitInit = await initializePrisma({ datasourceUrl: 'file:./unused-by-adapter.db', onDiagnostic: (d) => { diag = `${d.code} | ${String(d.cause?.message ?? d.cause).split('\n')[0].slice(0, 120)}` } }).then(() => 'ok', (e) => e.code);
out.explicitDiag = diag;
await shutdownPrisma().catch(() => {});
console.log(JSON.stringify(out, null, 1));
