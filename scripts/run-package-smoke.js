const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'repository-prisma-package-smoke-')
);
const packDirectory = path.join(temporaryRoot, 'pack');
const consumerDirectory = path.join(temporaryRoot, 'consumer');
fs.mkdirSync(packDirectory, { recursive: true });
fs.mkdirSync(consumerDirectory, { recursive: true });

const run = (command, args, options = {}) => {
  const environment = { ...process.env, ...options.env };
  for (const key of options.unsetEnv || []) {
    delete environment[key];
  }
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: environment,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(
      `Command failed (${command} ${args.join(' ')}):\n${output}`
    );
  }
  return result;
};

const symlinkDirectory = (target, linkPath) => {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(
    target,
    linkPath,
    process.platform === 'win32' ? 'junction' : 'dir'
  );
};

try {
  const packResult = run(
    npmCommand,
    ['pack', '--json', '--pack-destination', packDirectory],
    { capture: true }
  );
  const packRecords = JSON.parse(packResult.stdout);
  assert.equal(packRecords.length, 1);
  const packRecord = packRecords[0];
  const includedPaths = new Set(packRecord.files.map((file) => file.path));
  for (const requiredPath of [
    'package.json',
    'README.md',
    'DESIGN.md',
    'CHANGELOG.md',
    'dist/index.js',
    'dist/index.mjs',
    'dist/index.d.ts',
    'dist/index.d.mts',
  ]) {
    assert.equal(includedPaths.has(requiredPath), true, `missing ${requiredPath}`);
  }
  assert.equal(
    [...includedPaths].some((filePath) => filePath.startsWith('src/')),
    false,
    'source files must not replace shipped dist coverage'
  );
  assert.equal(
    [...includedPaths].some((filePath) => filePath.startsWith('tickets/')),
    false,
    'ticket artifacts must not ship'
  );

  for (const builtPath of ['dist/index.js', 'dist/index.mjs']) {
    const builtSource = fs.readFileSync(path.join(repoRoot, builtPath), 'utf8');
    assert.equal(builtSource.includes('dotenv/config'), false, `${builtPath} must not load dotenv`);
    assert.equal(
      /\[\s*["']query["']\s*,\s*["']info["']\s*,\s*["']warn["']\s*\]/.test(builtSource),
      false,
      `${builtPath} must not retain the old query-log default`
    );
  }
  for (const declarationPath of ['dist/index.d.ts', 'dist/index.d.mts']) {
    const declarationSource = fs.readFileSync(path.join(repoRoot, declarationPath), 'utf8');
    assert.equal(
      declarationSource.includes('logQueries?: boolean'),
      true,
      `${declarationPath} must expose logQueries`
    );
    assert.equal(
      declarationSource.includes('LOGGING_POLICY_CONFLICT'),
      true,
      `${declarationPath} must expose the conflict code`
    );
    assert.equal(
      declarationSource.includes('type RunInTransactionOptions'),
      true,
      `${declarationPath} must expose RunInTransactionOptions`
    );
    for (const field of [
      'maxWait?: number',
      'timeout?: number',
      'isolationLevel?: Prisma.TransactionIsolationLevel',
    ]) {
      assert.equal(
        declarationSource.includes(field),
        true,
        `${declarationPath} must expose ${field}`
      );
    }
  }

  const tarballPath = path.join(packDirectory, packRecord.filename);
  fs.writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify({ name: 'package-smoke-consumer', private: true, type: 'module' })
  );
  run(
    npmCommand,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--legacy-peer-deps',
      tarballPath,
    ],
    { cwd: consumerDirectory }
  );

  symlinkDirectory(
    path.join(repoRoot, 'node_modules', '@prisma', 'client'),
    path.join(consumerDirectory, 'node_modules', '@prisma', 'client')
  );

  const importCanary = 'repository-prisma-import-canary';
  const importCanaryKey = 'REPOSITORY_PRISMA_IMPORT_CANARY';
  const inheritedKey = 'REPOSITORY_PRISMA_INHERITED_VALUE';
  const inheritedValue = 'repository-prisma-inherited-value';
  fs.writeFileSync(
    path.join(consumerDirectory, '.env'),
    `${importCanaryKey}=${importCanary}\n`
  );
  const cjsImportSpyFile = path.join(temporaryRoot, 'cjs-import-constructors.txt');
  const esmImportSpyFile = path.join(temporaryRoot, 'esm-import-constructors.txt');
  const constructorSpy = `
const fs = require('node:fs');
const Module = require('node:module');
const originalLoad = Module._load;
let constructors = 0;
Module._load = function(request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (request !== '@prisma/client') return loaded;
  return {
    ...loaded,
    PrismaClient: class extends loaded.PrismaClient {
      constructor(...args) {
        constructors += 1;
        super(...args);
      }
    },
  };
};
process.on('exit', () => fs.writeFileSync(process.env.CONSTRUCTOR_SPY_FILE, String(constructors)));
`;
  fs.writeFileSync(path.join(consumerDirectory, 'constructor-spy.cjs'), constructorSpy);
  const importEnvironment = {
    CONSTRUCTOR_SPY_FILE: cjsImportSpyFile,
    [inheritedKey]: inheritedValue,
  };
  const importUnsetEnvironment = [
    'DATABASE_URL',
    'DATABASE_URL_TEST',
    'PRISMA_DATASOURCE_PROVIDER',
    'PRISMA_LOG_QUERIES',
    importCanaryKey,
  ];
  const cjsImportScript = `
const assert = require('node:assert/strict');
const repo = require(${JSON.stringify(path.join(consumerDirectory, 'node_modules', 'repository_prisma', 'dist', 'index.js'))});
assert.equal(typeof repo.initializePrisma, 'function');
assert.equal(process.env[${JSON.stringify(importCanaryKey)}], undefined);
assert.equal(process.env[${JSON.stringify(inheritedKey)}], ${JSON.stringify(inheritedValue)});
assert.equal(process.env.DATABASE_URL, undefined);
assert.equal(process.env.DATABASE_URL_TEST, undefined);
process.stdout.write('cjs-import-safety-ok\\n');
`;
  fs.writeFileSync(path.join(consumerDirectory, 'cjs-import-safety.cjs'), cjsImportScript);
  const cjsImportResult = run(
    nodeCommand,
    ['--require', './constructor-spy.cjs', 'cjs-import-safety.cjs'],
    {
      cwd: consumerDirectory,
      capture: true,
      env: importEnvironment,
      unsetEnv: importUnsetEnvironment,
    }
  );
  assert.match(cjsImportResult.stdout, /cjs-import-safety-ok/);
  assert.equal(cjsImportResult.stdout.includes(importCanary), false);
  assert.equal(cjsImportResult.stderr.includes(importCanary), false);
  assert.equal(cjsImportResult.stdout.includes(inheritedValue), false);
  assert.equal(cjsImportResult.stderr.includes(inheritedValue), false);
  assert.equal(fs.readFileSync(cjsImportSpyFile, 'utf8'), '0');

  const esmImportScript = `
import assert from 'node:assert/strict';
const repo = await import(${JSON.stringify(path.join(consumerDirectory, 'node_modules', 'repository_prisma', 'dist', 'index.mjs'))});
assert.equal(typeof repo.initializePrisma, 'function');
assert.equal(process.env[${JSON.stringify(importCanaryKey)}], undefined);
assert.equal(process.env[${JSON.stringify(inheritedKey)}], ${JSON.stringify(inheritedValue)});
assert.equal(process.env.DATABASE_URL, undefined);
assert.equal(process.env.DATABASE_URL_TEST, undefined);
process.stdout.write('esm-import-safety-ok\\n');
`;
  fs.writeFileSync(path.join(consumerDirectory, 'esm-import-safety.mjs'), esmImportScript);
  const esmImportResult = run(
    nodeCommand,
    ['--require', './constructor-spy.cjs', 'esm-import-safety.mjs'],
    {
      cwd: consumerDirectory,
      capture: true,
      env: { ...importEnvironment, CONSTRUCTOR_SPY_FILE: esmImportSpyFile },
      unsetEnv: importUnsetEnvironment,
    }
  );
  assert.match(esmImportResult.stdout, /esm-import-safety-ok/);
  assert.equal(esmImportResult.stdout.includes(importCanary), false);
  assert.equal(esmImportResult.stderr.includes(importCanary), false);
  assert.equal(esmImportResult.stdout.includes(inheritedValue), false);
  assert.equal(esmImportResult.stderr.includes(inheritedValue), false);
  assert.equal(fs.readFileSync(esmImportSpyFile, 'utf8'), '0');

  const policyConstructorSpy = `
const fs = require('node:fs');
const Module = require('node:module');
const originalLoad = Module._load;
const logLevels = [];
Module._load = function(request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (request !== '@prisma/client') return loaded;
  return {
    ...loaded,
    PrismaClient: class {
      constructor(options) {
        logLevels.push(Array.isArray(options?.log) ? [...options.log] : []);
      }
      async $connect() {}
      async $disconnect() {}
      async $queryRawUnsafe() { return []; }
    },
  };
};
process.on('exit', () => fs.writeFileSync(process.env.POLICY_OPTIONS_FILE, JSON.stringify(logLevels)));
`;
  fs.writeFileSync(
    path.join(consumerDirectory, 'policy-constructor-spy.cjs'),
    policyConstructorSpy
  );
  const policyPeerStub = `
import fs from 'node:fs';
const logLevels = [];
export class PrismaClient {
  constructor(options) {
    logLevels.push(Array.isArray(options?.log) ? [...options.log] : []);
  }
  async $connect() {}
  async $disconnect() {}
  async $queryRawUnsafe() { return []; }
}
export const Prisma = { ModelName: {} };
process.on('exit', () => fs.writeFileSync(process.env.POLICY_OPTIONS_FILE, JSON.stringify(logLevels)));
`;
  fs.writeFileSync(path.join(consumerDirectory, 'policy-peer-stub.mjs'), policyPeerStub);
  fs.writeFileSync(
    path.join(consumerDirectory, 'policy-peer-loader.mjs'),
    `import { pathToFileURL } from 'node:url';
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@prisma/client') {
    return { url: pathToFileURL(process.env.POLICY_PEER_STUB).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`
  );
  const cjsPolicyScript = `
const assert = require('node:assert/strict');
const repo = require('repository_prisma');
const datasourceUrl = 'postgresql://localhost:5432/repository-prisma-synthetic';
const option = process.env.LOG_QUERY_OPTION;
const options = { datasourceUrl };
if (option !== 'unset') options.logQueries = option === 'true';
(async () => {
  if (process.env.LOG_QUERY_CASE === 'lazy-conflict') {
    assert.equal(typeof repo.rootPrismaClient.$queryRawUnsafe, 'function');
    let conflict;
    try {
      await repo.initializePrisma({ datasourceUrl, logQueries: true });
    } catch (error) {
      conflict = error;
    }
    assert.equal(conflict?.code, 'LOGGING_POLICY_CONFLICT');
    await repo.shutdownPrisma();
    await repo.initializePrisma({ datasourceUrl, logQueries: true });
  } else {
    await repo.initializePrisma(options);
  }
  await repo.shutdownPrisma();
  process.stdout.write('cjs-policy-probe-ok\\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;
  const esmPolicyScript = `
import assert from 'node:assert/strict';
import * as repo from 'repository_prisma';
const datasourceUrl = 'postgresql://localhost:5432/repository-prisma-synthetic';
const option = process.env.LOG_QUERY_OPTION;
const options = { datasourceUrl };
if (option !== 'unset') options.logQueries = option === 'true';
if (process.env.LOG_QUERY_CASE === 'lazy-conflict') {
  assert.equal(typeof repo.rootPrismaClient.$queryRawUnsafe, 'function');
  let conflict;
  try {
    await repo.initializePrisma({ datasourceUrl, logQueries: true });
  } catch (error) {
    conflict = error;
  }
  assert.equal(conflict?.code, 'LOGGING_POLICY_CONFLICT');
  await repo.shutdownPrisma();
  await repo.initializePrisma({ datasourceUrl, logQueries: true });
} else {
  await repo.initializePrisma(options);
}
await repo.shutdownPrisma();
process.stdout.write('esm-policy-probe-ok\\n');
`;
  fs.writeFileSync(path.join(consumerDirectory, 'cjs-policy.cjs'), cjsPolicyScript);
  fs.writeFileSync(path.join(consumerDirectory, 'esm-policy.mjs'), esmPolicyScript);

  const defaultLevels = ['info', 'warn', 'error'];
  const queryLevels = [...defaultLevels, 'query'];
  const policyCases = [
    { name: 'default', option: 'unset', expected: defaultLevels },
    { name: 'env-1', env: '1', option: 'unset', expected: queryLevels },
    { name: 'env-true-mixed-case-whitespace', env: ' TrUe ', option: 'unset', expected: queryLevels },
    { name: 'env-yes', env: 'yes', option: 'unset', expected: queryLevels },
    { name: 'env-on', env: 'ON', option: 'unset', expected: queryLevels },
    { name: 'env-empty', env: '', option: 'unset', expected: defaultLevels },
    { name: 'env-false', env: 'false', option: 'unset', expected: defaultLevels },
    { name: 'env-zero', env: '0', option: 'unset', expected: defaultLevels },
    { name: 'env-off', env: 'off', option: 'unset', expected: defaultLevels },
    { name: 'typed-false-over-env', env: 'true', option: 'false', expected: defaultLevels },
    { name: 'typed-true-over-env', env: 'off', option: 'true', expected: queryLevels },
  ];
  const runPolicyProbe = (format, testCase) => {
    const optionsFile = path.join(
      temporaryRoot,
      `${format}-policy-${testCase.name}.json`
    );
    const environment = {
      POLICY_OPTIONS_FILE: optionsFile,
      LOG_QUERY_OPTION: testCase.option,
    };
    const unsetEnvironment = [
      'DATABASE_URL',
      'DATABASE_URL_TEST',
      'PRISMA_DATASOURCE_PROVIDER',
      'PRISMA_LOG_QUERIES',
      'LOG_QUERY_CASE',
    ];
    if (testCase.env !== undefined) {
      environment.PRISMA_LOG_QUERIES = testCase.env;
      unsetEnvironment.splice(unsetEnvironment.indexOf('PRISMA_LOG_QUERIES'), 1);
    }
    const script = format === 'cjs' ? 'cjs-policy.cjs' : 'esm-policy.mjs';
    const marker = format === 'cjs' ? 'cjs-policy-probe-ok' : 'esm-policy-probe-ok';
    const commandArgs = format === 'cjs'
      ? ['--require', './policy-constructor-spy.cjs', script]
      : ['--no-warnings', '--experimental-loader', './policy-peer-loader.mjs', script];
    const result = run(
      nodeCommand,
      commandArgs,
      {
        cwd: consumerDirectory,
        capture: true,
        env: {
          ...environment,
          ...(format === 'esm'
            ? { POLICY_PEER_STUB: path.join(consumerDirectory, 'policy-peer-stub.mjs') }
            : {}),
        },
        unsetEnv: unsetEnvironment,
      }
    );
    assert.match(result.stdout, new RegExp(`${marker}\\n`));
    assert.equal(result.stdout.includes('repository-prisma-synthetic'), false);
    assert.equal(result.stderr.includes('repository-prisma-synthetic'), false);
    assert.equal(result.stdout.includes('prisma:query'), false);
    assert.equal(result.stderr.includes('prisma:query'), false);
    assert.equal(result.stdout.includes('SELECT'), false);
    assert.equal(result.stderr.includes('SELECT'), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(optionsFile, 'utf8')), [testCase.expected]);
  };
  for (const format of ['cjs', 'esm']) {
    for (const testCase of policyCases) {
      runPolicyProbe(format, testCase);
    }
    const optionsFile = path.join(temporaryRoot, `${format}-policy-lazy-conflict.json`);
    const script = format === 'cjs' ? 'cjs-policy.cjs' : 'esm-policy.mjs';
    const marker = format === 'cjs' ? 'cjs-policy-probe-ok' : 'esm-policy-probe-ok';
    const commandArgs = format === 'cjs'
      ? ['--require', './policy-constructor-spy.cjs', script]
      : ['--no-warnings', '--experimental-loader', './policy-peer-loader.mjs', script];
    const result = run(
      nodeCommand,
      commandArgs,
      {
        cwd: consumerDirectory,
        capture: true,
        env: {
          POLICY_OPTIONS_FILE: optionsFile,
          LOG_QUERY_OPTION: 'unset',
          LOG_QUERY_CASE: 'lazy-conflict',
          DATABASE_URL: 'postgresql://localhost:5432/repository-prisma-synthetic',
          PRISMA_LOG_QUERIES: 'off',
          ...(format === 'esm'
            ? { POLICY_PEER_STUB: path.join(consumerDirectory, 'policy-peer-stub.mjs') }
            : {}),
        },
        unsetEnv: [
          'DATABASE_URL_TEST',
          'PRISMA_DATASOURCE_PROVIDER',
        ],
      }
    );
    assert.match(result.stdout, new RegExp(`${marker}\\n`));
    assert.equal(result.stdout.includes('repository-prisma-synthetic'), false);
    assert.equal(result.stderr.includes('repository-prisma-synthetic'), false);
    assert.equal(result.stdout.includes('prisma:query'), false);
    assert.equal(result.stderr.includes('prisma:query'), false);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(optionsFile, 'utf8')),
      [defaultLevels, queryLevels]
    );
  }

  const cjsDatabase = path.join(temporaryRoot, 'consumer-cjs.db');
  const cjsSecret = 'cjs-secret-datasource.db';
  const walSecret = 'readonly-wal-secret.db';
  const cjsScript = `
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const repo = require('repository_prisma');
(async () => {
  assert.equal(typeof repo.initializePrisma, 'function');
  assert.equal(typeof repo.shutdownPrisma, 'function');
  assert.equal(typeof repo.PrismaInitializationError, 'function');
  assert.equal(typeof repo.runInTransaction, 'function');
  assert.equal(repo.rootPrismaClient.then, undefined);
  await repo.initializePrisma({ datasourceUrl: ${JSON.stringify(`file:${cjsDatabase}`)}, enableWAL: true });
  const transactionProbe = await repo.runInTransaction(
    () => repo.prisma.$queryRawUnsafe('SELECT 1 AS transaction_option_probe;'),
    { maxWait: 5_000, timeout: 10_000 }
  );
  assert.equal(Number(Object.values(transactionProbe[0])[0]), 1);
  const identity = await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA database_list;');
  const main = identity.find((row) => String(row.name).toLowerCase() === 'main');
  assert.equal(fs.realpathSync(main.file), fs.realpathSync(${JSON.stringify(cjsDatabase)}));
  const mode = await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;');
  assert.equal(String(Object.values(mode[0])[0]).toLowerCase(), 'wal');
  await repo.shutdownPrisma();

  if (process.platform !== 'win32') {
    const readonlyDirectory = path.join(${JSON.stringify(temporaryRoot)}, 'readonly-wal');
    const readonlyDatabase = path.join(readonlyDirectory, ${JSON.stringify(walSecret)});
    fs.mkdirSync(readonlyDirectory);
    await repo.initializePrisma({ datasourceUrl: 'file:' + readonlyDatabase });
    const initialMode = await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;');
    assert.equal(String(Object.values(initialMode[0])[0]).toLowerCase(), 'delete');
    await repo.shutdownPrisma();
    fs.chmodSync(readonlyDatabase, 0o444);
    fs.chmodSync(readonlyDirectory, 0o555);
    let walFailure;
    let diagnostic;
    try {
      await repo.initializePrisma({
        datasourceUrl: 'file:' + readonlyDatabase,
        enableWAL: true,
        onDiagnostic: (value) => { diagnostic = value; },
      });
    } catch (error) {
      walFailure = error;
    } finally {
      fs.chmodSync(readonlyDirectory, 0o755);
      fs.chmodSync(readonlyDatabase, 0o644);
    }
    assert.equal(walFailure instanceof repo.PrismaInitializationError, true);
    assert.equal(walFailure.code, 'WAL_ACTIVATION_FAILED');
    assert.equal('cause' in walFailure, false);
    assert.equal(diagnostic.code, 'WAL_ACTIVATION_FAILED');
    assert.equal(diagnostic.cause instanceof Error, true);
    assert.throws(
      () => repo.rootPrismaClient.user,
      (error) => error.code === 'CLIENT_NOT_READY'
    );
    await repo.shutdownPrisma();
    await repo.initializePrisma({ datasourceUrl: 'file:' + readonlyDatabase });
    const finalMode = await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;');
    assert.equal(String(Object.values(finalMode[0])[0]).toLowerCase(), 'delete');
    await repo.shutdownPrisma();
  }

  const invalid = 'file:' + path.join(${JSON.stringify(temporaryRoot)}, 'missing-parent', ${JSON.stringify(cjsSecret)});
  let failure;
  try { await repo.initializePrisma({ datasourceUrl: invalid, enableWAL: true }); } catch (error) { failure = error; }
  assert.equal(failure instanceof repo.PrismaInitializationError, true);
  assert.equal(failure.code, 'CONNECTION_FAILED');
  assert.equal('cause' in failure, false);
  assert.equal(failure.message.includes(${JSON.stringify(cjsSecret)}), false);
  await repo.shutdownPrisma();
  process.stdout.write('cjs-package-smoke-ok\\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;
  fs.writeFileSync(path.join(consumerDirectory, 'cjs-smoke.cjs'), cjsScript);
  const cjsResult = run(nodeCommand, ['cjs-smoke.cjs'], {
    cwd: consumerDirectory,
    capture: true,
  });
  assert.match(cjsResult.stdout, /cjs-package-smoke-ok/);
  assert.equal(cjsResult.stdout.includes(cjsSecret), false);
  assert.equal(cjsResult.stderr.includes(cjsSecret), false);
  assert.equal(cjsResult.stdout.includes(walSecret), false);
  assert.equal(cjsResult.stderr.includes(walSecret), false);
  assert.equal(cjsResult.stderr.includes('prisma:error'), false);

  const esmDatabase = path.join(temporaryRoot, 'consumer-esm.db');
  const esmScript = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializePrisma,
  PrismaInitializationError,
  prisma,
  rootPrismaClient,
  runInTransaction,
  shutdownPrisma,
} from 'repository_prisma';
assert.equal(typeof initializePrisma, 'function');
assert.equal(typeof PrismaInitializationError, 'function');
assert.equal(typeof runInTransaction, 'function');
assert.equal(rootPrismaClient.then, undefined);
await initializePrisma({ datasourceUrl: ${JSON.stringify(`file:${esmDatabase}`)}, enableWAL: true });
const transactionProbe = await runInTransaction(
  () => prisma.$queryRawUnsafe('SELECT 1 AS transaction_option_probe;'),
  { maxWait: 5_000, timeout: 10_000 }
);
assert.equal(Number(Object.values(transactionProbe[0])[0]), 1);
const identity = await rootPrismaClient.$queryRawUnsafe('PRAGMA database_list;');
const main = identity.find((row) => String(row.name).toLowerCase() === 'main');
assert.equal(fs.realpathSync(main.file), fs.realpathSync(${JSON.stringify(esmDatabase)}));
const mode = await rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;');
assert.equal(String(Object.values(mode[0])[0]).toLowerCase(), 'wal');
await shutdownPrisma();
process.stdout.write('esm-package-smoke-ok\\n');
`;
  fs.writeFileSync(path.join(consumerDirectory, 'esm-smoke.mjs'), esmScript);
  const esmResult = run(nodeCommand, ['esm-smoke.mjs'], {
    cwd: consumerDirectory,
    capture: true,
  });
  assert.match(esmResult.stdout, /esm-package-smoke-ok/);
  assert.equal(esmResult.stderr.includes('prisma:error'), false);

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

  console.log(
    JSON.stringify({
      result: 'pass',
      packedFiles: includedPaths.size,
      cjs: 'pass',
      esm: 'pass',
      declarations: 'pass',
      installedArtifact: 'pass',
      safeFailureOutput: 'pass',
      cleanup: temporaryRoot,
    })
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
