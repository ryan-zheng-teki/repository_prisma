#!/bin/bash
# Fresh registry consumers of repository_prisma (README "Requirements and Setup" only, pinned @2).
# Usage: registry-consumers.sh <npm12|pnpm11> <work-dir>
set -u
MODE="$1"; WORK="$2"; S=/tmp/rel211-scripts
unset DATABASE_URL DATABASE_URL_TEST
case $MODE in
  npm12) export PATH=/tmp/rel211-tools/npm12/node_modules/.bin:$PATH ;;
  pnpm11) export PATH=/tmp/rel211-tools/pnpm11/node_modules/.bin:$PATH ;;
esac
if [ -n "${FRESH_PNPM_CACHE:-}" ]; then
  rm -rf "$FRESH_PNPM_CACHE" && mkdir -p "$FRESH_PNPM_CACHE"
  export pnpm_config_cache_dir="$FRESH_PNPM_CACHE"
  echo "# isolated empty pnpm metadata cache: $FRESH_PNPM_CACHE"
fi
rm -rf "$WORK" && mkdir -p "$WORK/prisma" && cd "$WORK" || exit 1
printf '{"name":"rel211-%s","private":true}\n' "$MODE" > package.json
if [ -n "${TEST_EXCLUDE:-}" ]; then
  printf 'minimumReleaseAgeExclude:\n  - %s\n' "$TEST_EXCLUDE" > pnpm-workspace.yaml
  echo "# test-only (TESTING.md): pre-created pnpm-workspace.yaml with minimumReleaseAgeExclude: $TEST_EXCLUDE"
fi
echo "# $MODE consumer; node $(node -v); npm $(npm -v); $( [ $MODE = pnpm11 ] && echo "pnpm $(pnpm -v)"); $(uname -sm); user $(id -un) uid $(id -u); $(date -u +%FT%TZ)"
step() { echo; echo "\$ $*"; "$@" 2>&1 | grep -vE "^\s*$" | tail -12; rc=${PIPESTATUS[0]}; echo "exit=$rc"; }
if [ $MODE = npm12 ]; then
  step npm install repository_prisma@2 --no-fund
  step npm install -D prisma@7 --no-fund
  step npm install-scripts approve better-sqlite3
  step npm rebuild better-sqlite3
else
  step pnpm add repository_prisma@2 @prisma/client@7
  step pnpm add -D prisma@7
  step pnpm approve-builds better-sqlite3
  echo "--- pnpm-workspace.yaml"; cat pnpm-workspace.yaml 2>/dev/null
fi
echo "installed repository_prisma: $(node -p "require('./node_modules/repository_prisma/package.json').version")"
echo "uuid installed: $([ -e node_modules/uuid ] && echo yes || echo no)"
cat > prisma/schema.prisma <<'SCHEMA'
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}

model Event {
  id         Int      @id @default(autoincrement())
  label      String
  occurredAt DateTime
  createdAt  DateTime @default(now())
}
SCHEMA
cat > prisma.config.ts <<'CONFIG'
// prisma.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
CONFIG
step npx prisma generate
step env DATABASE_URL=file:./app.db npx prisma db push
cp $S/app.mjs $S/app.cjs $S/lazy.mjs $S/lazy.cjs .
grep -l "adapter-better-sqlite3" app.* lazy.* 2>/dev/null || echo "no adapter import in consumer code"
echo; echo '$ node app.mjs'; node app.mjs | tail -1; echo "exit=${PIPESTATUS[0]}"
rm -f app.db app.db-journal; DATABASE_URL=file:./app.db npx prisma db push >/dev/null 2>&1
echo; echo '$ node app.cjs'; node app.cjs | tail -1; echo "exit=${PIPESTATUS[0]}"
echo; echo '$ DATABASE_URL=file:./app.db node lazy.mjs'; DATABASE_URL=file:./app.db node lazy.mjs; echo "exit=$?"
echo '$ DATABASE_URL=file:./app.db node lazy.cjs'; DATABASE_URL=file:./app.db node lazy.cjs; echo "exit=$?"
echo '$ DATABASE_URL=postgresql://... node lazy.mjs'; DATABASE_URL=postgresql://app_user:s3cr3t-pw@db.internal.example:5432/appdb node lazy.mjs; echo "exit=$?"
echo "DONE"
