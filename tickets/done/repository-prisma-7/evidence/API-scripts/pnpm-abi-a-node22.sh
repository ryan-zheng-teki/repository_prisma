#!/bin/sh
# API-04b part 1: pnpm 12.16.1 project built under Node 22 (README pnpm steps, packed bcf2be0 build).
npm i -g --prefix /work/pnpm pnpm@12.16.1 >/dev/null 2>&1; export PATH=/work/pnpm/bin:$PATH
echo "## node $(node -v) (ABI $(node -p process.versions.modules)), pnpm $(pnpm -v), $(uname -sm), user $(id -un), $(date -u +%FT%TZ)"
C=/work/pc; rm -rf $C; mkdir -p $C/prisma; cd $C || exit 1
printf '{"name":"ac002-pnpm-abi","private":true}\n' > package.json
pnpm add /pack/repository_prisma-2.0.0.tgz @prisma/client@7 >/dev/null 2>&1; echo "pnpm add exit=$? (ERR_PNPM_IGNORED_BUILDS expected)"
pnpm add -D prisma@7 >/dev/null 2>&1; echo "pnpm add -D prisma@7 exit=$?"
echo '$ pnpm approve-builds better-sqlite3'; pnpm approve-builds better-sqlite3 2>&1 | tail -2; echo "exit=$?"
cp /scripts/schema.prisma prisma/; cp /scripts/prisma.config.ts /scripts/app.mjs /scripts/app.cjs /scripts/app-lazy.cjs .
npx prisma generate >/dev/null 2>&1; echo "prisma generate exit=$?"
echo "better-sqlite3 hoisted: $([ -e node_modules/better-sqlite3 ] && echo yes || echo no)"
node app.mjs explicit; node app.cjs
