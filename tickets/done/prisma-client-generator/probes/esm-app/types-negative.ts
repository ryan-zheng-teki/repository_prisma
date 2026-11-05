import { BaseRepository, prisma, runInTransaction } from 'repository_prisma';
import './main.ts';
class UserRepository extends BaseRepository<'User'> {}
// @ts-expect-error unknown field must be rejected
await new UserRepository().create({ data: { nope: 1 } });
// @ts-expect-error unknown model must be rejected
class Nope extends BaseRepository<'Nope'> {}
// @ts-expect-error unknown delegate
prisma.post;
// @ts-expect-error bad isolation level
await runInTransaction(async () => {}, { isolationLevel: 'Bogus' });
