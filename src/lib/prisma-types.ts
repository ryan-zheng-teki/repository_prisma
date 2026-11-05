import type {
  Prisma as DefaultPrisma,
  PrismaClient as DefaultPrismaClient,
} from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/client';

/**
 * Type registry for applications on Prisma's `prisma-client` generator. Declare the generated
 * client module once, and the library's public types follow it:
 *
 * ```ts
 * import * as generated from './generated/prisma/client';
 * declare module 'repository_prisma' {
 *   interface PrismaClientRegistry { client: typeof generated }
 * }
 * ```
 *
 * Without a declaration, every type is the `@prisma/client` (prisma-client-js) type.
 */
export interface PrismaClientRegistry {}

/** The type of a generated client module, as the registry receives it (`typeof generated`). */
type GeneratedModule = {
  PrismaClient: abstract new (...args: any) => any;
  Prisma: { ModelName: Record<string, string> };
};

type RegisteredModule = PrismaClientRegistry extends { client: infer M extends GeneratedModule }
  ? M
  : never;

/**
 * `registerPrismaClient`'s parameter when no generated module is declared: its one property name
 * is the declaration to add, so the call fails to compile with the fix in the message. It must
 * not reference `@prisma/client` types, which are `any` when no prisma-client-js output exists.
 */
type MissingTypeDeclaration = {
  "repository_prisma: declare the generated client module: declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }": never;
};

/** `registerPrismaClient`'s argument: exactly the module declared in `PrismaClientRegistry`. */
export type RegisteredClientModule = PrismaClientRegistry extends {
  client: infer M extends GeneratedModule;
}
  ? M
  : MissingTypeDeclaration;

type IsRegistered = [RegisteredModule] extends [never] ? false : true;

/** The application's Prisma client type. */
export type RegisteredPrismaClient = IsRegistered extends true
  ? InstanceType<RegisteredModule['PrismaClient']>
  : DefaultPrismaClient;

/** The runtime model-name object (`Prisma.ModelName`). */
export type ModelsObject = IsRegistered extends true
  ? RegisteredModule['Prisma']['ModelName']
  : typeof DefaultPrisma.ModelName;

/** A model name, such as `'User'`. */
export type ModelName = IsRegistered extends true
  ? RegisteredModule['Prisma']['ModelName'][keyof RegisteredModule['Prisma']['ModelName']]
  : DefaultPrisma.ModelName;

/** The client an interactive transaction callback receives. */
export type TransactionClient = Omit<RegisteredPrismaClient, ITXClientDenyList>;

// The interactive `$transaction(fn, options)` overload is the last one, which `infer` selects.
type TransactionMethod = RegisteredPrismaClient extends { $transaction: infer T } ? T : never;
type InteractiveTransactionOptions = TransactionMethod extends (
  callback: any,
  options?: infer O
) => any
  ? O
  : never;

/** The isolation levels the application's client accepts for an interactive transaction. */
export type TransactionIsolationLevel = NonNullable<
  NonNullable<InteractiveTransactionOptions> extends { isolationLevel?: infer L } ? L : never
>;

/**
 * The string filter `buildContainsFilter` returns. A registered generated module exposes no
 * type-only namespace members such as `StringFilter`, so registered apps get this library-owned
 * shape, which is assignable to a string field's `where` filter.
 */
export type ContainsStringFilter = IsRegistered extends true
  ? { contains: string; mode?: 'insensitive' }
  : DefaultPrisma.StringFilter;
