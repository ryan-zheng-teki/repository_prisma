const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schema = `generator esm {
  provider            = "prisma-client"
  output              = "../esm/generated/prisma"
  importFileExtension = "js"
}

generator cjs {
  provider            = "prisma-client"
  output              = "../cjs/generated/prisma"
  moduleFormat        = "cjs"
  importFileExtension = "js"
}

datasource db {
  provider = "sqlite"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`;

/**
 * Lays out a consumer whose `@prisma/client` has no prisma-client-js output: the package files
 * are copied (so `.prisma/client` resolves from this consumer, where it does not exist) and its
 * directories are linked from the repository.
 */
const linkPrismaClientWithoutGeneratedOutput = (repoRoot, appDirectory, symlinkDirectory) => {
  const source = path.join(repoRoot, 'node_modules', '@prisma', 'client');
  const target = path.join(appDirectory, 'node_modules', '@prisma', 'client');
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      symlinkDirectory(path.join(source, entry.name), path.join(target, entry.name));
    } else {
      fs.copyFileSync(path.join(source, entry.name), path.join(target, entry.name));
    }
  }
};

// The scenario both builds run: missing client first (AC-009), then the registered client (AC-002, AC-004, AC-005, AC-007, AC-010).
const scenarioBody = (databasePath) => `
const prismaClientFiles = () =>
  Object.keys(requireForCache.cache).filter((file) =>
    /[\\\\/](?:@prisma[\\\\/]client|\\.prisma[\\\\/]client)[\\\\/](?:default|index)\\.js$/.test(file)
  );
const expectCode = async (action, code) => {
  let failure;
  try { await action(); } catch (error) { failure = error; }
  assert.equal(failure instanceof repo.PrismaInitializationError, true, 'expected ' + code);
  assert.equal(failure.code, code);
  assert.equal(String(failure).includes(${JSON.stringify(path.sep)} + 'node_modules'), false);
  assert.equal('cause' in failure, false);
  return failure;
};
const databaseUrl = 'file:' + ${JSON.stringify(databasePath)};

// AC-001: the import loaded no Prisma client module.
assert.deepEqual(prismaClientFiles(), []);

// AC-009: no registration and no prisma-client-js output.
let diagnostic;
await expectCode(
  () => repo.initializePrisma({ datasourceUrl: databaseUrl, onDiagnostic: (value) => { diagnostic = value; } }),
  'PRISMA_CLIENT_UNAVAILABLE'
);
assert.equal(diagnostic.code, 'PRISMA_CLIENT_UNAVAILABLE');
assert.equal(diagnostic.cause.code, 'MODULE_NOT_FOUND');
await repo.shutdownPrisma();
process.env.DATABASE_URL = databaseUrl;
await expectCode(() => repo.prisma.user, 'PRISMA_CLIENT_UNAVAILABLE');
await expectCode(() => repo.prisma.user, 'CLIENT_NOT_READY');
await expectCode(() => repo.Models.User, 'PRISMA_CLIENT_UNAVAILABLE');
await repo.shutdownPrisma();
delete process.env.DATABASE_URL;

// AC-010: a malformed argument is a TypeError.
assert.throws(() => repo.registerPrismaClient({ PrismaClient: generated.PrismaClient }), TypeError);

// AC-002 / AC-007: register, initialize with WAL, query.
repo.registerPrismaClient(generated);
await repo.initializePrisma({ datasourceUrl: databaseUrl, enableWAL: true });
const identity = await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA database_list;');
const main = identity.find((row) => String(row.name).toLowerCase() === 'main');
assert.equal(fs.realpathSync(main.file), fs.realpathSync(${JSON.stringify(databasePath)}));
const mode = await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;');
assert.equal(String(Object.values(mode[0])[0]).toLowerCase(), 'wal');
await repo.prisma.$executeRawUnsafe(
  'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL UNIQUE);'
);

// AC-005: Models and forModel with the generated model names.
assert.equal(repo.Models.User, generated.Prisma.ModelName.User);
assert.deepEqual(Object.keys(repo.Models), Object.keys(generated.Prisma.ModelName));
class UserRepository extends repo.BaseRepository.forModel(generated.Prisma.ModelName.User) {}
const users = new UserRepository();
const created = await users.create({ data: { email: 'first@example.test' } });
assert.equal(created.id, 1);

// AC-004: transactions commit, roll back, and expose the transaction client.
await repo.runInTransaction(async () => {
  assert.notEqual(repo.getTransactionClient(), undefined);
  await repo.prisma.user.create({ data: { email: 'committed@example.test' } });
}, { isolationLevel: 'Serializable' });
await assert.rejects(
  repo.runInTransaction(async () => {
    await users.create({ data: { email: 'rolled-back@example.test' } });
    throw new Error('rollback on purpose');
  }),
  /rollback on purpose/
);
class Service {
  async failInside() {
    await users.create({ data: { email: 'decorated-rollback@example.test' } });
    throw new Error('decorated rollback');
  }
}
const descriptor = Object.getOwnPropertyDescriptor(Service.prototype, 'failInside');
Object.defineProperty(Service.prototype, 'failInside', repo.Transactional()(Service.prototype, 'failInside', descriptor));
await assert.rejects(new Service().failInside(), /decorated rollback/);
const emails = (await users.findMany({ orderBy: { id: 'asc' } })).map((user) => user.email);
assert.deepEqual(emails, ['first@example.test', 'committed@example.test']);

// AC-010: the same module again is a no-op; a different one conflicts while bound.
repo.registerPrismaClient(generated);
class OtherClient extends generated.PrismaClient {}
await expectCode(
  () => repo.registerPrismaClient({ PrismaClient: OtherClient, Prisma: generated.Prisma }),
  'PRISMA_CLIENT_CONFLICT'
);
assert.equal(await repo.prisma.user.count(), 2);
await repo.shutdownPrisma();
repo.registerPrismaClient({ PrismaClient: OtherClient, Prisma: generated.Prisma });
await repo.initializePrisma({ datasourceUrl: databaseUrl });
assert.equal(await repo.prisma.user.count(), 2);
await repo.shutdownPrisma();

// The default package was never loaded: everything ran on the registered client.
assert.deepEqual(prismaClientFiles(), []);
`;

/** Runs a consumer on the prisma-client generator (no prisma-client-js output) through the ESM and CJS builds. */
const checkPrismaClientGenerator = (context) => {
  const { repoRoot, nodeCommand, temporaryRoot, consumerDirectory, run, symlinkDirectory } = context;
  const appDirectory = path.join(temporaryRoot, 'prisma-client-consumer');
  const packageDirectory = path.join(appDirectory, 'node_modules', 'repository_prisma');
  fs.mkdirSync(path.join(appDirectory, 'prisma'), { recursive: true });
  fs.mkdirSync(path.join(appDirectory, 'cjs'), { recursive: true });
  fs.writeFileSync(
    path.join(appDirectory, 'package.json'),
    JSON.stringify({ name: 'prisma-client-consumer', private: true, type: 'module' })
  );
  fs.writeFileSync(path.join(appDirectory, 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }));
  // A real copy of the installed package: a link would resolve its peers from the first consumer.
  fs.cpSync(path.join(consumerDirectory, 'node_modules', 'repository_prisma'), packageDirectory, {
    recursive: true,
  });
  linkPrismaClientWithoutGeneratedOutput(repoRoot, appDirectory, symlinkDirectory);
  symlinkDirectory(
    path.join(repoRoot, 'node_modules', '@prisma', 'adapter-better-sqlite3'),
    path.join(appDirectory, 'node_modules', '@prisma', 'adapter-better-sqlite3')
  );

  fs.writeFileSync(path.join(appDirectory, 'prisma', 'schema.prisma'), schema);
  run(
    nodeCommand,
    [
      path.join(repoRoot, 'node_modules', 'prisma', 'build', 'index.js'),
      'generate',
      '--schema',
      path.join('prisma', 'schema.prisma'),
    ],
    { cwd: appDirectory, capture: true }
  );

  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  for (const [format, moduleOption] of [['esm', 'NodeNext'], ['cjs', 'Node16']]) {
    const tsconfigPath = path.join(appDirectory, `tsconfig.${format}.json`);
    fs.writeFileSync(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: moduleOption,
          moduleResolution: moduleOption,
          strict: true,
          skipLibCheck: true,
          rootDir: `${format}/generated`,
          outDir: `${format}/out`,
        },
        include: [`${format}/generated/**/*.ts`],
      })
    );
    run(nodeCommand, [tsc, '--project', tsconfigPath], { cwd: appDirectory });
  }

  const esmScript = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as repo from 'repository_prisma';
import * as generated from './esm/out/prisma/client.js';
const requireForCache = createRequire(import.meta.url);
${scenarioBody(path.join(temporaryRoot, 'prisma-client-esm.db'))}
process.stdout.write('prisma-client-esm-ok\\n');
`;
  const cjsScript = `
const assert = require('node:assert/strict');
const fs = require('node:fs');
const requireForCache = require;
const repo = require('repository_prisma');
const generated = require('./out/prisma/client.js');
(async () => {
${scenarioBody(path.join(temporaryRoot, 'prisma-client-cjs.db'))}
process.stdout.write('prisma-client-cjs-ok\\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;
  fs.writeFileSync(path.join(appDirectory, 'esm-app.mjs'), esmScript);
  fs.writeFileSync(path.join(appDirectory, 'cjs', 'cjs-app.cjs'), cjsScript);

  const unsetEnv = ['DATABASE_URL', 'DATABASE_URL_TEST', 'PRISMA_DATASOURCE_PROVIDER', 'PRISMA_LOG_QUERIES'];
  for (const [script, cwd, marker] of [
    ['esm-app.mjs', appDirectory, 'prisma-client-esm-ok'],
    ['cjs-app.cjs', path.join(appDirectory, 'cjs'), 'prisma-client-cjs-ok'],
  ]) {
    const result = run(nodeCommand, [script], { cwd, capture: true, unsetEnv });
    assert.match(result.stdout, new RegExp(`${marker}\\n`));
    assert.equal(result.stderr.includes('prisma:error'), false);
  }
  return { appDirectory };
};

module.exports = { checkPrismaClientGenerator };
