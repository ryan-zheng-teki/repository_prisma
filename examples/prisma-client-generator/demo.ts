// An app on the `prisma-client` generator. `npm run typecheck` compiles it in the registered
// program (tsconfig.prisma-client-generator.json); the @ts-expect-error lines must stay errors.
import './db';
import { Prisma } from '../../generated/prisma-client/client';
import {
  BaseRepository,
  Models,
  Transactional,
  buildContainsFilter,
  initializePrisma,
  prisma,
  registerPrismaClient,
  runInTransaction,
} from 'repository_prisma';

// Name models with the app's own Prisma.ModelName (or BaseRepository<'User'>): safe in any load order.
class UserRepository extends BaseRepository.forModel(Prisma.ModelName.User) {}
class PostRepository extends BaseRepository<'Post'> {}

class UserService {
  private readonly users = new UserRepository();
  private readonly posts = new PostRepository();

  @Transactional()
  async createUserWithPost(email: string, title: string): Promise<number> {
    const user = await this.users.create({ data: { email } });
    await this.posts.create({ data: { title, authorId: user.id } });
    return user.id;
  }
}

export const main = async (): Promise<void> => {
  await initializePrisma({ datasourceUrl: 'file:./demo.db', enableWAL: true });

  const id: number = await new UserService().createUserWithPost('ada@example.test', 'Hello');
  await runInTransaction(
    async () => {
      await prisma.user.update({ where: { id }, data: { email: 'ada@example.org' } });
    },
    { isolationLevel: 'Serializable' }
  );
  const found = await prisma.user.findMany({
    where: { email: buildContainsFilter('ada', { caseInsensitive: true }) },
  });
  const userModel: 'User' = Models.User;
  console.log(found.length, userModel);
};

// The registered types are enforced:
export const rejected = async (): Promise<void> => {
  // @ts-expect-error unknown field
  await new UserRepository().create({ data: { nope: 1 } });
  // @ts-expect-error unknown delegate
  void prisma.comment;
  // @ts-expect-error invalid isolation level
  await runInTransaction(async () => undefined, { isolationLevel: 'Bogus' });
  // @ts-expect-error a different object than the declared module
  registerPrismaClient({ PrismaClient: class {}, Prisma: { ModelName: {} } });
};

// @ts-expect-error unknown model
export class CommentRepository extends BaseRepository<'Comment'> {}
