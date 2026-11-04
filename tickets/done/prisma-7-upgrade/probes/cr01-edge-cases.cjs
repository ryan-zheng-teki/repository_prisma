const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const repo = require(process.argv[2]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-edge-'));
  await repo.initializePrisma({ datasourceUrl: `file:${path.join(dir, 'e.db')}` });
  const root = repo.rootPrismaClient;
  await root.$executeRawUnsafe('CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL);');
  await root.$executeRawUnsafe('CREATE UNIQUE INDEX "User_email_key" ON "User"("email");');
  await root.$executeRawUnsafe('CREATE TABLE "Post" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "authorId" INTEGER NOT NULL, FOREIGN KEY ("authorId") REFERENCES "User"("id"));');
  // 1. two concurrent transactions both commit
  const t0 = Date.now();
  const r1 = await Promise.allSettled([
    repo.runInTransaction(async () => { await repo.prisma.user.create({ data: { email: 'a@x' } }); await sleep(200); }),
    repo.runInTransaction(async () => { await repo.prisma.user.create({ data: { email: 'b@x' } }); await sleep(200); }),
  ]);
  console.log('concurrent tx', r1.map(r => r.status), Date.now() - t0, 'ms');
  // 2. nested write (Prisma-internal transaction) concurrent with an interactive tx
  const r2 = await Promise.allSettled([
    repo.runInTransaction(async () => { await repo.prisma.user.create({ data: { email: 'c@x' } }); await sleep(200); }),
    (async () => { await sleep(20); return repo.prisma.user.create({ data: { email: 'd@x', posts: { create: { title: 'p' } } } }); })(),
  ]);
  console.log('nested write vs tx', r2.map(r => r.status));
  // 3. anti-pattern: root client inside a tx callback
  const t1 = Date.now();
  const r3 = await repo.runInTransaction(async () => { await root.user.count(); return 'done'; }, { timeout: 1500 }).then(v => v, e => 'rejected: ' + String(e.message).split('\n').filter(Boolean).slice(-1)[0]);
  console.log('root inside tx:', r3, Date.now() - t1, 'ms');
  console.log('final users', (await root.user.findMany({ select: { email: true } })).map(u => u.email));
  await repo.shutdownPrisma();
})();
