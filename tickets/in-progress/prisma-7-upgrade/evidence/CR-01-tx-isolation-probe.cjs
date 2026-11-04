// Probe: does a concurrent non-transactional write join an open interactive transaction?
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const repoDist = process.argv[2];
const repo = require(repoDist);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-tx-'));
  const db = path.join(dir, 'tx.db');
  await repo.initializePrisma({ datasourceUrl: `file:${db}` });
  const root = repo.rootPrismaClient;
  await root.$executeRawUnsafe('CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL);');
  await root.$executeRawUnsafe('CREATE UNIQUE INDEX "User_email_key" ON "User"("email");');

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
  console.log(JSON.stringify({ txResult, otherResult, rowsAfter: after.map((u) => u.email) }, null, 2));
  await repo.shutdownPrisma();
  fs.rmSync(dir, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
