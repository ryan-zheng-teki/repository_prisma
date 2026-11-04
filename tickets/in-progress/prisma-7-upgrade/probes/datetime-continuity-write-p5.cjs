const { PrismaClient } = require('@prisma/client');
(async () => { const c = new PrismaClient(); await c.event.create({ data: { label: 'p5', at: new Date('2026-01-02T03:04:05.678Z') } });
console.log(await c.$queryRawUnsafe('SELECT id, label, typeof(at) t, at, typeof(createdAt) tc FROM Event')); console.log(await c.event.findMany()); await c.$disconnect(); })();
