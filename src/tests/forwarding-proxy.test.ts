import { describe, expect, it, vi } from 'vitest';
import { createForwardingPrismaProxy } from '../lib/forwarding-proxy';

const identitySymbol = Symbol('identity');

type Surface = {
  label: string;
  nested: {
    value: string;
    [identitySymbol]: { value: string };
    identify(prefix: string): string;
  };
  makeCallerOwned(): { value: string };
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

const surface = (label: string): Surface => ({
  label,
  nested: {
    value: label,
    [identitySymbol]: { value: label },
    identify(prefix: string) {
      return `${prefix}:${this.value}`;
    },
  },
  makeCallerOwned() {
    return { value: this.label };
  },
  async $connect() {},
  async $disconnect() {},
});

describe('createForwardingPrismaProxy', () => {
  it('resolves captured nested handles and methods against the current owner with correct this', async () => {
    let owner = surface('A');
    const proxy = createForwardingPrismaProxy<Surface>(() => owner);
    const capturedNested = proxy.nested;
    const capturedMethod = proxy.nested.identify;
    const capturedSymbolNode = proxy.nested[identitySymbol];

    expect(capturedNested.value).toBe('A');
    expect(capturedMethod('owner')).toBe('owner:A');
    expect(capturedSymbolNode.value).toBe('A');

    owner = surface('B');

    expect(capturedNested.value).toBe('B');
    expect(capturedMethod('owner')).toBe('owner:B');
    expect(capturedSymbolNode.value).toBe('B');
    expect('nested' in proxy).toBe(true);
    expect((proxy as unknown as PromiseLike<unknown>).then).toBeUndefined();
    expect(await Promise.resolve(proxy)).toBe(proxy);
  });

  it('routes lifecycle hooks without invoking raw methods', async () => {
    const owner = surface('raw');
    const rawConnect = vi.spyOn(owner, '$connect');
    const rawDisconnect = vi.spyOn(owner, '$disconnect');
    const connect = vi.fn().mockResolvedValue(undefined);
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const proxy = createForwardingPrismaProxy<Surface>(() => owner, {
      $connect: connect,
      $disconnect: disconnect,
    });

    const capturedConnect = proxy.$connect;
    const capturedDisconnect = proxy.$disconnect;
    await capturedConnect();
    await capturedDisconnect();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(rawConnect).not.toHaveBeenCalled();
    expect(rawDisconnect).not.toHaveBeenCalled();
  });

  it('leaves already-invoked returned values caller-owned instead of claiming revocation', () => {
    let owner = surface('A');
    const proxy = createForwardingPrismaProxy<Surface>(() => owner);

    const callerOwned = proxy.makeCallerOwned();
    owner = surface('B');

    expect(callerOwned.value).toBe('A');
    expect(proxy.makeCallerOwned().value).toBe('B');
  });
});
