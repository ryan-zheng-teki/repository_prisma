set -u
echo "## $(uname -sm), node $(node -v), npm $(npm -v), user $(id -un) uid $(id -u), CI=${CI:-}"
mkdir -p /tmp/work && cd /tmp/work && tar -xf /in/src.tar
echo '$ npm ci --strict-allow-scripts'; npm ci --strict-allow-scripts --no-fund > /tmp/ci.log 2>&1; echo "exit=$?"; tail -2 /tmp/ci.log
echo '$ npm run typecheck'; npm run typecheck > /tmp/tc.log 2>&1; echo "exit=$?"; tail -1 /tmp/tc.log
echo '$ npm test'; NO_COLOR=1 npm test 2>&1 | grep -E "Test Files|Tests "; echo "exit=${PIPESTATUS[0]}"
echo '$ npm run build'; npm run build > /tmp/b.log 2>&1; echo "exit=$?"
