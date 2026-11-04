#!/bin/sh
# README pnpm consumer journey on the published package. Usage: consumer-pnpm.sh <dir> <probes-dir> <exclude:0|1> <approve:0|1>
D="$1"; PR="$2"; EXCL="$3"; APPROVE="$4"
echo "## pnpm $(pnpm --version), node $(node -v), $(uname -sm); exclude-release-age=$EXCL approve=$APPROVE; $(date -u +%FT%TZ)"
rm -rf "$D"; mkdir -p "$D/prisma"; cd "$D" || exit 1
printf '{ "name": "consumer", "version": "1.0.0", "private": true }\n' > package.json
if [ "$EXCL" = 1 ]; then printf '# test-environment-only (not a README step): 2.0.0 is newer than pnpm'"'"'s default minimum release age\nminimumReleaseAgeExclude:\n  - repository_prisma@2.0.0\n' > pnpm-workspace.yaml; cat pnpm-workspace.yaml; fi
s() { echo "\$ $*"; "$@"; echo "exit=$?"; }
s pnpm add repository_prisma @prisma/client@7
s pnpm add -D prisma@7
[ "$APPROVE" = 1 ] && s pnpm approve-builds better-sqlite3
echo "--- pnpm-workspace.yaml after:"; cat pnpm-workspace.yaml 2>/dev/null
cp "$PR/consumer-schema.prisma" prisma/schema.prisma; cp "$PR/consumer-prisma.config.ts" prisma.config.ts; cp "$PR/consumer-app.mjs" app.mjs
s npx prisma generate
echo "native module: $(ls node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>&1)"
s node app.mjs
echo "versions: $(pnpm list --depth 0 2>/dev/null | grep -E 'repository_prisma|@prisma/client|prisma ' | tr -s ' \n' ' ')"
