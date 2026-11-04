// Prisma 5.22 reads the file back after the library on Prisma 7 wrote to it.
const { PrismaClient } = require('@prisma/client');
(async () => {
  const c = new PrismaClient();
  const all = await c.event.findMany({ orderBy: { at: 'asc' }, select: { label: true, at: true } });
  const gt = await c.event.findMany({ where: { at: { gt: new Date('2025-12-31T00:00:00.000Z') } }, orderBy: { at: 'asc' }, select: { label: true } });
  console.log(JSON.stringify({ prisma5ReadsAll: all, prisma5GtAfter2025: gt.map((r) => r.label) }));
  await c.$disconnect();
})();
