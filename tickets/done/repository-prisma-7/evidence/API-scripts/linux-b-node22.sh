#!/bin/sh
# API-03: same consumer volume, module built under Node 24 (ABI 137), run under Node 22; then the README rebuild.
echo "## node $(node -v) (ABI $(node -p process.versions.modules)), npm $(npm -v), $(uname -sm), user $(id -un), $(date -u +%FT%TZ)"
cd /work/consumer || exit 1
apps() { node app.mjs explicit; node app.cjs; node app.mjs lazy; node app-lazy.cjs; }
echo; echo "==== 3. module built for Node 24 (ABI 137), running Node $(node -v)"; apps
echo; echo "==== 4. README fix: npm rebuild better-sqlite3 (under Node $(node -v), npm $(npm -v))"
echo '$ npm rebuild better-sqlite3'; npm rebuild better-sqlite3 2>&1 | tail -2; echo "exit=$?"
apps
