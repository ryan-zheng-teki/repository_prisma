import { rootPrismaClient, PrismaInitializationError, shutdownPrisma } from 'repository_prisma';
process.env.DATABASE_URL = 'file:./z.db';
try { await rootPrismaClient.user.count(); console.log('lazy ok'); }
catch (e) { console.log(JSON.stringify({ cls: e.constructor.name, instanceOfInitError: e instanceof PrismaInitializationError, code: e.code, marker: e.probeMarker === true, msg: String(e.message).split('\n').filter(Boolean).slice(-1)[0] })); }
await shutdownPrisma().catch(() => {});
