#!/bin/sh
# API-02: Linux x64, Node 24, npm 12.2.1 consumer of the packed bcf2be0 build (README npm steps). Volume /work.
npm i -g --prefix /work/npm12 npm@12.2.1 >/dev/null 2>&1; export PATH=/work/npm12/bin:$PATH
echo "## node $(node -v) (ABI $(node -p process.versions.modules)), npm $(npm -v), $(uname -sm), user $(id -un), $(date -u +%FT%TZ)"
C=/work/consumer; rm -rf $C; mkdir -p $C/prisma; cd $C || exit 1
printf '{"name":"ac002-linux","private":true}\n' > package.json
s() { echo "\$ $*"; "$@"; echo "exit=$?"; }
echo '$ npm install <packed bcf2be0 tarball>   (README: npm install repository_prisma@2)'
npm install /pack/repository_prisma-2.0.0.tgz --no-fund --no-audit 2>&1 | grep -E 'added|install-scripts +[a-z@]'
npm install -D prisma@7 --no-fund --no-audit >/dev/null 2>&1; echo "npm install -D prisma@7 exit=$?"
cp /scripts/schema.prisma prisma/; cp /scripts/prisma.config.ts /scripts/app.mjs /scripts/app.cjs /scripts/app-lazy.cjs .
npx prisma generate >/dev/null 2>&1; echo "prisma generate exit=$?"
native() { echo "native module present: $(ls node_modules/better-sqlite3/build/Release/*.node 2>/dev/null | wc -l)"; }
apps() { node app.mjs explicit; node app.cjs; node app.mjs lazy; node app-lazy.cjs; }
echo; echo "==== 1. native module missing (npm 12 blocked better-sqlite3's install script)"; native; apps
echo; echo "==== 2. README fix (npm 12+): npm install-scripts approve better-sqlite3; npm rebuild better-sqlite3"
s npm install-scripts approve better-sqlite3; s npm rebuild better-sqlite3; native; apps
