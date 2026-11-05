const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/**
 * Type-checks consumers against the installed declarations: a prisma-client-js consumer without
 * a declaration, and consumers on the prisma-client generator (`prismaClientConsumer`).
 */
const checkConsumerTypes = (context, { prismaClientConsumer }) => {
  const { repoRoot, nodeCommand, consumerDirectory, run } = context;
  fs.writeFileSync(
    path.join(consumerDirectory, 'type-smoke.ts'),
    `import {
  initializePrisma,
  PrismaInitializationError,
  type InitializePrismaOptions,
  type PrismaInitializationDiagnostic,
  type PrismaInitializationErrorCode,
  runInTransaction,
  type RunInTransactionOptions,
} from 'repository_prisma';

const code: PrismaInitializationErrorCode = 'WAL_VERIFICATION_FAILED';
const diagnostic: PrismaInitializationDiagnostic = { code, cause: new Error('opt-in') };
const options: InitializePrismaOptions = {
  datasourceUrl: 'file:./consumer.db',
  enableWAL: true,
  logQueries: false,
  onDiagnostic: (value) => void value.cause,
};
const queryOptions: InitializePrismaOptions = { logQueries: true };
const conflictCode: PrismaInitializationErrorCode = 'LOGGING_POLICY_CONFLICT';
const unsupportedCode: PrismaInitializationErrorCode = 'UNSUPPORTED_DATASOURCE_PROVIDER';
const clientCodes: PrismaInitializationErrorCode[] = ['PRISMA_CLIENT_UNAVAILABLE', 'PRISMA_CLIENT_CONFLICT'];
const driverCode: PrismaInitializationErrorCode = 'SQLITE_DRIVER_UNAVAILABLE';
const transactionOptions: RunInTransactionOptions = {
  maxWait: 2_000,
  timeout: 10_000,
  isolationLevel: 'Serializable',
};
const defaultTransaction = runInTransaction(async () => 'default');
const optionedTransaction = runInTransaction(async () => 'optioned', transactionOptions);
// @ts-expect-error unrelated transaction options are rejected
const invalidTransactionOptions: RunInTransactionOptions = { retry: 1 };
// @ts-expect-error maxWait must be numeric
const invalidWait: RunInTransactionOptions = { maxWait: '2000' };
void initializePrisma(options);
void initializePrisma(queryOptions);
void defaultTransaction;
void optionedTransaction;
void invalidTransactionOptions;
void invalidWait;
void conflictCode;
void unsupportedCode;
void driverCode;
void clientCodes;
void diagnostic;
void PrismaInitializationError;
`
  );
  fs.writeFileSync(
    path.join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'Node16',
        moduleResolution: 'Node16',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['type-smoke.ts'],
    })
  );
  run(
    nodeCommand,
    [
      path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--project',
      'tsconfig.json',
    ],
    { cwd: consumerDirectory }
  );
  return { registeredConsumerTypes: checkRegisteredConsumerTypes(context, prismaClientConsumer) };
};

const registeredTypes = (clientPath) => `import * as generated from '${clientPath}';
import {
  BaseRepository,
  Models,
  buildContainsFilter,
  getPrismaClient,
  getTransactionClient,
  prisma,
  registerPrismaClient,
  rootPrismaClient,
  runInTransaction,
  type ModelName,
} from 'repository_prisma';

registerPrismaClient(generated);

declare module 'repository_prisma' {
  interface PrismaClientRegistry {
    client: typeof generated;
  }
}

class UserRepository extends BaseRepository<'User'> {}
class UserByName extends BaseRepository.forModel(generated.Prisma.ModelName.User) {}

export const valid = async (): Promise<void> => {
  const user = await new UserRepository().create({ data: { email: 'ada@example.test' } });
  const id: number = user.id;
  const email: string | undefined = (await new UserByName().findUnique({ where: { id } }))?.email;
  await runInTransaction(
    async () => {
      const tx = getTransactionClient();
      await tx?.user.count();
      await getPrismaClient().user.findMany({ where: { email: buildContainsFilter('ada') } });
    },
    { isolationLevel: 'Serializable', maxWait: 2_000 }
  );
  const userModel: 'User' = Models.User;
  const modelName: ModelName = 'User';
  await rootPrismaClient.user.count();
  void email;
  void userModel;
  void modelName;
};

export const rejected = async (): Promise<void> => {
  // @ts-expect-error unknown field
  await new UserRepository().create({ data: { nope: 1 } });
  // @ts-expect-error unknown delegate
  void prisma.post;
  // @ts-expect-error invalid isolation level
  await runInTransaction(async () => undefined, { isolationLevel: 'Bogus' });
  // @ts-expect-error a different object than the declared module
  registerPrismaClient({ PrismaClient: class {}, Prisma: { ModelName: {} } });
};

// @ts-expect-error unknown model
export class PostRepository extends BaseRepository<'Post'> {}
`;

const missingDeclaration = (clientPath) => `import * as generated from '${clientPath}';
import { registerPrismaClient } from 'repository_prisma';

registerPrismaClient(generated);
`;

// Consumer settings the registered types must hold under (QR-002): each resolution mode for an
// ESM consumer of the ESM client, and a CommonJS consumer of the `moduleFormat = "cjs"` client.
const esmClient = './esm/generated/prisma/client.js';
const registeredConsumers = [
  { name: 'nodenext', directory: '.', module: 'NodeNext', moduleResolution: 'NodeNext', clientPath: esmClient },
  { name: 'node16', directory: '.', module: 'Node16', moduleResolution: 'Node16', clientPath: esmClient },
  { name: 'bundler', directory: '.', module: 'ESNext', moduleResolution: 'Bundler', clientPath: esmClient },
  // In `cjs/` ("type": "commonjs"), next to the `moduleFormat = "cjs"` client.
  { name: 'cjs-node16', directory: 'cjs', module: 'Node16', moduleResolution: 'Node16', clientPath: './generated/prisma/client.js' },
];

/**
 * Type-checks consumers on the prisma-client generator (AC-006, AC-013): with the declaration the
 * registered types are enforced; without it, the registerPrismaClient call fails to compile and
 * the error names the declaration to add.
 */
const checkRegisteredConsumerTypes = (context, appDirectory) => {
  const { repoRoot, nodeCommand } = context;
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

  for (const consumer of registeredConsumers) {
    const directory = path.join(appDirectory, consumer.directory);
    const typecheck = (name, source) => {
      const file = `${name}.${consumer.name}`;
      fs.writeFileSync(path.join(directory, `${file}.ts`), source);
      fs.writeFileSync(
        path.join(directory, `tsconfig.${file}.json`),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: consumer.module,
            moduleResolution: consumer.moduleResolution,
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
          include: [`${file}.ts`],
        })
      );
      return spawnSync(nodeCommand, [tsc, '--project', `tsconfig.${file}.json`, '--listFiles'], {
        cwd: directory,
        encoding: 'utf8',
      });
    };

    const registered = typecheck('registered-types', registeredTypes(consumer.clientPath));
    assert.equal(
      registered.status,
      0,
      `registered consumer types (${consumer.name}) failed:\n${registered.stdout}${registered.stderr}`
    );
    // The program really contains the consumer file and the generated client (DESIGN.md DC-002).
    assert.match(registered.stdout, new RegExp(`registered-types\\.${consumer.name}\\.ts`));
    // tsc lists files with forward slashes on every platform.
    assert.equal(registered.stdout.includes(consumer.clientPath.replace(/^\.\//, '').replace(/\.js$/, '.ts')), true);

    const missing = typecheck('missing-declaration', missingDeclaration(consumer.clientPath));
    const output = `${missing.stdout}${missing.stderr}`;
    assert.notEqual(missing.status, 0, `registerPrismaClient without the declaration must not compile (${consumer.name})`);
    assert.match(output, new RegExp(`missing-declaration\\.${consumer.name}\\.ts\\(4,\\d+\\): error TS2345`));
    assert.equal(
      output.includes("declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }"),
      true,
      `the error must name the declaration to add (${consumer.name}):\n${output}`
    );
  }
  return registeredConsumers.map((consumer) => consumer.name);
};

module.exports = { checkConsumerTypes };
