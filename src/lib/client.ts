import type { RegisteredClientModule, RegisteredPrismaClient } from './prisma-types';
import { createForwardingPrismaProxy } from './forwarding-proxy';
import { PrismaClientLifecycle } from './client/lifecycle';
import type { InitializePrismaOptions } from './client/initialization-error';

export { PrismaInitializationError } from './client/initialization-error';
export type {
  InitializePrismaOptions,
  PrismaInitializationDiagnostic,
  PrismaInitializationErrorCode,
} from './client/initialization-error';

const lifecycle = new PrismaClientLifecycle();

export const initializePrisma = (
  options: InitializePrismaOptions = {}
): Promise<void> => lifecycle.initialize(options);

export const shutdownPrisma = (): Promise<void> => lifecycle.shutdown();

/**
 * Registers the client module the application's `prisma-client` generator created. It accepts
 * exactly the module declared in `PrismaClientRegistry`; the lifecycle checks its shape at runtime.
 */
export const registerPrismaClient = (module: RegisteredClientModule): void =>
  lifecycle.registerClientModule(module);

/** Internal (not exported by the package): the client module in use, for `Models`. */
export const getPrismaClientModule = () => lifecycle.getClientModule();

// Annotated so the declaration keeps the registry alias instead of an inlined client type.
export const rootPrismaClient: RegisteredPrismaClient =
  createForwardingPrismaProxy<RegisteredPrismaClient>(
    () => lifecycle.getClientForOperation(),
    {
      $connect: initializePrisma,
      $disconnect: shutdownPrisma,
    }
  );
