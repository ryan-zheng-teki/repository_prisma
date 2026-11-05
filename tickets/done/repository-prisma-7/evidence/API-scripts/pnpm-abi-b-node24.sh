#!/bin/sh
# API-04b part 2: the same pnpm project run under Node 24 (ABI 137); three copies, three rebuild commands.
echo "## node $(node -v) (ABI $(node -p process.versions.modules)), bundled npm $(npm -v), $(uname -sm), user $(id -un), $(date -u +%FT%TZ)"
npm i -g --prefix /work/npm12 npm@12.2.1 >/dev/null 2>&1
cd /work && rm -rf pc-npm11 pc-pnpm && cp -a pc pc-npm11 && cp -a pc pc-pnpm
apps() { node app.mjs explicit; node app.cjs; node app.mjs lazy; }
echo; echo "==== 3. module built under Node 22 (ABI 127), running Node $(node -v)"; cd /work/pc; apps
echo; echo "==== 4a. README fix as written, npm 12 (npm latest): npm rebuild better-sqlite3"
echo "\$ npm rebuild better-sqlite3   (npm $(/work/npm12/bin/npm -v))"; /work/npm12/bin/npm rebuild better-sqlite3 2>&1 | tail -3; echo "exit=$?"; apps
echo; echo "==== 4b. README fix as written, Node 24's bundled npm: npm rebuild better-sqlite3"
cd /work/pc-npm11; echo "\$ npm rebuild better-sqlite3   (npm $(npm -v))"; npm rebuild better-sqlite3 2>&1 | tail -3; echo "exit=$?"; apps
echo; echo "==== 4c. pnpm's own command: pnpm rebuild better-sqlite3"
cd /work/pc-pnpm; echo "\$ pnpm rebuild better-sqlite3   (pnpm $(/work/pnpm/bin/pnpm -v))"; /work/pnpm/bin/pnpm rebuild better-sqlite3 2>&1 | tail -3; echo "exit=$?"; apps
