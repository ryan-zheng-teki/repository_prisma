const fs = require('node:fs');
const path = require('node:path');

/** Type-checks a consumer TypeScript file against the installed declarations. */
const checkConsumerTypes = (context) => {
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
};

module.exports = { checkConsumerTypes };
