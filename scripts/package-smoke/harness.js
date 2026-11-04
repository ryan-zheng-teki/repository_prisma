const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;

const run = (command, args, options = {}) => {
  const environment = { ...process.env, ...options.env };
  for (const key of options.unsetEnv || []) {
    delete environment[key];
  }
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: environment,
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

const filesWithQueryInName = (directory) =>
  fs
    .readdirSync(directory, { recursive: true })
    .map(String)
    .filter((entry) => entry.includes('?'));

/** Creates the smoke's temporary root with its `pack` and `consumer` directories. */
const createSmokeContext = () => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repository-prisma-package-smoke-')
  );
  const packDirectory = path.join(temporaryRoot, 'pack');
  const consumerDirectory = path.join(temporaryRoot, 'consumer');
  fs.mkdirSync(packDirectory, { recursive: true });
  fs.mkdirSync(consumerDirectory, { recursive: true });
  return {
    repoRoot,
    npmCommand,
    nodeCommand,
    temporaryRoot,
    packDirectory,
    consumerDirectory,
    run,
    symlinkDirectory,
    filesWithQueryInName,
  };
};

module.exports = { createSmokeContext };
