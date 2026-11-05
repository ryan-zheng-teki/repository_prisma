#!/bin/bash
# API-06 / API-07 / API-08 journey: an npm-workspaces monorepo on the prisma-client generator,
# built from the packed tarball (TESTING.md "Choosing The Layer": no --legacy-peer-deps, README setup).
# Usage: run.sh <tarball> <work-root>   (the work root is created and owned by this run)
# Every step prints "$ <command>" and "exit=<code>"; expected failures are marked EXPECT-FAIL.
set -u
TARBALL=$1
ROOT=$2
PROBE=$(cd "$(dirname "$0")" && pwd)

step() { echo; echo "\$ $*"; "$@"; echo "exit=$?"; }

rm -rf "$ROOT/mono" "$ROOT/ts54"
mkdir -p "$ROOT/pack"
[ "$TARBALL" = "$ROOT/pack/repository_prisma-2.0.0.tgz" ] || cp "$TARBALL" "$ROOT/pack/"
cp -R "$PROBE/mono" "$ROOT/mono"
cd "$ROOT/mono" || exit 1
DB="$ROOT/mono/app.db"
export DATABASE_URL="file:$DB"
export APP_DATABASE_URL="file:$DB"

echo "================ API-07 install (npm workspaces, no --legacy-peer-deps)"
step npm install --no-audit --no-fund
echo "--- repository_prisma copies (expect one, hoisted):"
find . -path '*/node_modules/repository_prisma/package.json' -not -path './node_modules/.cache/*'
echo "--- @prisma/client prisma-client-js output present? (expect no .prisma/client):"
ls node_modules/.prisma/client 2>&1 | head -1

echo; echo "================ API-07 generate, push, build @acme/db (nodenext, declarations)"
cd packages/db
step npx prisma generate
step npx prisma db push
step npx tsc -p tsconfig.json
echo "--- declaration emitted by @acme/db (dist/index.d.ts):"
cat dist/index.d.ts
echo; echo "--- AC-013 control: README db.ts without the declare module block. EXPECT-FAIL with TS2345 naming the declaration"
step npx tsc -p tsconfig.controls.json
cd ../..

echo; echo "================ API-07 apps/api (ESM, nodenext, compiled): types from @acme/db's declaration"
cd apps/api
step npx tsc -p tsconfig.json --listFiles
echo; echo "--- control: same @ts-expect-error lines without importing @acme/db. EXPECT-FAIL with TS2578 (unused) on each"
step npx tsc -p tsconfig.no-db-import.json
echo; echo "--- run the app (WAL, repositories, transaction with isolation level, rollback, @Transactional rollback, Models)"
step node dist/main.js
echo; echo "================ API-08 load order"
echo "--- Models.User read in a module evaluated before @acme/db. EXPECT-FAIL with PRISMA_CLIENT_UNAVAILABLE"
step node dist/wrong-order.js
echo; echo "--- README naming (Prisma.ModelName / BaseRepository<'X'>) in the same import order"
step node dist/readme-order.js
cd ../..

echo; echo "================ API-07 apps/worker (moduleResolution bundler, @acme/db source condition, esbuild bundle)"
cd apps/worker
step npx tsc -p tsconfig.json --listFiles
step npx esbuild src/main.ts --bundle --platform=node --format=esm --target=node20 --conditions=source \
  --external:@prisma/client --external:@prisma/adapter-better-sqlite3 --external:better-sqlite3 \
  --outfile=dist/main.mjs --log-level=warning
echo "--- repository_prisma and @acme/db are inside the bundle (expect markers > 0):"
echo "registerPrismaClient occurrences: $(grep -c 'registerPrismaClient' dist/main.mjs)"
echo "PRISMA_CLIENT_CONFLICT occurrences: $(grep -c 'PRISMA_CLIENT_CONFLICT' dist/main.mjs)"
step node dist/main.mjs
cd ../..

echo; echo "================ API-06 TypeScript 5.4 (QR-002 lower bound)"
mkdir -p "$ROOT/ts54" && cd "$ROOT/ts54" && echo '{"private":true}' > package.json
step npm install --no-audit --no-fund typescript@5.4
TSC54="$ROOT/ts54/node_modules/typescript/bin/tsc"
step node "$TSC54" -v
cd "$ROOT/mono/packages/db"
step node "$TSC54" -p tsconfig.json --noEmit
echo "--- EXPECT-FAIL with TS2345 naming the declaration"
step node "$TSC54" -p tsconfig.controls.json
cd "$ROOT/mono/apps/api"
step node "$TSC54" -p tsconfig.json --noEmit
echo "--- EXPECT-FAIL with TS2578 (unused @ts-expect-error)"
step node "$TSC54" -p tsconfig.no-db-import.json
cd "$ROOT/mono/apps/worker"
step node "$TSC54" -p tsconfig.json
echo; echo "ALL-STEPS-RAN"
