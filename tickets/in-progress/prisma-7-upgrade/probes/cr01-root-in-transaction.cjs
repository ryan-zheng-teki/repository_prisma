const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const repo = require(process.argv[2]);
const keep = setInterval(() => {}, 1000);
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-dead-'));
  await repo.initializePrisma({ datasourceUrl: `file:${path.join(dir, 'e.db')}` });
  const root = repo.rootPrismaClient;
  await root.$executeRawUnsafe('CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL);');
  const t1 = Date.now();
  const watchdog = setTimeout(() => { console.log('still pending after 8000 ms'); process.exit(0); }, 8000);
  const r3 = await repo.runInTransaction(async () => { await root.user.count(); return 'done'; }, { timeout: 1500 })
    .then(v => v, e => 'rejected: ' + String(e.message).split('\n').filter(Boolean).slice(-1)[0]);
  clearTimeout(watchdog);
  console.log('root inside tx:', r3, Date.now() - t1, 'ms');
  console.log('after: root works?', await root.user.count());
  clearInterval(keep); await repo.shutdownPrisma();
})();
