const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** Runs the ESM runtime smoke and checks that no file is named after a URL query string. */
const checkEsmRuntime = (context) => {
  const { nodeCommand, temporaryRoot, consumerDirectory, run, filesWithQueryInName } = context;
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
await initializePrisma({ datasourceUrl: ${JSON.stringify(`file:${esmDatabase}?connection_limit=1`)}, enableWAL: true });
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
  assert.deepEqual(
    filesWithQueryInName(temporaryRoot),
    [],
    'no smoke step may create a database file named after a URL query string'
  );
};

module.exports = { checkEsmRuntime };
