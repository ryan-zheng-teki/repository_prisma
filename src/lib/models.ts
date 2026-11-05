import type { ModelsObject } from './prisma-types';
import { getPrismaClientModule } from './client';
import {
  InitializationStageFailure,
  PrismaInitializationError,
} from './client/initialization-error';

// The current client module's model names, read on every access so that `Models` follows a
// registered client and loads nothing at import.
const currentModelNames = (): ModelsObject => {
  try {
    return getPrismaClientModule().Prisma.ModelName as ModelsObject;
  } catch (error) {
    if (error instanceof InitializationStageFailure) {
      throw new PrismaInitializationError(error.code);
    }
    throw error;
  }
};

const rejectWrite = (): boolean => false;

/** Runtime model names (`Prisma.ModelName`); helps avoid string literals in repositories. */
export const Models: ModelsObject = new Proxy({} as ModelsObject, {
  get: (_target, property) => Reflect.get(currentModelNames(), property),
  has: (_target, property) => Reflect.has(currentModelNames(), property),
  ownKeys: () => Reflect.ownKeys(currentModelNames()),
  getOwnPropertyDescriptor: (_target, property) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(currentModelNames(), property);
    // The proxy target does not own the keys, so they must be reported as configurable.
    return descriptor === undefined ? undefined : { ...descriptor, configurable: true };
  },
  set: rejectWrite,
  defineProperty: rejectWrite,
  deleteProperty: rejectWrite,
});
