#!/bin/sh
# Fresh consumer following ONLY the README "Requirements and Setup (Prisma 7)" section.
# Usage: consumer-setup.sh <tarball> <consumer-dir> <module|commonjs> <scripts-dir>
set -u
TGZ="$1"; DIR="$2"; TYPE="$3"; SCRIPTS="$4"
echo "# consumer-setup: dir=$DIR type=$TYPE node=$(node -v) npm=$(npm -v) os=$(uname -sm) date=$(date -u +%FT%TZ)"
unset DATABASE_URL DATABASE_URL_TEST
rm -rf "$DIR" && mkdir -p "$DIR/prisma" && cd "$DIR" || exit 1
npm init -y >/dev/null && npm pkg set type="$TYPE" && echo "package type: $(npm pkg get type)"
echo "npm config legacy-peer-deps=$(npm config get legacy-peer-deps)"
step() { echo; echo "\$ $*"; "$@"; rc=$?; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc; }
# README: npm install repository_prisma (here: the packed tarball of this branch) ; npm install -D prisma@7
step npm install "$TGZ"
step npm install -D prisma@7
step npm ls repository_prisma @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3 prisma
# README schema snippet verbatim + the consumer's own models
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
# README prisma.config.ts snippet verbatim
cat > prisma.config.ts <<'CONFIG'
// prisma.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
CONFIG
# README: npx prisma generate (no DATABASE_URL set, as a reader following the README would run it)
step npx prisma generate
# Table creation is the consumer's normal Prisma workflow (not part of the README section)
step env DATABASE_URL=file:./app.db npx prisma db push
echo "grep for adapter imports in consumer code (expect none):"
cp "$SCRIPTS"/app.* "$SCRIPTS"/lazy.* "$DIR"/ 2>/dev/null
grep -l "adapter-better-sqlite3" "$DIR"/app.* "$DIR"/lazy.* 2>/dev/null || echo "no adapter import in consumer code"
echo "SETUP-OK"
