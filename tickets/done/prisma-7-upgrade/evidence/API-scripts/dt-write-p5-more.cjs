// Extra rows written by Prisma 5.22 (in addition to probes/datetime-continuity-write-p5.cjs).
const { PrismaClient } = require('@prisma/client');
(async () => {
  const c = new PrismaClient();
  for (const [label, at] of [['p5-2025-06', '2025-06-01T12:00:00.000Z'], ['p5-2026-03', '2026-03-15T08:30:00.250Z']]) {
    await c.event.create({ data: { label, at: new Date(at) } });
  }
  console.log(await c.$queryRawUnsafe('SELECT id, label, typeof(at) t, at, typeof(createdAt) tc FROM Event ORDER BY id'));
  await c.$disconnect();
})();
