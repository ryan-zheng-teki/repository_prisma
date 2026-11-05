// Registered types reach the app from the workspace package's declaration (AC-006, AC-013).
import '@acme/db';
import { BaseRepository, prisma, registerPrismaClient, runInTransaction } from 'repository_prisma';

class UserRepository extends BaseRepository<'User'> {}

export const typed = async (): Promise<void> => {
  const id: number = (await prisma.user.create({ data: { email: 'typed@mono.test' } })).id;
  void id;
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
