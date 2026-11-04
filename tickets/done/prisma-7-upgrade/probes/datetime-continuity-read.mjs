import pkg from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const { PrismaClient } = pkg;
for (const fmt of ['iso8601', 'unixepoch-ms']) {
  const c = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:/tmp/dt-continuity.db' }, { timestampFormat: fmt }) });
  const before = await c.event.findMany({ where: { label: 'p5' } });
  await c.event.create({ data: { label: 'p7-' + fmt, at: new Date('2026-06-01T00:00:00.000Z') } });
  const raw = await c.$queryRawUnsafe('SELECT label, typeof(at) t, typeof(createdAt) tc FROM Event');
  const ranged = await c.event.findMany({ where: { at: { gt: new Date('2025-01-01T00:00:00.000Z') } }, select: { label: true } });
  console.log(fmt, JSON.stringify({ readP5: before.map(r => r.at), raw, rangedGt2025: ranged.map(r => r.label) }));
  await c.$disconnect();
}
