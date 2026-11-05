// Checks which files each typecheck program compiles (DESIGN.md DC-002). A passing `tsc` proves
// nothing about files outside its program, so this fails unless every file in the registered
// folders is in the registered program and none is in the default program.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const registeredFolders = ['examples/prisma-client-generator', 'src/tests/prisma-client-generator'];
const programs = {
  default: 'tsconfig.json',
  registered: 'tsconfig.prisma-client-generator.json',
};

const normalize = (filePath) => path.resolve(repoRoot, filePath).split(path.sep).join('/');

const listProgramFiles = (config) => {
  const result = spawnSync(process.execPath, [tsc, '-p', config, '--listFilesOnly'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `tsc --listFilesOnly -p ${config} failed:\n${result.stdout}${result.stderr}`);
  return new Set(result.stdout.split(/\r?\n/).filter(Boolean).map(normalize));
};

const filesIn = (folder) =>
  fs
    .readdirSync(path.join(repoRoot, folder), { recursive: true })
    .map(String)
    .filter((entry) => /\.tsx?$/.test(entry))
    .map((entry) => normalize(path.join(folder, entry)));

const defaultFiles = listProgramFiles(programs.default);
const registeredFiles = listProgramFiles(programs.registered);
const summary = {};

for (const folder of registeredFolders) {
  assert.equal(fs.existsSync(path.join(repoRoot, folder)), true, `${folder} is missing`);
  const files = filesIn(folder);
  // An empty or renamed folder would make the checks below pass without checking anything.
  assert.notEqual(files.length, 0, `${folder} has no TypeScript files`);
  for (const file of files) {
    assert.equal(registeredFiles.has(file), true, `${file} is not in ${programs.registered}`);
    assert.equal(defaultFiles.has(file), false, `${file} must not be in ${programs.default}`);
  }
  summary[folder] = files.length;
}

console.log(JSON.stringify({ result: 'pass', registeredProgramFiles: summary }));
