import type { PrismaClient } from '@prisma/client';
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

export const rootPrismaClient = createForwardingPrismaProxy<PrismaClient>(
  () => lifecycle.getClientForOperation(),
  {
    $connect: initializePrisma,
    $disconnect: shutdownPrisma,
  }
);
