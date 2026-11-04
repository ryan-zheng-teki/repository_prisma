const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** Checks that importing the CJS and ESM entries loads no `.env`, builds no client and loads no native addon. */
const checkImportSafety = (context) => {
  const { nodeCommand, temporaryRoot, consumerDirectory, run } = context;
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
let nativeAddons = 0;
const originalDlopen = process.dlopen;
process.dlopen = function(...args) {
  nativeAddons += 1;
  return originalDlopen.apply(this, args);
};
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
process.on('exit', () => {
  fs.writeFileSync(process.env.CONSTRUCTOR_SPY_FILE, String(constructors));
  fs.writeFileSync(process.env.CONSTRUCTOR_SPY_FILE + '.native', String(nativeAddons));
});
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
  assert.equal(fs.readFileSync(`${cjsImportSpyFile}.native`, 'utf8'), '0', 'CJS import must not load a native addon');

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
  assert.equal(fs.readFileSync(`${esmImportSpyFile}.native`, 'utf8'), '0', 'ESM import must not load a native addon');
};

module.exports = { checkImportSafety };
