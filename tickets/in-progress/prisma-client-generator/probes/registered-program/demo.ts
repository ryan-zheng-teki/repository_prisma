import './db';
import { prisma, BaseRepository } from 'repository_prisma';
class UserRepository extends BaseRepository<'User'> {}
export const run = async () => {
  const u = await new UserRepository().create({ data: { email: 'x' } });
  const id: number = u.id;
  // @ts-expect-error unknown field
  await prisma.user.create({ data: { nope: 1 } });
  // @ts-expect-error unknown model
  class Nope extends BaseRepository<'Nope'> {}
};
import { registerPrismaClient, buildContainsFilter, Models } from 'repository_prisma';
// @ts-expect-error a different object than the declared module
registerPrismaClient({ PrismaClient: class {}, Prisma: { ModelName: {} } });
export const filtered = () => prisma.user.findMany({ where: { email: buildContainsFilter('a', { caseInsensitive: true }) } });
export const userModel: 'User' = Models.User;
