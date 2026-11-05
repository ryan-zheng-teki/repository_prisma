import type { RegisteredPrismaClient } from './prisma-types';
import { initializePrisma, shutdownPrisma } from './client';
import { createForwardingPrismaProxy } from './forwarding-proxy';
import { getPrismaClient } from './prisma-manager';

// Annotated so the declaration keeps the registry alias instead of an inlined client type.
export const prisma: RegisteredPrismaClient = createForwardingPrismaProxy<RegisteredPrismaClient>(
  () => getPrismaClient() as RegisteredPrismaClient,
  {
    $connect: initializePrisma,
    $disconnect: shutdownPrisma,
  }
);
