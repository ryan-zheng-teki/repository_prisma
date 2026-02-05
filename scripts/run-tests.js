const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const normalizeDatabaseUrl = (url) => {
  if (!url.startsWith('file:')) {
    return url;
  }

  const rawPath = url.slice('file:'.length);
  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(repoRoot, rawPath);

  return pathToFileURL(filePath).href;
};

const testDbUrl = process.env.DATABASE_URL_TEST || 'file:./test.db';
const env = {
  ...process.env,
  DATABASE_URL: normalizeDatabaseUrl(testDbUrl),
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(npxCmd, ['prisma', 'db', 'push', '--skip-generate']);
run(npxCmd, ['prisma', 'generate']);
run(npxCmd, ['vitest']);
