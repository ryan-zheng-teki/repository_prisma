const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const testDbUrl = process.env.DATABASE_URL_TEST || 'file:./test.db';
const env = { ...process.env, DATABASE_URL: testDbUrl };

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
run(npxCmd, ['vitest']);
