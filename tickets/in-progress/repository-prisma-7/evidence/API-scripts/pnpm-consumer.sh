#!/bin/sh
# API-04: pnpm consumer of the packed bcf2be0 build following the README pnpm steps; then a wrong-ABI run.
# Usage: pnpm-consumer.sh <pnpm-bin-dir> <consumer-dir>
PB="$1"; C="$2"; S=/tmp/rp7e/scripts; N22=$(dirname $(which node)); N25=/opt/homebrew/opt/node@25/bin
export PATH=$PB:$PATH
echo "## pnpm $(pnpm -v), node $(node -v) (ABI $(node -p process.versions.modules)); Node 25: $($N25/node -v) (ABI $($N25/node -p process.versions.modules)); $(uname -sm); $(date -u +%FT%TZ)"
rm -rf $C; mkdir -p $C/prisma; cd $C || exit 1
printf '{"name":"ac002-pnpm","private":true}\n' > package.json
s() { echo "\$ $*"; "$@"; echo "exit=$?"; }
echo '$ pnpm add <packed bcf2be0 tarball> @prisma/client@7   (README: pnpm add repository_prisma@2 @prisma/client@7)'
pnpm add /tmp/rp7e/pack/repository_prisma-2.0.0.tgz @prisma/client@7 2>&1 | grep -E 'repository_prisma|@prisma/client|IGNORED|Ignored'
pnpm add -D prisma@7 >/dev/null 2>&1; echo "pnpm add -D prisma@7 exit=$? (ERR_PNPM_IGNORED_BUILDS expected)"
cp $S/schema.prisma prisma/; cp $S/prisma.config.ts $S/app.mjs $S/app.cjs $S/app-lazy.cjs .
npx prisma generate >/dev/null 2>&1; echo "prisma generate exit=$?"
echo "better-sqlite3 hoisted at node_modules/better-sqlite3: $([ -e node_modules/better-sqlite3 ] && echo yes || echo no)"
native() { echo "native module present: $(ls node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/*.node 2>/dev/null | wc -l | tr -d ' ') ($(ls -l node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>/dev/null | awk '{print $6, $7, $8}'))"; }
apps() { "$1"/node app.mjs explicit; "$1"/node app.cjs; "$1"/node app.mjs lazy; }
echo; echo "==== 1. native module missing (pnpm ignored better-sqlite3's build), Node 22"; native; apps $N22
echo; echo "==== 2. README fix (pnpm 11+): pnpm approve-builds better-sqlite3"; s pnpm approve-builds better-sqlite3; native; apps $N22
echo; echo "==== 3. module built for Node 22 (ABI 127), running Node 25 (ABI 141)"; apps $N25
echo; echo "==== 4. README fix as written: npm rebuild better-sqlite3 (under Node 25, npm $($N25/npm -v))"
echo '$ npm rebuild better-sqlite3'; PATH=$N25:$PATH npm rebuild better-sqlite3 2>&1 | tail -3; echo "exit=$?"; native; apps $N25
echo; echo "==== 5. control: pnpm rebuild better-sqlite3 (under Node 25)"
echo '$ pnpm rebuild better-sqlite3'; PATH=$N25:$PATH pnpm rebuild better-sqlite3 2>&1 | tail -3; echo "exit=$?"; native; apps $N25
