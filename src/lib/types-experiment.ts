import { PrismaClient, Prisma } from '@prisma/client';

// Goal: class UserRepository extends BaseRepository<'User'> {}

// 1. Define a utility to extract Delegate from Model Name
type ModelName = Prisma.ModelName; 

// This map extracts the Delegate type relative to the Model Name string
// PrismaClient has all models as properties, e.g. client.user, client.post
type Delegate<T extends ModelName> = PrismaClient[Uncapitalize<T>];

// We can also extract the Create/Update types if needed, but the Delegate itself 
// often has the best "source of truth" methods.

abstract class TestBaseRepository<M extends ModelName> {
  constructor(protected modelName: Uncapitalize<M>) {}

  // The magic getter
  protected get delegate(): Delegate<M> {
     return {} as any; // implementation ignored for types
  }

  // Type-safe create!
  // We extract the 'create' method params from the Delegate
  async create(
    args: Parameters<Delegate<M>['create']>[0]
  ): Promise<ReturnType<Delegate<M>['create']>> {
     return {} as any;
  }
}

// Usage Test
class TestUserRepo extends TestBaseRepository<'User'> {
  constructor() { super('user'); }
}

const repo = new TestUserRepo();
// repo.create({ data: { email: 'test' } }); // Should Type Check
