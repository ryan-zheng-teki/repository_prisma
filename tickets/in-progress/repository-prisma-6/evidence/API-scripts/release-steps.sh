#!/bin/sh
# release.yml steps after checkout/setup-node, with the new allowScripts in package.json. Nothing is published.
echo "# node=$(node -v) npm=$(npm -v) arch=$(uname -m) user=$(id -un) date=$(date -u +%FT%TZ)"
W=$HOME/work; mkdir -p $W && cd $W && tar -xf /in/head.tar || exit 1
FAILED=0
step() { echo; echo "\$ $*"; "$@" > /tmp/step.out 2>&1; rc=$?; cat /tmp/step.out; echo "exit=$rc ($*)"; [ $rc -eq 0 ] || FAILED=1; }
step npm --version
step npm i -g npm@^11.5.1
step npm --version
step npm ci
echo "install-script warning lines: $(grep -c 'install-scripts' /tmp/step.out)"
echo "native module: $(ls node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>&1)"
step npm run build
# A real release bumps the version first; container-only bump so the registry accepts the dry run.
step npm version 2.0.1-e2e.0 --no-git-tag-version
step npm publish --dry-run --access public --tag e2e
echo "packed allowScripts: $(node -p 'JSON.stringify(require("./package.json").allowScripts)')"
echo; echo "ALL-STEPS-FAILED=$FAILED"
