import { BaseRepository, prisma } from 'repository_prisma';
class UserRepository extends BaseRepository<'User'> {}
const repo = new UserRepository();
const u = await repo.create({ data: { email: 'a' } });
const n: number = u.id;
const bogus = await repo.create({ data: { nope: 1 } });
const p = prisma.user;
