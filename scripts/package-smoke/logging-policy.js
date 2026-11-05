const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** Checks the query-logging policy matrix (environment flag, typed option, lazy conflict) in CJS and ESM. */
const checkLoggingPolicy = (context) => {
  const { nodeCommand, temporaryRoot, consumerDirectory, run } = context;
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
  // Both builds load `@prisma/client` through a CommonJS require (the ESM build through
  // `createRequire`), so this one `Module._load` spy covers both formats.
  fs.writeFileSync(
    path.join(consumerDirectory, 'policy-constructor-spy.cjs'),
    policyConstructorSpy
  );
  const spyArguments = ['--require', './policy-constructor-spy.cjs'];
  const cjsPolicyScript = `
const assert = require('node:assert/strict');
const repo = require('repository_prisma');
const datasourceUrl = 'file:repository-prisma-synthetic?mode=memory';
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
const datasourceUrl = 'file:repository-prisma-synthetic?mode=memory';
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
    const result = run(
      nodeCommand,
      [...spyArguments, script],
      {
        cwd: consumerDirectory,
        capture: true,
        env: environment,
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
    const result = run(
      nodeCommand,
      [...spyArguments, script],
      {
        cwd: consumerDirectory,
        capture: true,
        env: {
          POLICY_OPTIONS_FILE: optionsFile,
          LOG_QUERY_OPTION: 'unset',
          LOG_QUERY_CASE: 'lazy-conflict',
          DATABASE_URL: 'file:repository-prisma-synthetic?mode=memory',
          PRISMA_LOG_QUERIES: 'off',
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
};

module.exports = { checkLoggingPolicy };
