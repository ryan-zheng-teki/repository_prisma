// The packed library on Prisma 7.10.1 opens the file Prisma 5.22 created and wrote.
import { initializePrisma, shutdownPrisma, rootPrismaClient, prisma, BaseRepository, Models } from 'repository_prisma';
const db = process.argv[2];
class EventRepository extends BaseRepository.forModel(Models.Event) {}
const events = new EventRepository();
const checks = {};
const check = (name, ok, detail) => { checks[name] = ok ? 'pass' : 'FAIL'; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`); };
await initializePrisma({ datasourceUrl: `file:${db}` });
const before = await events.findMany({ orderBy: { id: 'asc' }, select: { label: true, at: true } });
const expected = { p5: '2026-01-02T03:04:05.678Z', 'p5-2025-06': '2025-06-01T12:00:00.000Z', 'p5-2026-03': '2026-03-15T08:30:00.250Z' };
check('reads Prisma-5 rows as the same instants', before.length === 3 && before.every((r) => r.at.toISOString() === expected[r.label]), before);
const eq = await events.findMany({ where: { at: new Date('2026-01-02T03:04:05.678Z') }, select: { label: true } });
check('equality filter matches a Prisma-5 row', eq.length === 1 && eq[0].label === 'p5', eq);
await prisma.event.create({ data: { label: 'p7-lib', at: new Date('2026-06-01T00:00:00.000Z') } });
const raw = await rootPrismaClient.$queryRawUnsafe('SELECT label, typeof(at) AS t, typeof(createdAt) AS tc FROM Event ORDER BY id');
check('all rows stored as integer (at and createdAt)', raw.every((r) => r.t === 'integer' && r.tc === 'integer'), raw);
const gt = await events.findMany({ where: { at: { gt: new Date('2025-12-31T00:00:00.000Z') } }, orderBy: { at: 'asc' }, select: { label: true } });
check('gt returns old and new rows', JSON.stringify(gt.map((r) => r.label)) === JSON.stringify(['p5', 'p5-2026-03', 'p7-lib']), gt);
const lt = await events.findMany({ where: { at: { lt: new Date('2026-04-01T00:00:00.000Z') } }, orderBy: { at: 'asc' }, select: { label: true } });
check('lt returns the expected rows', JSON.stringify(lt.map((r) => r.label)) === JSON.stringify(['p5-2025-06', 'p5', 'p5-2026-03']), lt);
const ordered = await events.findMany({ orderBy: { at: 'desc' }, select: { label: true } });
check('orderBy across old and new rows', JSON.stringify(ordered.map((r) => r.label)) === JSON.stringify(['p7-lib', 'p5-2026-03', 'p5', 'p5-2025-06']), ordered);
const createdRange = await events.count({ where: { createdAt: { gt: new Date('2020-01-01T00:00:00.000Z'), lt: new Date(Date.now() + 60_000) } } });
check('@default(now()) createdAt range covers old and new rows', createdRange === 4, createdRange);
await shutdownPrisma();
const failed = Object.values(checks).filter((v) => v !== 'pass').length;
console.log(JSON.stringify({ result: failed === 0 ? 'pass' : 'fail', checks }));
process.exitCode = failed === 0 ? 0 : 1;
