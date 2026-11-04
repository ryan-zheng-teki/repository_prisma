#!/bin/sh
# API-04: CI workflow commands on Node 20 Linux from a clean checkout (git archive HEAD + API-02 test overlay).
set -u
echo "# API-04 CI commands on Node 20 (Linux container)"
echo "# Image: node:20-bookworm; node $(node -v); npm $(npm -v); arch $(uname -m); date $(date -u +%FT%TZ)"
mkdir -p /work && cd /work && tar -xf /in/head.tar && cp -R /in/overlay/. /work/
unset DATABASE_URL DATABASE_URL_TEST
step() { echo; echo "\$ $*"; "$@"; rc=$?; echo "exit=$rc ($*)"; [ $rc -eq 0 ] || FAILED=1; }
FAILED=0
step npm ci
step npm ls prisma @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3
step ls node_modules/.prisma/client/index.d.ts
step npm run typecheck
step npm test
step npm run build
step npm run test:package
echo; echo "ALL-STEPS-FAILED=$FAILED"
