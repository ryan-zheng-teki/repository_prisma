// The app's entry: README step 3 (import the db package first), then every library feature.
import '@acme/db';
import { Prisma } from '@acme/db';
import {
  BaseRepository,
  Models,
  Transactional,
  getTransactionClient,
  initializePrisma,
  prisma,
  rootPrismaClient,
  runInTransaction,
  shutdownPrisma,
} from 'repository_prisma';

class UserRepository extends BaseRepository.forModel(Prisma.ModelName.User) {}
class PostRepository extends BaseRepository<'Post'> {}
const users = new UserRepository();

class SignupService {
  @Transactional()
  async signupThenFail(email: string): Promise<void> {
    await users.create({ data: { email } });
    throw new Error('decorated rollback');
  }
}

await initializePrisma({ datasourceUrl: process.env.APP_DATABASE_URL!, enableWAL: true });
const mode = await rootPrismaClient.$queryRawUnsafe<Record<string, string>[]>('PRAGMA journal_mode;');
const user = await users.create({ data: { email: 'ada@mono.test' } });
await runInTransaction(
  async () => {
    if (getTransactionClient() === undefined) throw new Error('no transaction client');
    await new PostRepository().create({ data: { title: 'Hello', authorId: user.id } });
  },
  { isolationLevel: 'Serializable' }
);
await runInTransaction(async () => {
  await users.create({ data: { email: 'rolled-back@mono.test' } });
  throw new Error('rollback');
}).catch(() => undefined);
await new SignupService().signupThenFail('decorated@mono.test').catch(() => undefined);
const rows = await prisma.user.findMany({ include: { posts: true }, orderBy: { id: 'asc' } });
console.log('api-main', JSON.stringify({ journal: Object.values(mode[0])[0], rows, models: Models.User }));
await shutdownPrisma();
