// CR-01 probe shape (reviewer's evidence/CR-01-tx-isolation-probe.cjs) through the packed ESM entry.
// Usage: node cr01-esm.mjs <db-path>  (run from a consumer project that installed repository_prisma)
import * as repo from 'repository_prisma';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const db = process.argv[2];
await repo.initializePrisma({ datasourceUrl: `file:${db}` });
const root = repo.rootPrismaClient;
const txFlow = repo.runInTransaction(async () => {
  await repo.prisma.user.create({ data: { email: 'in-tx@example.test' } });
  await sleep(300);
  throw new Error('rollback-on-purpose');
}).catch((e) => `tx rejected: ${e.message}`);
const otherRequest = (async () => {
  await sleep(50);
  const seenUncommitted = await repo.prisma.user.findMany({ select: { email: true } });
  await repo.prisma.user.create({ data: { email: 'independent-request@example.test' } });
  return { seenUncommitted: seenUncommitted.map((u) => u.email) };
})().catch((e) => `other rejected: ${e.message}`);
const [txResult, otherResult] = await Promise.all([txFlow, otherRequest]);
const after = await root.user.findMany({ select: { email: true } });
console.log(JSON.stringify({ entry: import.meta.resolve('repository_prisma'), txResult, otherResult, rowsAfter: after.map((u) => u.email) }, null, 2));
await repo.shutdownPrisma();
