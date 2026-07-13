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
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: { ...process.env, ...options.env },
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
  assert.equal(repo.rootPrismaClient.then, undefined);
  await repo.initializePrisma({ datasourceUrl: ${JSON.stringify(`file:${cjsDatabase}`)}, enableWAL: true });
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
  rootPrismaClient,
  shutdownPrisma,
} from 'repository_prisma';
assert.equal(typeof initializePrisma, 'function');
assert.equal(typeof PrismaInitializationError, 'function');
assert.equal(rootPrismaClient.then, undefined);
await initializePrisma({ datasourceUrl: ${JSON.stringify(`file:${esmDatabase}`)}, enableWAL: true });
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
} from 'repository_prisma';

const code: PrismaInitializationErrorCode = 'WAL_VERIFICATION_FAILED';
const diagnostic: PrismaInitializationDiagnostic = { code, cause: new Error('opt-in') };
const options: InitializePrismaOptions = {
  datasourceUrl: 'file:./consumer.db',
  enableWAL: true,
  onDiagnostic: (value) => void value.cause,
};
void initializePrisma(options);
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
