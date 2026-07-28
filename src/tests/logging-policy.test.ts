import type { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClientLifecycle, type PrismaClientFactory } from '../lib/client/lifecycle';
import {
  parseQueryLogFlag,
  queryLogLevels,
  resolveQueryLoggingPolicy,
} from '../lib/client/logging-policy';

type FakeClient = {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

const asPrismaClient = (client: FakeClient): PrismaClient =>
  client as unknown as PrismaClient;

const fakeClient = (): FakeClient => ({
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRawUnsafe: vi.fn().mockResolvedValue([]),
});

const originalQueryFlag = process.env.PRISMA_LOG_QUERIES;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalTestDatabaseUrl = process.env.DATABASE_URL_TEST;

afterEach(() => {
  if (originalQueryFlag === undefined) {
    delete process.env.PRISMA_LOG_QUERIES;
  } else {
    process.env.PRISMA_LOG_QUERIES = originalQueryFlag;
  }
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalTestDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL_TEST;
  } else {
    process.env.DATABASE_URL_TEST = originalTestDatabaseUrl;
  }
  vi.restoreAllMocks();
});

describe('query logging policy', () => {
  it.each([
    undefined,
    '',
    'false',
    '0',
    'off',
    'maybe',
    ' trueish ',
  ])('rejects non-truthy flag %j', (value) => {
    expect(parseQueryLogFlag(value)).toBe(false);
    expect(queryLogLevels(false)).toEqual(['info', 'warn', 'error']);
  });

  it.each(['1', 'true', 'TRUE', ' yes ', 'On'])('accepts truthy flag %j', (value) => {
    expect(parseQueryLogFlag(value)).toBe(true);
    expect(queryLogLevels(true)).toEqual(['info', 'warn', 'error', 'query']);
  });

  it('gives a defined typed option precedence over the environment', () => {
    process.env.PRISMA_LOG_QUERIES = 'true';
    expect(resolveQueryLoggingPolicy(false)).toBe(false);

    process.env.PRISMA_LOG_QUERIES = 'false';
    expect(resolveQueryLoggingPolicy(true)).toBe(true);
  });

  it('captures lazy policy, rejects a differing typed policy, and permits a new policy after shutdown', async () => {
    process.env.PRISMA_LOG_QUERIES = 'yes';
    const firstClient = fakeClient();
    const replacementClient = fakeClient();
    const clients = [firstClient, replacementClient];
    const policies: boolean[] = [];
    const factory: PrismaClientFactory = (_target, logQueries) => {
      policies.push(logQueries);
      return asPrismaClient(clients.shift()!);
    };
    const lifecycle = new PrismaClientLifecycle(factory);
    const target = 'postgresql://user:password@localhost:5432/logging';
    delete process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL = target;

    expect(lifecycle.getClientForOperation()).toBe(firstClient);
    expect(policies).toEqual([true]);

    await expect(
      lifecycle.initialize({ datasourceUrl: target, logQueries: false })
    ).rejects.toMatchObject({ code: 'LOGGING_POLICY_CONFLICT' });
    await lifecycle.initialize({ datasourceUrl: target });
    await lifecycle.shutdown();

    process.env.PRISMA_LOG_QUERIES = 'off';
    await lifecycle.initialize({ datasourceUrl: target, logQueries: false });
    expect(policies).toEqual([true, false]);
    await lifecycle.shutdown();
  });
});
