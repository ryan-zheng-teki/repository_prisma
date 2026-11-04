#!/bin/sh
# Usage: ci-node24.sh <ci|root>
MODE="$1"
echo "# mode=$MODE node=$(node -v) npm=$(npm -v) arch=$(uname -m) user=$(id) CI=${CI:-} date=$(date -u +%FT%TZ)"
W=$HOME/work; rm -rf $W; mkdir -p $W && cd $W && tar -xf /in/head.tar || exit 1
unset DATABASE_URL DATABASE_URL_TEST
FAILED=0
step() { echo; echo "\$ $*"; "$@" > /tmp/step.out 2>&1; rc=$?; cat /tmp/step.out; echo "exit=$rc ($*)"; [ $rc -eq 0 ] || FAILED=1; }
step npm ci --strict-allow-scripts
echo "install-script warning lines: $(grep -c 'install-scripts' /tmp/step.out)"
echo "native module: $(ls node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>&1)"
if [ "$MODE" = ci ]; then
  step npm run typecheck
  step npm test
  step npm run build
fi
step npm run test:package
echo; echo "ALL-STEPS-FAILED=$FAILED"
