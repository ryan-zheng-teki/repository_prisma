# Replica of release.yml's npm steps after setup-node, as the non-root node user (never publishes).
set -u
export NPM_CONFIG_PREFIX=$HOME/.npm-global PATH=$HOME/.npm-global/bin:$PATH
export NODE_AUTH_TOKEN=XXXXX-XXXXX-XXXXX-XXXXX
echo "## $(uname -sm), node $(node -v), bundled npm $(npm -v), user $(id -un) uid $(id -u), CI=${CI:-}"
run_case() {
  name=$1; npmrc=$2
  echo; echo "==== $name"
  export NPM_CONFIG_USERCONFIG=$npmrc
  echo "--- job .npmrc ($npmrc), as written for this case:"; cat "$npmrc"
  rm -rf /tmp/work && mkdir -p /tmp/work && cd /tmp/work && tar -xf /in/src.tar
  echo '$ npm --version; npm i -g npm@^11.5.1; npm --version  (the workflow step)'
  { npm --version; npm i -g npm@^11.5.1 --no-fund --no-audit; } > /tmp/step-upgrade.log 2>&1; echo "exit=$?"; hash -r  # each workflow step is a new shell
  echo "npm after the upgrade: $(npm --version) ($(command -v npm))"; npm --version >> /tmp/step-upgrade.log 2>&1
  echo '$ npm ci'; npm ci --no-fund > /tmp/step-ci.log 2>&1; echo "exit=$?"
  echo '$ npm run build'; npm run build > /tmp/step-build.log 2>&1; echo "exit=$?"
  echo '$ npm version 2.1.1 --no-git-tag-version  (throwaway copy only; never published)'; npm version 2.1.1 --no-git-tag-version > /tmp/step-version.log 2>&1; echo "exit=$?"
  echo '$ npm publish --dry-run --provenance=false --access public'; npm publish --dry-run --provenance=false --access public > /tmp/step-publish.log 2>&1; echo "exit=$?"
  grep -E "npm notice (name|version|total files):|Publishing to|\+ repository_prisma|npm error" /tmp/step-publish.log | head -8
  echo "--- always-auth warnings per step:"
  for s in upgrade ci build version publish; do echo "  $s: $(grep -c 'always-auth' /tmp/step-$s.log)"; done
  grep -h 'always-auth' /tmp/step-*.log | sort -u | head -2
}
printf '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\nregistry=https://registry.npmjs.org/\n' > /tmp/npmrc-v6
printf '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\nregistry=https://registry.npmjs.org/\nalways-auth=false\n' > /tmp/npmrc-v5-control
run_case "A. .npmrc as setup-node v6 writes it (no always-auth)" /tmp/npmrc-v6
run_case "B. control: .npmrc with always-auth=false (as setup-node v5 wrote it)" /tmp/npmrc-v5-control
