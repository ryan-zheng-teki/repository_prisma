import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrismaClientPackage from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';

const { Prisma: PrismaRuntime } = PrismaClientPackage;

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../lib/client', () => ({
  rootPrismaClient: {
    $transaction: mocks.transaction,
  },
}));

import { BaseRepository } from '../lib/base-repository';
import {
  getTransactionClient,
  runInTransaction,
  type RunInTransactionOptions,
} from '../lib/context';
import { Models } from '../lib/models';

class UserRepository extends BaseRepository.forModel(Models.User) {}
class PostRepository extends BaseRepository.forModel(Models.Post) {}

const checkOptionTypes = () => {
  const valid: RunInTransactionOptions = {
    maxWait: 2_000,
    timeout: 10_000,
    isolationLevel: PrismaRuntime.TransactionIsolationLevel.Serializable,
  };

  // @ts-expect-error unrelated transaction settings are not accepted
  const invalidKey: RunInTransactionOptions = { retry: 1 };
  // @ts-expect-error maxWait must be numeric
  const invalidWait: RunInTransactionOptions = { maxWait: '2000' };
  // @ts-expect-error isolationLevel must be a supported Prisma value
  const invalidIsolation: RunInTransactionOptions = { isolationLevel: 'Invalid' };

  void valid;
  void invalidKey;
  void invalidWait;
  void invalidIsolation;
};
void checkOptionTypes;

describe('runInTransaction control flow', () => {
  const userCreate = vi.fn();
  const postCreate = vi.fn();
  const transactionClient = {
    user: { create: userCreate },
    post: { create: postCreate },
  } as unknown as PrismaTypes.TransactionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    userCreate.mockResolvedValue({ id: 1, email: 'outer@example.com' });
    postCreate.mockResolvedValue({ id: 1, title: 'Post', authorId: 1 });
    mocks.transaction.mockImplementation(
      async (callback: (tx: PrismaTypes.TransactionClient) => Promise<unknown>) =>
        callback(transactionClient)
    );
  });

  it('preserves the one-argument Prisma call when options are omitted', async () => {
    const result = await runInTransaction(async () => {
      expect(getTransactionClient()).toBe(transactionClient);
      return 'result';
    });

    expect(result).toBe('result');
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]).toHaveLength(1);
  });

  it('forwards the exact options object and routes repository work through its transaction client', async () => {
    const options: RunInTransactionOptions = {
      maxWait: 2_000,
      timeout: 10_000,
      isolationLevel: PrismaRuntime.TransactionIsolationLevel.Serializable,
    };
    const userRepository = new UserRepository();
    const postRepository = new PostRepository();

    await runInTransaction(async () => {
      const user = await userRepository.create({
        data: { email: 'outer@example.com' },
      });
      await postRepository.create({
        data: { title: 'Post', authorId: user.id },
      });
    }, options);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]).toHaveLength(2);
    expect(mocks.transaction.mock.calls[0][1]).toBe(options);
    expect(userCreate).toHaveBeenCalledWith({
      data: { email: 'outer@example.com' },
    });
    expect(postCreate).toHaveBeenCalledWith({
      data: { title: 'Post', authorId: 1 },
    });
  });

  it('forwards an explicitly supplied empty options object', async () => {
    const options: RunInTransactionOptions = {};

    await runInTransaction(async () => undefined, options);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]).toHaveLength(2);
    expect(mocks.transaction.mock.calls[0][1]).toBe(options);
  });

  it('reuses one transaction client and keeps outer options authoritative when nested', async () => {
    const outerOptions: RunInTransactionOptions = {
      maxWait: 2_000,
      timeout: 10_000,
    };
    const innerOptions: RunInTransactionOptions = {
      maxWait: 1,
      timeout: 1,
    };
    const observedClients: PrismaTypes.TransactionClient[] = [];

    const result = await runInTransaction(async () => {
      observedClients.push(getTransactionClient()!);
      return runInTransaction(async () => {
        observedClients.push(getTransactionClient()!);
        return 'nested-result';
      }, innerOptions);
    }, outerOptions);

    expect(result).toBe('nested-result');
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0][1]).toBe(outerOptions);
    expect(mocks.transaction.mock.calls[0][1]).not.toBe(innerOptions);
    expect(observedClients).toEqual([transactionClient, transactionClient]);
  });
});
