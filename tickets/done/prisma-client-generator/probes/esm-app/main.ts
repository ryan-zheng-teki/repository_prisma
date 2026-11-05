import { PrismaClient, Prisma } from '../src/generated/prisma/client.ts';
import {
  registerPrismaClient, initializePrisma, shutdownPrisma, BaseRepository, runInTransaction,
  prisma, rootPrismaClient, Models, Transactional,
} from 'repository_prisma';

declare module 'repository_prisma' {
  interface PrismaClientRegistry {
    client: PrismaClient;
    modelName: Prisma.ModelName;
  }
}

registerPrismaClient({ PrismaClient, Prisma });

class UserRepository extends BaseRepository<'User'> {}
class UserRepo2 extends BaseRepository.forModel(Prisma.ModelName.User) {}
const users = new UserRepository();

class Service {
  @Transactional()
  async failInside(email: string) {
    await users.create({ data: { email } });
    throw new Error('rollback');
  }
}

const url = `file:${process.cwd()}/probe-app.db`;
await initializePrisma({ datasourceUrl: url, enableWAL: true });
await rootPrismaClient.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL UNIQUE)');
await prisma.user.deleteMany();
const created = await users.create({ data: { email: 'a@x' } });
const id: number = created.id;
await runInTransaction(async () => {
  await prisma.user.create({ data: { email: 'b@x' } });
}, { isolationLevel: 'Serializable' });
try {
  await runInTransaction(async () => {
    await users.create({ data: { email: 'c@x' } });
    throw new Error('rollback');
  });
} catch {}
try { await new Service().failInside('d@x'); } catch {}
const all = await new UserRepo2().findMany({ orderBy: { id: 'asc' } });
console.log(JSON.stringify({ id, emails: all.map((u) => u.email), modelsUser: (() => { try { return Models.User; } catch (e) { return 'Models threw: ' + (e as Error).message; } })() }));
await shutdownPrisma();
