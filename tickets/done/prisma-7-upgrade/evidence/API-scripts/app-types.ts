// README-style consumer code, type-checked against the packed package's declarations.
import {
  BaseRepository,
  Models,
  Transactional,
  initializePrisma,
  shutdownPrisma,
  runInTransaction,
  prisma,
  rootPrismaClient,
  PrismaInitializationError,
  type PrismaInitializationErrorCode,
  type RunInTransactionOptions,
} from 'repository_prisma';

class UserRepository extends BaseRepository.forModel(Models.User) {}
class PostRepository extends BaseRepository.forModel(Models.Post) {}

class UserService {
  private userRepo = new UserRepository();
  private postRepo = new PostRepository();

  @Transactional()
  async createUserAndPost(email: string, title: string) {
    const user = await this.userRepo.create({ data: { email } });
    await this.postRepo.create({ data: { title, authorId: user.id } });
    return user;
  }
}

export const run = async (): Promise<void> => {
  await initializePrisma({ datasourceUrl: 'file:./app.db', enableWAL: true });
  const options: RunInTransactionOptions = { maxWait: 10_000, timeout: 10_000 };
  await runInTransaction(async () => {
    await prisma.user.create({ data: { email: 'safe@example.com' } });
  }, options);
  const user = await new UserService().createUserAndPost('typed@example.com', 'typed');
  const id: number = user.id;
  const count: number = await rootPrismaClient.user.count({ where: { id } });
  const when: Date = (await prisma.event.findFirstOrThrow()).occurredAt;
  void count; void when;
  try {
    await initializePrisma({ datasourceUrl: 'postgresql://x' });
  } catch (error) {
    if (error instanceof PrismaInitializationError) {
      const code: PrismaInitializationErrorCode = error.code;
      if (code === 'UNSUPPORTED_DATASOURCE_PROVIDER') console.error('SQLite only');
    }
  }
  await shutdownPrisma();
};
