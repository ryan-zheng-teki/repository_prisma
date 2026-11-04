const { PrismaClient, Prisma } = require('@prisma/client');
console.log('ModelName', Prisma.ModelName, 'Iso', Prisma.TransactionIsolationLevel);
for (const opts of [{ datasourceUrl: process.env.DATABASE_URL }, {}]) {
  try { const c = new PrismaClient(opts); console.log('constructed', Object.keys(opts)); c.$connect().then(()=>console.log('connected')).catch(e=>console.log('connect err', e.message.slice(0,300))); }
  catch (e) { console.log('ctor err', Object.keys(opts), e.constructor.name, e.message.slice(0,400)); }
}
