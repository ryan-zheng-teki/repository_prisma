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
  checkRegisteredConsumerTypes(context, prismaClientConsumer);
};

const registeredTypes = `import * as generated from './esm/generated/prisma/client.js';
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

const missingDeclaration = `import * as generated from './esm/generated/prisma/client.js';
import { registerPrismaClient } from 'repository_prisma';

registerPrismaClient(generated);
`;

/**
 * Type-checks consumers on the prisma-client generator (AC-006, AC-013): with the declaration the
 * registered types are enforced; without it, the registerPrismaClient call fails to compile and
 * the error names the declaration to add.
 */
const checkRegisteredConsumerTypes = (context, appDirectory) => {
  const { repoRoot, nodeCommand } = context;
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  const typecheck = (name, source) => {
    fs.writeFileSync(path.join(appDirectory, `${name}.ts`), source);
    fs.writeFileSync(
      path.join(appDirectory, `tsconfig.${name}.json`),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: [`${name}.ts`],
      })
    );
    return spawnSync(nodeCommand, [tsc, '--project', `tsconfig.${name}.json`, '--listFiles'], {
      cwd: appDirectory,
      encoding: 'utf8',
    });
  };

  const registered = typecheck('registered-types', registeredTypes);
  assert.equal(registered.status, 0, `registered consumer types failed:\n${registered.stdout}${registered.stderr}`);
  // The program really contains the consumer file and the generated client (DESIGN.md DC-002).
  assert.match(registered.stdout, /registered-types\.ts/);
  assert.match(registered.stdout, /esm[\\/]generated[\\/]prisma[\\/]client\.ts/);

  const missing = typecheck('missing-declaration', missingDeclaration);
  const output = `${missing.stdout}${missing.stderr}`;
  assert.notEqual(missing.status, 0, 'registerPrismaClient without the declaration must not compile');
  assert.match(output, /missing-declaration\.ts\(4,\d+\): error TS2345/);
  assert.equal(
    output.includes("declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }"),
    true,
    `the error must name the declaration to add:\n${output}`
  );
};

module.exports = { checkConsumerTypes };
