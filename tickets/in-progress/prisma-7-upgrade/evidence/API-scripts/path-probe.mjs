// AC-004 through the packed package: the opened file is the resolved path; the query never names a file.
// Usage (cwd = an empty work dir): node <consumer>/path-probe.mjs
import fs from 'node:fs';
import path from 'node:path';
import { initializePrisma, shutdownPrisma, rootPrismaClient } from 'repository_prisma';
const cwd = process.cwd();
fs.mkdirSync('data dir', { recursive: true });
fs.mkdirSync(path.join(cwd, 'abs space dir'), { recursive: true });
fs.writeFileSync('physical.db', '');
fs.symlinkSync(path.join(cwd, 'physical.db'), 'alias.db');
const cases = [
  { name: 'relative with spaces + query', url: 'file:./data dir/app one.db?connection_limit=1', expected: 'data dir/app one.db' },
  { name: 'literal %20 + query', url: 'file:./data dir/literal%20name.db?socket_timeout=5&connection_limit=1', expected: 'data dir/literal%20name.db', mustNotExist: 'data dir/literal name.db' },
  { name: 'symlink alias + query', url: 'file:./alias.db?connection_limit=1', expected: 'physical.db' },
  { name: 'absolute with spaces + query + WAL', url: `file:${path.join(cwd, 'abs space dir', 'abs db.db')}?connection_limit=1`, expected: 'abs space dir/abs db.db', wal: true },
];
let ok = true;
for (const c of cases) {
  await initializePrisma({ datasourceUrl: c.url, enableWAL: Boolean(c.wal) });
  const rows = await rootPrismaClient.$queryRawUnsafe('PRAGMA database_list;');
  const main = rows.find((r) => r.name === 'main').file;
  await rootPrismaClient.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS probe (v INTEGER)');
  await rootPrismaClient.$executeRawUnsafe('INSERT INTO probe VALUES (1)');
  await shutdownPrisma();
  const expectedReal = fs.realpathSync(path.join(cwd, c.expected));
  const pass = fs.realpathSync(main) === expectedReal && (!c.mustNotExist || !fs.existsSync(c.mustNotExist));
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${c.name}: url=${JSON.stringify(c.url.replace(cwd, '<cwd>'))} main=${JSON.stringify(main.replace(fs.realpathSync(cwd), '<cwd>').replace(cwd, '<cwd>'))}${c.mustNotExist ? ` decodedNameExists=${fs.existsSync(c.mustNotExist)}` : ''}`);
}
const withQuery = fs.readdirSync(cwd, { recursive: true }).map(String).filter((e) => e.includes('?'));
console.log('files whose name contains "?":', JSON.stringify(withQuery));
console.log('tree:', JSON.stringify(fs.readdirSync(cwd, { recursive: true }).map(String).sort()));
ok &&= withQuery.length === 0;
console.log(JSON.stringify({ result: ok ? 'pass' : 'fail' }));
process.exitCode = ok ? 0 : 1;
