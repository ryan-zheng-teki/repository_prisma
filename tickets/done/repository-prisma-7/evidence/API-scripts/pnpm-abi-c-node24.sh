#!/bin/sh
# API-04b part 3 (rerun): fresh copies of the Node-22-built pnpm project under Node 24; 4a with full npm 12 output; 4c with the tarball mounted.
echo "## node $(node -v) (ABI $(node -p process.versions.modules)), $(uname -sm), user $(id -un), $(date -u +%FT%TZ)"
cd /work && rm -rf pc-npm12b pc-pnpm2 && cp -a pc pc-npm12b && cp -a pc pc-pnpm2
apps() { node app.mjs explicit; node app.cjs; node app.mjs lazy; }
echo; echo "==== 4a (rerun, full output). npm rebuild better-sqlite3 with npm 12"
cd /work/pc-npm12b; echo "\$ npm rebuild better-sqlite3   (npm $(/work/npm12/bin/npm -v))"; /work/npm12/bin/npm rebuild better-sqlite3 2>&1 | grep -v 'npm notice'; echo "exit=$?"
echo "build/Release/better_sqlite3.node built for ABI: $(node -e "try{process.dlopen({exports:{}},require('path').resolve('node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node'));console.log('loads under '+process.versions.modules)}catch(e){console.log('does not load: '+e.code)}")"
apps
echo; echo "==== 4c (rerun). pnpm rebuild better-sqlite3"
cd /work/pc-pnpm2; echo "\$ pnpm rebuild better-sqlite3   (pnpm $(/work/pnpm/bin/pnpm -v))"; /work/pnpm/bin/pnpm rebuild better-sqlite3 2>&1 | tail -4; echo "exit=$?"; apps
