import type { PrismaClient } from '@prisma/client';
import { initializePrisma, shutdownPrisma } from './client';
import { createForwardingPrismaProxy } from './forwarding-proxy';
import { getPrismaClient } from './prisma-manager';

export const prisma = createForwardingPrismaProxy<PrismaClient>(
  () => getPrismaClient() as PrismaClient,
  {
    $connect: initializePrisma,
    $disconnect: shutdownPrisma,
  }
);
