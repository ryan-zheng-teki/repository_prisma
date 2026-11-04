const fs = require('node:fs');
const path = require('node:path');

/** Installs the packed tarball into the consumer and links the Prisma peers from the repository. */
const installConsumer = (context, { tarballPath }) => {
  const { repoRoot, npmCommand, consumerDirectory, run, symlinkDirectory } = context;
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

  // The peers resolve their own dependencies from their real paths in the repository.
  for (const peer of ['client', 'adapter-better-sqlite3']) {
    symlinkDirectory(
      path.join(repoRoot, 'node_modules', '@prisma', peer),
      path.join(consumerDirectory, 'node_modules', '@prisma', peer)
    );
  }
};

module.exports = { installConsumer };
