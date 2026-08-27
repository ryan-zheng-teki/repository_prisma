const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const nodeCommand = process.execPath;
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'repository-prisma-esm-cjs-interop-')
);
const consumerDirectory = path.join(temporaryRoot, 'consumer');
const packageDirectory = path.join(consumerDirectory, 'node_modules', 'repository_prisma');
const peerDirectory = path.join(consumerDirectory, 'node_modules', '@prisma', 'client');
const peerPath = path.join(peerDirectory, 'index.js');
const probePath = path.join(consumerDirectory, 'esm-consumer.mjs');

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(
      `Command failed (${command} ${args.join(' ')}):\n${output}`
    );
  }
  return result;
};

try {
  const esmEntryPath = path.join(repoRoot, 'dist', 'index.mjs');
  assert.equal(fs.existsSync(esmEntryPath), true, 'build dist/index.mjs before running this probe');

  const emittedEsm = fs.readFileSync(esmEntryPath, 'utf8');
  assert.doesNotMatch(
    emittedEsm,
    /import\s*\{[^}]*\b(?:Prisma|PrismaClient)\b[^}]*\}\s*from\s*["']@prisma\/client["']/,
    'ESM must not use named runtime imports from the CommonJS Prisma peer'
  );

  fs.mkdirSync(consumerDirectory, { recursive: true });
  fs.cpSync(path.join(repoRoot, 'dist'), path.join(packageDirectory, 'dist'), {
    recursive: true,
  });
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(packageDirectory, 'package.json'));
  fs.writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify({ name: 'repository-prisma-esm-cjs-interop-consumer', private: true, type: 'module' })
  );

  // Keep the peer properties behind dynamic object assignment so Node cannot
  // synthesize them as ESM named exports from CommonJS source text.
  fs.mkdirSync(peerDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(peerDirectory, 'package.json'),
    JSON.stringify({ name: '@prisma/client', version: '5.22.0', main: 'index.js' })
  );
  fs.writeFileSync(
    peerPath,
    `class SyntheticPrismaClient {\n` +
      `  async $connect() {}\n` +
      `  async $disconnect() {}\n` +
      `}\n` +
      `const modelNames = { User: 'User', Post: 'Post' };\n` +
      `const runtimePeer = {\n` +
      `  PrismaClient: SyntheticPrismaClient,\n` +
      `  Prisma: { ModelName: modelNames },\n` +
      `};\n` +
      `module.exports = runtimePeer;\n`
  );
  fs.writeFileSync(
    probePath,
    `import assert from 'node:assert/strict';\n` +
      `import * as repository from 'repository_prisma';\n` +
      `assert.equal(typeof repository.initializePrisma, 'function');\n` +
      `assert.equal(repository.Models.User, 'User');\n` +
      `await repository.initializePrisma({ datasourceUrl: 'postgresql://localhost:5432/repository-prisma-synthetic' });\n` +
      `await repository.shutdownPrisma();\n` +
      `process.stdout.write('esm-dynamic-cjs-peer-ok\\n');\n`
  );

  const result = run(
    nodeCommand,
    [probePath],
    { cwd: consumerDirectory }
  );
  assert.match(result.stdout, /esm-dynamic-cjs-peer-ok\n/);
  assert.equal(result.stdout.includes('does not provide an export named'), false);
  assert.equal(result.stderr.includes('does not provide an export named'), false);

  console.log(
    JSON.stringify({
      result: 'pass',
      emittedEsmNamedImports: 'absent',
      dynamicCommonJsPeer: 'pass',
      packageExportsImport: 'pass',
      cleanup: temporaryRoot,
    })
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
