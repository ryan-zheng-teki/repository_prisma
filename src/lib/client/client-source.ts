import { createRequire } from 'node:module';
import { InitializationStageFailure } from './initialization-error';

/**
 * A Prisma client module: what a Prisma generator produces. `@prisma/client` is the
 * prisma-client-js one; the generated `client` module is the prisma-client one.
 */
export type PrismaClientModule = {
  PrismaClient: new (options: any) => any;
  Prisma: { ModelName: Record<string, string> };
};

type PrismaClientSourceState =
  | { kind: 'default-package' }
  | { kind: 'registered'; module: PrismaClientModule };

type DefaultPackageLoader = () => PrismaClientModule;

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

/** Rejects anything that is not a Prisma client module with a `TypeError`. */
export function assertPrismaClientModule(value: unknown): asserts value is PrismaClientModule {
  if (
    !isObjectLike(value) ||
    typeof value.PrismaClient !== 'function' ||
    !isObjectLike(value.Prisma) ||
    !isObjectLike(value.Prisma.ModelName)
  ) {
    throw new TypeError(
      'registerPrismaClient() expects the generated Prisma client module, ' +
        'with its PrismaClient class and Prisma namespace.'
    );
  }
}

// Loaded on first need, never at import: a prisma-client app has no prisma-client-js output.
const requireDefaultPackage: DefaultPackageLoader = () =>
  createRequire(import.meta.url)('@prisma/client') as PrismaClientModule;

/** Where the library takes its Prisma client module from. Owned by the client lifecycle. */
export class PrismaClientSource {
  private state: PrismaClientSourceState = { kind: 'default-package' };

  constructor(private readonly loadDefaultPackage: DefaultPackageLoader = requireDefaultPackage) {}

  /** The module in use; a default package that cannot load is `PRISMA_CLIENT_UNAVAILABLE`. */
  current(): PrismaClientModule {
    switch (this.state.kind) {
      case 'registered':
        return this.state.module;
      case 'default-package':
        try {
          return this.loadDefaultPackage();
        } catch (error) {
          throw new InitializationStageFailure('PRISMA_CLIENT_UNAVAILABLE', error);
        }
    }
  }

  /** Whether `module` is the registered module (same `PrismaClient` and `Prisma`). */
  holds(module: PrismaClientModule): boolean {
    return (
      this.state.kind === 'registered' &&
      this.state.module.PrismaClient === module.PrismaClient &&
      this.state.module.Prisma === module.Prisma
    );
  }

  register(module: PrismaClientModule): void {
    this.state = { kind: 'registered', module };
  }
}
