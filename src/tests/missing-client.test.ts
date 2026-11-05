import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * An app on the prisma-client generator that forgot to register its client (AC-009): the
 * default `@prisma/client` load fails as it does without prisma-client-js output.
 */
vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  const createRequire = (url: string | URL) => {
    const realRequire = actual.createRequire(url);
    return Object.assign((id: string) => {
      if (id === '@prisma/client') {
        throw Object.assign(
          new Error(
            "Cannot find module '.prisma/client/default'\nRequire stack:\n" +
              '- /secret/app/node_modules/@prisma/client/default.js'
          ),
          { code: 'MODULE_NOT_FOUND' }
        );
      }
      return realRequire(id);
    }, realRequire);
  };
  return { ...actual, createRequire, default: { ...actual, createRequire } };
});

import * as repository from '../index';
import type { PrismaInitializationDiagnostic } from '../index';

const originalEnvironment = { ...process.env };

const caught = (action: () => unknown): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
};

const expectUnavailable = (error: unknown): void => {
  expect(error).toBeInstanceOf(repository.PrismaInitializationError);
  expect(error).toMatchObject({ code: 'PRISMA_CLIENT_UNAVAILABLE' });
  expect(String(error)).not.toContain('/secret/');
  expect(String(error)).not.toContain('.prisma');
};

describe.sequential('public API without a registered client and without prisma-client-js output', () => {
  afterEach(async () => {
    await repository.shutdownPrisma();
    process.env = { ...originalEnvironment };
  });

  it('imports the package and rejects initializePrisma with the cause on onDiagnostic', async () => {
    expect(typeof repository.registerPrismaClient).toBe('function');
    const diagnostics: PrismaInitializationDiagnostic[] = [];

    const error = await repository
      .initializePrisma({ datasourceUrl: 'file::memory:', onDiagnostic: (value) => diagnostics.push(value) })
      .then(() => undefined, (rejection: unknown) => rejection);

    expectUnavailable(error);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('PRISMA_CLIENT_UNAVAILABLE');
    expect(diagnostics[0].cause).toMatchObject({ code: 'MODULE_NOT_FOUND' });
  });

  it('throws PRISMA_CLIENT_UNAVAILABLE on the first lazy use and CLIENT_NOT_READY after it', () => {
    delete process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL = 'file::memory:';

    expectUnavailable(caught(() => repository.prisma.user));
    expect(caught(() => repository.rootPrismaClient.user)).toMatchObject({
      code: 'CLIENT_NOT_READY',
    });
  });

  it('throws PRISMA_CLIENT_UNAVAILABLE from Models', () => {
    expectUnavailable(caught(() => repository.Models.User));
    expectUnavailable(caught(() => Object.keys(repository.Models)));
    expectUnavailable(caught(() => 'User' in repository.Models));
  });
});
