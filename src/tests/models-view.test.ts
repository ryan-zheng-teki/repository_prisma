import PrismaClientPackage from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { Models } from '../lib/models';

const { Prisma: PrismaRuntime } = PrismaClientPackage;

/** `Models` is a read-only view of the current client module's `Prisma.ModelName` (REQ-004). */
describe('Models view with the default prisma-client-js package', () => {
  it('reads the model names of the client module in use', () => {
    expect(Models.User).toBe(PrismaRuntime.ModelName.User);
    expect(Models.Post).toBe('Post');
  });

  it('supports Object.keys, Object.values, Object.entries, `in` and spread like the plain object', () => {
    expect(Object.keys(Models)).toEqual(Object.keys(PrismaRuntime.ModelName));
    expect(Object.values(Models)).toEqual(Object.values(PrismaRuntime.ModelName));
    expect(Object.entries(Models)).toEqual(Object.entries(PrismaRuntime.ModelName));
    expect('User' in Models).toBe(true);
    expect('Nope' in Models).toBe(false);
    expect({ ...Models }).toEqual({ ...PrismaRuntime.ModelName });
    expect(Object.getOwnPropertyDescriptor(Models, 'User')).toMatchObject({
      value: 'User',
      enumerable: true,
      configurable: true,
    });
    expect(Object.getOwnPropertyDescriptor(Models, 'Nope')).toBeUndefined();
  });

  it('rejects writes and leaves the model names unchanged', () => {
    expect(() => {
      (Models as Record<string, string>).User = 'Changed';
    }).toThrow(TypeError);
    expect(() => {
      delete (Models as Record<string, string>).User;
    }).toThrow(TypeError);
    expect(() => Object.defineProperty(Models, 'Extra', { value: 'Extra' })).toThrow(TypeError);
    expect(Models.User).toBe('User');
    expect(PrismaRuntime.ModelName.User).toBe('User');
    expect('Extra' in Models).toBe(false);
  });
});
