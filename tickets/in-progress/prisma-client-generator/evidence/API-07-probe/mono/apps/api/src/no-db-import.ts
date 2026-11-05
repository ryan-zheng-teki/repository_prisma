// Control: the same checks in a program that never imports @acme/db. Without the declaration in
// the program, the library falls back to @prisma/client types (any without prisma-client-js
// output), so every @ts-expect-error below is unused and tsc must fail with TS2578.
import { BaseRepository, prisma, runInTransaction } from 'repository_prisma';

class UserRepository extends BaseRepository<'User'> {}

export const typed = async (): Promise<void> => {
  // @ts-expect-error unknown field
  await new UserRepository().create({ data: { nope: 1 } });
  // @ts-expect-error unknown delegate
  void prisma.comment;
  // @ts-expect-error invalid isolation level
  await runInTransaction(async () => undefined, { isolationLevel: 'Bogus' });
};
