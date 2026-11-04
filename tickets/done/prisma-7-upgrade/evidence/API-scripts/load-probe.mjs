// Concurrent-load probe (AC-013) through the packed ESM entry: plain request workers and transaction
// workers share the one root client, as request handlers in a server do.
// Usage: node load-probe.mjs <db-path> <wal:0|1> <duration-ms>
import { BaseRepository, Models, initializePrisma, shutdownPrisma, runInTransaction, prisma, rootPrismaClient } from 'repository_prisma';
const [db, walFlag, durationArg] = process.argv.slice(2);
const duration = Number(durationArg);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (n) => Math.floor(Math.random() * n);
class UserRepository extends BaseRepository.forModel(Models.User) {}
const users = new UserRepository();
await initializePrisma({ datasourceUrl: `file:${db}`, enableWAL: walFlag === '1' });
const [mode] = await rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;');

const t0 = performance.now();
const now = () => performance.now() - t0;
const plainLatencies = [];
const plainWrites = [];
const reads = []; // { end, seen }
const openUntil = new Map(); // tx id -> time just before its callback returns (still open)
const committed = new Set();
const rolledBack = new Set();
const txErrors = {};
const txWaits = [];
let plainSeq = 0;
let txSeq = 0;

const plainWorker = async (worker) => {
  while (now() < duration) {
    const start = now();
    const pick = rand(3);
    const rows = await (pick === 0 ? users.findMany({ select: { email: true } })
      : pick === 1 ? prisma.user.findMany({ select: { email: true } })
      : rootPrismaClient.user.findMany({ select: { email: true } }));
    reads.push({ end: now(), seen: rows.map((r) => r.email) });
    const email = `plain-${worker}-${plainSeq++}@x.test`;
    await (rand(2) ? users.create({ data: { email } }) : prisma.user.create({ data: { email } }));
    plainWrites.push(email);
    plainLatencies.push(now() - start);
    await sleep(rand(5));
  }
};
const txWorker = async () => {
  while (now() < duration) {
    const id = txSeq++;
    const rollback = id % 2 === 1;
    const requested = now();
    try {
      await runInTransaction(async () => {
        txWaits.push(now() - requested);
        await users.create({ data: { email: `tx-${id}-a@x.test` } });
        await sleep(rand(20));
        await prisma.user.create({ data: { email: `tx-${id}-b@x.test` } });
        openUntil.set(id, now());
        if (rollback) throw new Error('rollback-on-purpose');
      });
      committed.add(id);
    } catch (error) {
      if (error.message === 'rollback-on-purpose') rolledBack.add(id);
      else txErrors[error.code || error.message] = (txErrors[error.code || error.message] || 0) + 1;
    }
    await sleep(rand(30));
  }
};
await Promise.all([
  ...Array.from({ length: 8 }, (_, w) => plainWorker(w)),
  ...Array.from({ length: 4 }, () => txWorker()),
]);

const txIdOf = (email) => { const m = /^tx-(\d+)-/.exec(email); return m ? Number(m[1]) : null; };
let rolledBackSeen = 0;
let uncommittedSeen = 0;
for (const { end, seen } of reads) {
  for (const email of seen) {
    const id = txIdOf(email);
    if (id === null) continue;
    if (rolledBack.has(id)) rolledBackSeen++;
    else if (openUntil.has(id) && end < openUntil.get(id)) uncommittedSeen++;
  }
}
const finalRows = new Set((await rootPrismaClient.user.findMany({ select: { email: true } })).map((r) => r.email));
const lostPlainWrites = plainWrites.filter((e) => !finalRows.has(e)).length;
const lostCommitted = [...committed].filter((id) => !finalRows.has(`tx-${id}-a@x.test`) || !finalRows.has(`tx-${id}-b@x.test`)).length;
const keptRolledBack = [...rolledBack].filter((id) => finalRows.has(`tx-${id}-a@x.test`) || finalRows.has(`tx-${id}-b@x.test`)).length;
const expectedCount = plainWrites.length + committed.size * 2;
const sorted = [...plainLatencies].sort((a, b) => a - b);
const pct = (p) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]);
const summary = {
  journalMode: Object.values(mode)[0], durationMs: duration, plainRequests: plainWrites.length, reads: reads.length,
  transactions: { started: txSeq, committed: committed.size, rolledBack: rolledBack.size, otherErrors: txErrors, maxWaitToStartMs: Math.round(Math.max(...txWaits)) },
  plainLatencyMs: { p50: pct(0.5), p99: pct(0.99), max: Math.round(sorted[sorted.length - 1]) },
  violations: { rolledBackSeen, uncommittedSeen, lostPlainWrites, lostCommitted, keptRolledBack, rowCountMatches: finalRows.size === expectedCount },
};
const ok = rolledBackSeen === 0 && uncommittedSeen === 0 && lostPlainWrites === 0 && lostCommitted === 0 && keptRolledBack === 0 && finalRows.size === expectedCount && Object.keys(txErrors).length === 0;
console.log(JSON.stringify({ result: ok ? 'pass' : 'FAIL', ...summary }));
await shutdownPrisma();
process.exitCode = ok ? 0 : 1;
