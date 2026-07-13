type ClientResolver<T extends object> = () => T;

export type ForwardingPrismaProxyHooks = Partial<
  Record<'$connect' | '$disconnect', () => Promise<void>>
>;

const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

export const createForwardingPrismaProxy = <T extends object>(
  resolveClient: ClientResolver<T>,
  hooks: ForwardingPrismaProxyHooks = {}
): T => {
  const resolvePath = (path: readonly PropertyKey[]): unknown => {
    let value: unknown = resolveClient();
    for (const property of path) {
      if (!isObject(value) && typeof value !== 'function') {
        throw new TypeError('The current Prisma surface does not expose the requested property.');
      }
      value = Reflect.get(value, property, value);
    }
    return value;
  };

  const createObjectNode = (path: readonly PropertyKey[]): object => {
    const children = new Map<PropertyKey, unknown>();

    return new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'then') {
            return undefined;
          }

          if (path.length === 0 && typeof property === 'string' && hooks[property as keyof typeof hooks]) {
            const cachedHook = children.get(property);
            if (cachedHook) {
              return cachedHook;
            }
            const hook = hooks[property as keyof typeof hooks];
            const forwardedHook = (): Promise<void> => hook!();
            children.set(property, forwardedHook);
            return forwardedHook;
          }

          const owner = resolvePath(path);
          if (!isObject(owner) && typeof owner !== 'function') {
            throw new TypeError('The current Prisma surface is not available.');
          }
          const value = Reflect.get(owner, property, owner);
          if (typeof value !== 'function' && !isObject(value)) {
            return value;
          }

          const cached = children.get(property);
          if (cached) {
            return cached;
          }
          const childPath = [...path, property];
          const child =
            typeof value === 'function'
              ? createFunctionNode(path, property, childPath)
              : createObjectNode(childPath);
          children.set(property, child);
          return child;
        },
        set(_target, property, value) {
          const owner = resolvePath(path);
          if (!isObject(owner) && typeof owner !== 'function') {
            return false;
          }
          return Reflect.set(owner, property, value, owner);
        },
        has(_target, property) {
          const owner = resolvePath(path);
          return (isObject(owner) || typeof owner === 'function') && Reflect.has(owner, property);
        },
      }
    );
  };

  const createFunctionNode = (
    ownerPath: readonly PropertyKey[],
    property: PropertyKey,
    functionPath: readonly PropertyKey[]
  ): Function => {
    const functionTarget = (..._args: unknown[]): unknown => undefined;
    const properties = new Map<PropertyKey, unknown>();

    return new Proxy(functionTarget, {
      apply(_target, _thisArgument, argumentsList) {
        const owner = resolvePath(ownerPath);
        if (!isObject(owner) && typeof owner !== 'function') {
          throw new TypeError('The current Prisma method owner is not available.');
        }
        const method = Reflect.get(owner, property, owner);
        if (typeof method !== 'function') {
          throw new TypeError('The current Prisma property is not callable.');
        }
        return Reflect.apply(method, owner, argumentsList);
      },
      get(_target, childProperty) {
        if (childProperty === 'then') {
          return undefined;
        }

        const currentFunction = resolvePath(functionPath);
        if (typeof currentFunction !== 'function') {
          return undefined;
        }
        const value = Reflect.get(currentFunction, childProperty, currentFunction);
        if (typeof value !== 'function' && !isObject(value)) {
          return value;
        }

        const cached = properties.get(childProperty);
        if (cached) {
          return cached;
        }
        const childPath = [...functionPath, childProperty];
        const child =
          typeof value === 'function'
            ? createFunctionNode(functionPath, childProperty, childPath)
            : createObjectNode(childPath);
        properties.set(childProperty, child);
        return child;
      },
    });
  };

  return createObjectNode([]) as T;
};
