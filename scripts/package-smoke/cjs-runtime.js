const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** Runs the CJS runtime smoke: WAL, transactions, identity, read-only WAL (skipped as root or on Windows), safe failures. */
const checkCjsRuntime = (context) => {
  const { nodeCommand, temporaryRoot, consumerDirectory, run } = context;
  const cjsDatabase = path.join(temporaryRoot, 'consumer-cjs.db');
  const cjsSecret = 'cjs-secret-datasource.db';
  const walSecret = 'readonly-wal-secret.db';
  // Root ignores file permissions, so the read-only WAL case cannot fail as root.
  const readonlyWal = process.platform === 'win32'
    ? 'skipped-win32'
    : process.getuid?.() === 0 ? 'skipped-root' : 'pass';
  if (readonlyWal === 'skipped-root') {
    console.log('skip: read-only WAL case (running as root; root ignores file permissions)');
  }
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

  if (${readonlyWal === 'pass'}) {
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
    process.stdout.write('readonly-wal-ok\\n');
  }

  let unsupported;
  try {
    await repo.initializePrisma({ datasourceUrl: ${JSON.stringify(`postgresql://app:${cjsSecret}@db.example.invalid/app`)} });
  } catch (error) {
    unsupported = error;
  }
  assert.equal(unsupported instanceof repo.PrismaInitializationError, true);
  assert.equal(unsupported.code, 'UNSUPPORTED_DATASOURCE_PROVIDER');
  assert.match(unsupported.message, /supports SQLite datasources only/);
  assert.equal(String(unsupported).includes(${JSON.stringify(cjsSecret)}), false);
  await repo.shutdownPrisma();

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
  assert.equal(cjsResult.stdout.includes('readonly-wal-ok'), readonlyWal === 'pass');
  assert.equal(cjsResult.stdout.includes(cjsSecret), false);
  assert.equal(cjsResult.stderr.includes(cjsSecret), false);
  assert.equal(cjsResult.stdout.includes(walSecret), false);
  assert.equal(cjsResult.stderr.includes(walSecret), false);
  assert.equal(cjsResult.stderr.includes('prisma:error'), false);
  return { readonlyWal };
};

module.exports = { checkCjsRuntime };
