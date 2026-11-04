#!/bin/sh
# Usage: node24-steps.sh <ci|root-smoke|release>
MODE="$1"
echo "# mode=$MODE image=node:24-bookworm node=$(node -v) npm=$(npm -v) arch=$(uname -m) user=$(id) CI=${CI:-} date=$(date -u +%FT%TZ)"
W=$HOME/work; mkdir -p $W && cd $W && tar -xf /in/head.tar || exit 1
unset DATABASE_URL DATABASE_URL_TEST
FAILED=0
step() { echo; echo "\$ $*"; "$@"; rc=$?; echo "exit=$rc ($*)"; [ $rc -eq 0 ] || FAILED=1; }
case "$MODE" in
  ci)
    # ci.yml steps, in order
    step npm ci
    step npm run typecheck
    step npm test
    step npm run build
    # AC-005 extras on the CI platform
    step npm audit
    echo; echo '$ npm ls uuid @types/uuid'; npm ls uuid @types/uuid; echo "exit=$? (npm ls uuid: exit 1 + (empty) means absent)"
    step npm run test:package
    ;;
  root-smoke)
    step npm ci
    step npm run test:package
    ;;
  release)
    # release.yml steps after checkout/setup-node (global npm is writable as root here, as the runner's tool cache is for the runner user)
    echo "bundled npm before: $(npm --version)"
    step npm --version
    step npm i -g npm@^11.5.1
    step npm --version
    step npm ci
    step npm run build
    # Publish packaging only: no token, no upload
    step npm publish --dry-run --access public
    ;;
  release-bumped)
    # Same release steps; a real release bumps the version first (README guide). Container-only bump, nothing is published.
    step npm i -g npm@^11.5.1
    step npm --version
    step npm ci
    step npm run build
    step npm version 2.0.1-e2e.0 --no-git-tag-version
    step npm publish --dry-run --access public --tag e2e
    ;;
esac
echo; echo "ALL-STEPS-FAILED=$FAILED"
