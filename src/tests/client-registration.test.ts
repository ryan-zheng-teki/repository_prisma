import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClientLifecycle } from '../lib/client/lifecycle';
import { PrismaClientSource, type PrismaClientModule } from '../lib/client/client-source';
import type { PrismaInitializationErrorCode } from '../lib/client/initialization-error';

/**
 * The client source and the registration rule (REQ-005, REQ-006; AC-009, AC-010) with fake
 * client modules. The real generated-client paths are covered by the prisma-client tests and
 * the package smoke.
 */

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

/** A fake client module whose `PrismaClient` records its construction options. */
const fakeModule = (connect: () => Promise<void> = async () => undefined) => {
  const constructed: unknown[] = [];
  class PrismaClient {
    constructor(options: unknown) {
      constructed.push(options);
    }
    $connect = vi.fn(connect);
    $disconnect = vi.fn(async () => undefined);
    $queryRawUnsafe = vi.fn(async () => []);
  }
  const module: PrismaClientModule = {
    PrismaClient,
    Prisma: { ModelName: { User: 'User' } },
  };
  return { module, constructed };
};

const missingDefaultPackage = (): never => {
  throw Object.assign(
    new Error("Cannot find module '.prisma/client/default'\nRequire stack:\n- /secret/app/node_modules/@prisma/client/default.js"),
    { code: 'MODULE_NOT_FOUND' }
  );
};

const unavailableLifecycle = () =>
  new PrismaClientLifecycle({ clientSource: new PrismaClientSource(missingDefaultPackage) });

const expectCode = (action: () => unknown, code: PrismaInitializationErrorCode): Error => {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({ name: 'PrismaInitializationError', code });
  return error as Error;
};

const memoryUrl = 'file::memory:';
const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

const useEnvironmentUrl = (url: string): void => {
  delete process.env.DATABASE_URL_TEST;
  process.env.DATABASE_URL = url;
};

describe('PrismaClientSource', () => {
  it('starts on the default package and loads it only when asked', () => {
    const { module } = fakeModule();
    const load = vi.fn(() => module);
    const source = new PrismaClientSource(load);

    expect(load).not.toHaveBeenCalled();
    expect(source.current()).toBe(module);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('classifies a default package that cannot load as PRISMA_CLIENT_UNAVAILABLE with the raw cause', () => {
    const source = new PrismaClientSource(missingDefaultPackage);

    let failure: unknown;
    try {
      source.current();
    } catch (caught) {
      failure = caught;
    }
    expect(failure).toMatchObject({ code: 'PRISMA_CLIENT_UNAVAILABLE' });
    expect((failure as { cause: unknown }).cause).toMatchObject({ code: 'MODULE_NOT_FOUND' });
  });

  it('returns the registered module without loading the default package', () => {
    const load = vi.fn(missingDefaultPackage);
    const source = new PrismaClientSource(load);
    const { module } = fakeModule();

    source.register(module);

    expect(source.current()).toBe(module);
    expect(source.holds(module)).toBe(true);
    expect(source.holds({ ...module })).toBe(true);
    expect(source.holds({ ...module, Prisma: { ModelName: {} } })).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });
});

describe.sequential('PrismaClientLifecycle without a usable client (AC-009)', () => {
  it('rejects explicit initialization with PRISMA_CLIENT_UNAVAILABLE and gives onDiagnostic the cause', async () => {
    const lifecycle = unavailableLifecycle();
    const diagnostic = vi.fn();

    const error = await lifecycle
      .initialize({ datasourceUrl: memoryUrl, onDiagnostic: diagnostic })
      .then(
        () => undefined,
        (caught: unknown) => caught as Error & { code: string }
      );

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'PrismaInitializationError', code: 'PRISMA_CLIENT_UNAVAILABLE' });
    expect(error!.message).toBe(
      'No generated Prisma client is available. Run `prisma generate`, or pass the client your ' +
        'prisma-client generator created to registerPrismaClient().'
    );
    expect(String(error)).not.toContain('/secret/');
    expect('cause' in error!).toBe(false);
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic.mock.calls[0][0].code).toBe('PRISMA_CLIENT_UNAVAILABLE');
    expect(diagnostic.mock.calls[0][0].cause).toMatchObject({ code: 'MODULE_NOT_FOUND' });
    expectCode(() => lifecycle.getClientForOperation(), 'CLIENT_NOT_READY');
  });

  it('throws PRISMA_CLIENT_UNAVAILABLE on the first lazy use, then CLIENT_NOT_READY until shutdown', async () => {
    const lifecycle = unavailableLifecycle();
    useEnvironmentUrl(memoryUrl);

    const first = expectCode(() => lifecycle.getClientForOperation(), 'PRISMA_CLIENT_UNAVAILABLE');
    expect(first.message).not.toContain('/secret/');
    expectCode(() => lifecycle.getClientForOperation(), 'CLIENT_NOT_READY');

    await lifecycle.shutdown();
    expectCode(() => lifecycle.getClientForOperation(), 'PRISMA_CLIENT_UNAVAILABLE');
  });

  it('reports the missing client through getClientModule as a stage failure', () => {
    const lifecycle = unavailableLifecycle();
    expect(() => lifecycle.getClientModule()).toThrow(
      expect.objectContaining({ code: 'PRISMA_CLIENT_UNAVAILABLE' })
    );
  });

  it('builds the client from a module registered after the failure', async () => {
    const lifecycle = unavailableLifecycle();
    await expect(lifecycle.initialize({ datasourceUrl: memoryUrl })).rejects.toMatchObject({
      code: 'PRISMA_CLIENT_UNAVAILABLE',
    });
    const { module, constructed } = fakeModule();

    lifecycle.registerClientModule(module);
    await lifecycle.initialize({ datasourceUrl: memoryUrl });

    expect(constructed).toHaveLength(1);
    expect(constructed[0]).toMatchObject({ log: ['info', 'warn', 'error'] });
    expect(lifecycle.getClientForOperation()).toBeInstanceOf(module.PrismaClient);
    expect(lifecycle.getClientModule()).toBe(module);
    await lifecycle.shutdown();
  });
});

describe.sequential('PrismaClientLifecycle registration rule (AC-010)', () => {
  it.each([
    { name: 'undefined', value: undefined },
    { name: 'a class instead of the module', value: class PrismaClient {} },
    { name: 'a module without PrismaClient', value: { Prisma: { ModelName: {} } } },
    { name: 'a module without Prisma', value: { PrismaClient: class {} } },
    { name: 'a module without Prisma.ModelName', value: { PrismaClient: class {}, Prisma: {} } },
  ])('rejects $name with a TypeError and changes nothing', ({ value }) => {
    const { module } = fakeModule();
    const lifecycle = new PrismaClientLifecycle({ clientSource: new PrismaClientSource(() => module) });

    expect(() => lifecycle.registerClientModule(value as unknown as PrismaClientModule)).toThrow(TypeError);
    expect(lifecycle.getClientModule()).toBe(module);
  });

  it('accepts a module in idle and treats the same module again as a no-op while bound', async () => {
    const lifecycle = unavailableLifecycle();
    const { module, constructed } = fakeModule();

    lifecycle.registerClientModule(module);
    await lifecycle.initialize({ datasourceUrl: memoryUrl });
    const client = lifecycle.getClientForOperation();

    expect(() => lifecycle.registerClientModule(module)).not.toThrow();
    expect(() => lifecycle.registerClientModule({ ...module })).not.toThrow();
    expect(lifecycle.getClientForOperation()).toBe(client);
    expect(constructed).toHaveLength(1);
    await lifecycle.shutdown();
  });

  it('rejects a different module while lazily bound and keeps the bound client', async () => {
    const lifecycle = unavailableLifecycle();
    const a = fakeModule();
    const b = fakeModule();
    lifecycle.registerClientModule(a.module);
    useEnvironmentUrl(memoryUrl);
    const client = lifecycle.getClientForOperation();

    const error = expectCode(() => lifecycle.registerClientModule(b.module), 'PRISMA_CLIENT_CONFLICT');

    expect(error.message).toBe(
      'A different Prisma client is already in use; call and await shutdownPrisma() before ' +
        'registering another.'
    );
    expect(lifecycle.getClientForOperation()).toBe(client);
    expect(lifecycle.getClientModule()).toBe(a.module);
    expect(b.constructed).toHaveLength(0);
    await lifecycle.shutdown();
  });

  it('rejects a different module while initializing and still publishes the bound client', async () => {
    const connect = deferred<void>();
    const lifecycle = unavailableLifecycle();
    const a = fakeModule(() => connect.promise);
    const b = fakeModule();
    lifecycle.registerClientModule(a.module);

    const initialization = lifecycle.initialize({ datasourceUrl: memoryUrl });
    expectCode(() => lifecycle.registerClientModule(b.module), 'PRISMA_CLIENT_CONFLICT');
    connect.resolve();
    await initialization;

    expect(lifecycle.getClientForOperation()).toBeInstanceOf(a.module.PrismaClient);
    await lifecycle.shutdown();
  });

  it('rejects a different module while ready and while shutting down, then accepts it after shutdown', async () => {
    const lifecycle = unavailableLifecycle();
    const a = fakeModule();
    const b = fakeModule();
    lifecycle.registerClientModule(a.module);
    await lifecycle.initialize({ datasourceUrl: memoryUrl });

    expectCode(() => lifecycle.registerClientModule(b.module), 'PRISMA_CLIENT_CONFLICT');
    const shutdown = lifecycle.shutdown();
    expectCode(() => lifecycle.registerClientModule(b.module), 'PRISMA_CLIENT_CONFLICT');
    await shutdown;

    lifecycle.registerClientModule(b.module);
    await lifecycle.initialize({ datasourceUrl: memoryUrl });

    expect(lifecycle.getClientForOperation()).toBeInstanceOf(b.module.PrismaClient);
    expect(a.constructed).toHaveLength(1);
    expect(b.constructed).toHaveLength(1);
    await lifecycle.shutdown();
  });

  it('accepts a different module after a failed initialization', async () => {
    const lifecycle = unavailableLifecycle();
    const a = fakeModule(async () => {
      throw new Error('connect failed');
    });
    const b = fakeModule();
    lifecycle.registerClientModule(a.module);
    await expect(lifecycle.initialize({ datasourceUrl: memoryUrl })).rejects.toMatchObject({
      code: 'CONNECTION_FAILED',
    });

    lifecycle.registerClientModule(b.module);
    await lifecycle.initialize({ datasourceUrl: memoryUrl });

    expect(lifecycle.getClientForOperation()).toBeInstanceOf(b.module.PrismaClient);
    await lifecycle.shutdown();
  });
});
