// AC-008: prisma-client-js public types must stay identical to 2.0.0 (cases T1..T15, design-spec "AC-008 Type-Equality Inventory").
// Compiled by `npm run typecheck`; each line fails to compile if its export's type changes.
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  BaseRepository, Transactional, runInTransaction, getTransactionClient, getPrismaClient, prisma,
  rootPrismaClient, defineRepository, Models, buildContainsFilter,
  type RunInTransactionOptions, type Delegate, type ModelName,
} from '../index';
type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
export const t1: Eq<ReturnType<typeof buildContainsFilter>, Prisma.StringFilter> = true;
export const t2: Eq<typeof Models, typeof Prisma.ModelName> = true;
export const t3: Eq<ModelName, Prisma.ModelName> = true;
export const t4: Eq<Delegate<'User'>, PrismaClient['user']> = true;
export const t5: Eq<typeof prisma, PrismaClient> = true;
export const t6: Eq<typeof rootPrismaClient, PrismaClient> = true;
export const t7: Eq<ReturnType<typeof getPrismaClient>, PrismaClient | Prisma.TransactionClient> = true;
export const t8: Eq<ReturnType<typeof getTransactionClient>, Prisma.TransactionClient | undefined> = true;
export const t9: Eq<RunInTransactionOptions, { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }> = true;
export const t10: Eq<Parameters<typeof defineRepository>[0], Prisma.ModelName> = true;
export const t11: Eq<Parameters<typeof BaseRepository.forModel>[0], Prisma.ModelName> = true;
export const t12: Eq<BaseRepository<'User'>['delegate'], PrismaClient['user']> = true;
export const t13: Eq<Parameters<BaseRepository<'User'>['create']>[0], Parameters<PrismaClient['user']['create']>[0]> = true;
export const t14: Eq<typeof runInTransaction, <T>(callback: () => Promise<T>, options?: RunInTransactionOptions) => Promise<T>> = true;
export const t15: Eq<typeof Transactional, () => <T extends (...args: any[]) => Promise<any>>(_target: any, _propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>> = true;
