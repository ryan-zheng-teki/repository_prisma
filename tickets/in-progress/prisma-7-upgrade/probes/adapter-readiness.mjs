import pkg from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const { PrismaClient, Prisma } = pkg;
const run = async (label, url, extra = {}) => {
  try {
    const events = [];
    const c = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }), log: [{ emit: 'event', level: 'query' }, 'warn', 'error'], ...extra });
    c.$on('query', (e) => events.push(e.query));
    await c.$connect();
    const dbl = await c.$queryRawUnsafe('PRAGMA database_list;');
    await c.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    const jm = await c.$queryRawUnsafe('PRAGMA journal_mode;');
    const n = await c.$transaction(async (tx) => tx.user.count(), { maxWait: 2000, timeout: 5000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    console.log(label, JSON.stringify({ dbl, jm, n, queryEvents: events.length }, (k, v) => typeof v === "bigint" ? `${v}n` : v));
    await c.$disconnect();
  } catch (e) { console.log(label, 'ERR', e.constructor.name, String(e.message).slice(0, 300)); }
};
await run('abs', 'file:/tmp/prisma7-probe/test.db');
await run('abs-noscheme', '/tmp/prisma7-probe/test.db');
await run('abs-query', 'file:/tmp/prisma7-probe/test.db?connection_limit=1');
await run('rel', 'file:./test.db');
await run('memory', ':memory:');
await run('file-memory', 'file::memory:');
