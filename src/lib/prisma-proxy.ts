import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './prisma-manager';

const handler: ProxyHandler<PrismaClient> = {
  get(_target, prop, _receiver) {
    const client = getPrismaClient() as PrismaClient;
    const value = (client as any)[prop];

    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  },
};

export const prisma = new Proxy({} as PrismaClient, handler);
