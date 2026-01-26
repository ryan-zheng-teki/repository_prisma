import { rootPrismaClient } from './prisma-manager';
import { runInTransactionContext, getTransactionClient } from './context';

export function Transactional() {
  return function <T extends (...args: any[]) => Promise<any>>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) {
      throw new Error('Transactional decorator can only be applied to methods.');
    }

    const wrapped = (async function (this: unknown, ...args: any[]) {
      // 1. Check if we are already in a transaction
      if (getTransactionClient()) {
        // Already in a transaction, just run the method
        return originalMethod.apply(this, args);
      }

      // 2. Not in a transaction, start one
      return rootPrismaClient.$transaction(async (tx) => {
        return runInTransactionContext(tx, async () => {
          return originalMethod.apply(this, args);
        });
      });
    }) as T;

    descriptor.value = wrapped;
    return descriptor;
  };
}
