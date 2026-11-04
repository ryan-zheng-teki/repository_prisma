const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** Packs the package and checks the packed file list, the built `dist` text and the declarations. */
const checkPackedArtifact = (context) => {
  const { repoRoot, npmCommand, packDirectory, run } = context;
  const packResult = run(
    npmCommand,
    ['pack', '--json', '--pack-destination', packDirectory],
    { capture: true }
  );
  // `npm pack` runs the `prepare` script (prisma generate), whose output precedes the JSON.
  const packRecords = JSON.parse(packResult.stdout.slice(packResult.stdout.search(/^\[/m)));
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
    for (const bundledMarker of ['better_sqlite3.node', 'Dynamic require of', 'PrismaBetterSqlite3Adapter']) {
      assert.equal(
        builtSource.includes(bundledMarker),
        false,
        `${builtPath} must not bundle the driver adapter or better-sqlite3 (${bundledMarker})`
      );
    }
  }
  assert.match(
    fs.readFileSync(path.join(repoRoot, 'dist/index.js'), 'utf8'),
    /require\(["']@prisma\/adapter-better-sqlite3["']\)/,
    'dist/index.js must require the driver adapter as an external peer'
  );
  assert.match(
    fs.readFileSync(path.join(repoRoot, 'dist/index.mjs'), 'utf8'),
    /from\s*["']@prisma\/adapter-better-sqlite3["']/,
    'dist/index.mjs must import the driver adapter as an external peer'
  );
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
      declarationSource.includes('UNSUPPORTED_DATASOURCE_PROVIDER'),
      true,
      `${declarationPath} must expose the unsupported-provider code`
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
  return { includedPaths, tarballPath };
};

module.exports = { checkPackedArtifact };
