import * as repo from 'repository_prisma';
console.log('import ok');
try { await repo.initializePrisma({ datasourceUrl: 'file:./x.db' }); } catch (e: any) { console.log('init:', e?.name, e?.code, e?.message); }
await repo.shutdownPrisma();
try { await repo.prisma.user.findMany(); } catch (e: any) { console.log('lazy:', e?.name, e?.code, e?.message); }
try { console.log(repo.Models.User); } catch (e: any) { console.log('Models:', e?.constructor?.name, e?.code, e?.message); }
