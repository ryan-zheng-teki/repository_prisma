import type { ITXClientDenyList } from '@prisma/client/runtime/client';
import type { Prisma as DefaultPrisma, PrismaClient as DefaultPrismaClient } from '@prisma/client';

/** Applications using the prisma-client generator augment this interface. */
export interface PrismaClientRegistry {}

type GeneratedModule = {
  PrismaClient: abstract new (...args: any) => any;
  Prisma: { ModelName: Record<string, string> };
};
type Registered = PrismaClientRegistry extends { client: infer M extends GeneratedModule } ? M : never;
type IsRegistered = PrismaClientRegistry extends { client: GeneratedModule } ? true : false;

export type RegisteredPrismaClient = IsRegistered extends true ? InstanceType<Registered['PrismaClient']> : DefaultPrismaClient;
export type ModelName = IsRegistered extends true ? Registered['Prisma']['ModelName'][keyof Registered['Prisma']['ModelName']] : DefaultPrisma.ModelName;
export type ModelsObject = IsRegistered extends true ? Registered['Prisma']['ModelName'] : typeof DefaultPrisma.ModelName;
export type ContainsStringFilter = IsRegistered extends true ? { contains: string; mode?: 'insensitive' } : DefaultPrisma.StringFilter;
export type TransactionClient = Omit<RegisteredPrismaClient, ITXClientDenyList>;
type TransactionMethod = RegisteredPrismaClient extends { $transaction: infer T } ? T : never;
type InteractiveOptions = TransactionMethod extends (fn: any, options?: infer O) => any ? O : never;
export type TransactionIsolationLevel = NonNullable<NonNullable<InteractiveOptions> extends { isolationLevel?: infer L } ? L : never>;

type MissingTypeDeclaration = {
  "Also add: declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }": never;
};
/** registerPrismaClient's argument: the module declared in PrismaClientRegistry. */
export type RegisteredClientModule = PrismaClientRegistry extends { client: infer M extends GeneratedModule } ? M : MissingTypeDeclaration;
