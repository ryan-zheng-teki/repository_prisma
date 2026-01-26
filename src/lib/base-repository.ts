import { Prisma, PrismaClient } from '@prisma/client';
import { getPrismaClient } from './prisma-manager';

// Type helper: Extracts the Delegate type from the Model Name
// e.g. Delegate<'User'> -> PrismaClient['user']
export type Delegate<T extends Prisma.ModelName> = PrismaClient[Uncapitalize<T>];

export abstract class BaseRepository<M extends Prisma.ModelName> {
  // OPTIONAL: Define it if class name doesn't match convention
  protected modelName?: Uncapitalize<M>;

  constructor(modelName?: Uncapitalize<M>) {
    this.modelName = modelName;
  }

  private resolveModelName(): Uncapitalize<M> {
    if (this.modelName) {
      return this.modelName;
    }

    const className = this.constructor.name;
    const inferred = className.endsWith('Repository')
      ? className.slice(0, -'Repository'.length)
      : className;
    const camelCased = inferred.charAt(0).toLowerCase() + inferred.slice(1);

    return camelCased as Uncapitalize<M>;
  }

  protected get delegate(): Delegate<M> {
    const client = getPrismaClient() as PrismaClient;
    
    const modelName = this.resolveModelName();
    const delegate = client[modelName];

    if (!delegate) {
      throw new Error(
        `Unknown Prisma model '${modelName}' for ${this.constructor.name}. ` +
          'Set modelName explicitly on the repository.'
      );
    }

    return delegate as Delegate<M>;
  }

  // --- Standard CRUD Methods ---

  create(
    args: Parameters<Delegate<M>['create']>[0]
  ): ReturnType<Delegate<M>['create']> {
    // TS cannot narrow delegate call signatures for generic model names.
    return (this.delegate as any).create(args);
  }

  findUnique(
    args: Parameters<Delegate<M>['findUnique']>[0]
  ): ReturnType<Delegate<M>['findUnique']> {
    return (this.delegate as any).findUnique(args);
  }

  findMany(
    args?: Parameters<Delegate<M>['findMany']>[0]
  ): ReturnType<Delegate<M>['findMany']> {
    return (this.delegate as any).findMany(args);
  }

  update(
    args: Parameters<Delegate<M>['update']>[0]
  ): ReturnType<Delegate<M>['update']> {
    return (this.delegate as any).update(args);
  }

  delete(
    args: Parameters<Delegate<M>['delete']>[0]
  ): ReturnType<Delegate<M>['delete']> {
    return (this.delegate as any).delete(args);
  }
}
