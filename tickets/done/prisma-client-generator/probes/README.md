# Probes: prisma-client generator support (repository-prisma-3)

Feasibility and reproduction evidence gathered by the Solution Designer on 2026-11-04.
Disposable scratch projects lived outside the repository (`/tmp/rp3-probe`, `/tmp/rp3-probe-cjs`,
`/tmp/rp3-proto`); the files kept here are what is needed to repeat them.

## Setup (scratch consumer)

```bash
mkdir /tmp/rp3-probe && cd /tmp/rp3-probe
echo '{"name":"rp3-probe","private":true,"type":"module"}' > package.json
npm install prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-better-sqlite3@7.10.1 typescript@5.9.3 @types/node tsx
cp <ticket>/probes/esm-app/schema.prisma prisma/schema.prisma      # generator "prisma-client", output ../src/generated/prisma
# prisma.config.ts: defineConfig({ schema: "prisma/schema.prisma", datasource: { url: "file:./probe.db" } })
npx prisma generate
cp <ticket>/probes/esm-app/tsconfig.json .                         # module/moduleResolution nodenext, skipLibCheck true
```

## P1: reproduction on the current package (2.0.0, main 5a73159)

`npm pack` of main, installed into the scratch consumer:

```bash
node --input-type=module -e "await import('repository_prisma')"   # MODULE_NOT_FOUND: Cannot find module '.prisma/client/default'
node -e "require('repository_prisma')"                             # same
node -e "require('@prisma/client')"                                # same: @prisma/client root needs prisma-client-js output
npx tsc -p tsconfig.json                                           # esm-app/current.ts: no error, even for data: { nope: 1 } (types are any)
npx tsc -p tsconfig.json --skipLibCheck false                      # TS2307 '.prisma/client/default', TS2305 no 'Prisma'/'PrismaClient'
```

Implementation starts from this: a consumer on the `prisma-client` generator cannot import the package.

## P2: prototype (feasibility only, not the design)

`prototype-src.diff` is the scratch change applied to a copy of main (`/tmp/rp3-proto`). It is
evidence that the approach works, not the implementation; `design-spec.md` is authoritative.

- Repo suite (prisma-client-js): `npm test` -> 11 files, 113 tests passed.
- Type equality for prisma-client-js: `TransactionIsolationLevel`, `TransactionClient`, `ModelName`,
  the client type, `typeof prisma`, `getTransactionClient()` are identical (`Eq<>` checks) to the
  `@prisma/client` types; `buildContainsFilter` stays assignable to a SQLite `where` string field.
- `npm run test:package`: fails at the `.d.ts` text check for `Prisma.TransactionIsolationLevel`
  (expected: the declaration text changes); after adjusting that check, the ESM logging-policy probe
  fails because it stubs `@prisma/client` through an ESM `resolve` loader hook, which a
  `createRequire` load does not pass through. Harness coupling, to be updated by implementation.
- ESM consumer (`esm-app/main.ts`, `npx tsx app/main.ts`): register, WAL init, repository CRUD,
  `prisma` proxy, `runInTransaction` with `isolationLevel`, rollback via HOF and `@Transactional`,
  `BaseRepository.forModel(Prisma.ModelName.User)`, `Models.User` ->
  `{"id":1,"emails":["a@x","b@x"],"modelsUser":"User"}`.
- Types (`npx tsc -p tsconfig.json`, skipLibCheck true): with the registry augmentation, unknown
  fields, unknown models, unknown delegates and a bogus isolation level are rejected
  (`esm-app/types-negative.ts`). The declaration emitter inlined the resolved default client type
  for `prisma`/`rootPrismaClient` until they were explicitly annotated with the registry alias.
- CJS consumer (`cjs-app`, `"type": "commonjs"`, generator `moduleFormat = "cjs"`): register + init
  + transaction + query through the CJS dist -> `cjs [{"id":1,"email":"cjs@x"}]`.
- Forgot registration (`esm-app/forgot.ts`): import succeeds; `initializePrisma` and lazy use reject
  with `CONNECTION_FAILED` (misleading); `Models.User` throws a non-Error internal object. Both need
  a stable, explanatory error.
- Build: with tsup `target: 'es2018'` the ESM `import.meta` is emptied (esbuild warning) and
  `createRequire(undefined)` would throw at import; `target: 'es2020'` keeps `import.meta.url`.
  tsup `shims: true` supplies `import.meta.url` in the CJS build. Source typecheck needs
  `module: esnext` + `moduleResolution: bundler` (TS1343 under `module: commonjs`); with that the
  suite still passes.

## P3: registration tied to the type declaration (SR-005, 2026-11-05)

> **Correction (SR-006, after ARCH-REV-003 AR-003):** the first P3 run below was a false pass. The
> registered config extended `tsconfig.json`, overrode only `include` and so inherited the base
> `exclude`, which named `examples/prisma-client-generator/**`; `tsc --listFilesOnly` listed 0
> example files. Re-measured with `"exclude": ["node_modules", "dist"]` in the registered config
> (the file now in `registered-program/`): `db.ts` and `demo.ts` are listed; the program passes;
> control 1 (append `export const broken: number = 'x';` to `demo.ts`) fails with TS2322; control 2
> (remove the `declare module` block) fails at `registerPrismaClient(generated)` with
> `MissingTypeDeclaration`; MP-002 (declare `client: generated.PrismaClient`, with
> `infer M extends GeneratedModule` in `RegisteredClientModule`) fails with `MissingTypeDeclaration`;
> the main program lists 0 registered files and T1..T15 stay identical.

Prototype `/tmp/rp3-proto` with `registered-program/prisma-types.prototype.ts` (one-field registry,
`RegisteredClientModule` as `registerPrismaClient`'s parameter type), a second generator
(`provider = "prisma-client"`, `output = "../generated/prisma-client"`), the main `tsconfig.json`
excluding `examples/prisma-client-generator/**`, and `registered-program/tsconfig.prisma-client-generator.json`
(`paths: { "repository_prisma": ["./src/index.ts"] }`).

- `npx tsc -p tsconfig.json` (main program, with `probes/type-equality.typecheck.ts`): no errors, T1..T15 identical.
- `npx tsc -p tsconfig.prisma-client-generator.json`: `registered-program/db.ts` + `demo.ts` compile; the
  augmentation of `'repository_prisma'` (path-mapped to `src/index.ts`, which re-exports the interface)
  reaches the library types; `@ts-expect-error` lines for an unknown field, an unknown model and a
  different registered object are all needed; `Models.User` is typed `'User'`; `buildContainsFilter` is accepted.
- Same program without the `declare module` block: `registerPrismaClient(generated)` fails with TS2345
  "... not assignable to parameter of type 'MissingTypeDeclaration'", whose property names the line to add.
- `npm test`: 113/113.
- Earlier scratch check: a type-level warning in the library's own types for a missing declaration
  cannot work. With `@prisma/client`'s generated types missing, every type derived from them
  (including an `IsAny` check) is `any` under `skipLibCheck`; only a type that does not reference
  `@prisma/client` (the registry) can carry the error.
