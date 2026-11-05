#!/bin/bash
# API-02 static checks. Run from the worktree root.
echo "# API-02 static checks; $(date -u +%FT%TZ)"
for v in v5 v6; do
  d=/tmp/rp8e/actions/setup-node-$v
  [ -d $d ] || git clone -q --depth 1 --branch $v https://github.com/actions/setup-node $d
done
echo '$ git diff 4a2f312..e44ea62 -- .github'
git diff 4a2f312..e44ea62 -- .github
echo
echo '$ actionlint .github/workflows/ci.yml .github/workflows/release.yml'
docker run --rm -v "$PWD/.github:/repo/.github:ro" -w /repo rhysd/actionlint:latest -color=false -verbose .github/workflows/ci.yml .github/workflows/release.yml 2>&1 | tail -3
echo "exit=${PIPESTATUS[0]}"
for v in v5 v6; do
  d=/tmp/rp8e/actions/setup-node-$v
  echo; echo "== setup-node $v at commit $(git -C $d rev-parse HEAD)"
  grep -nE "using:" $d/action.yml
  grep -nE "^  (node-version|cache|registry-url|always-auth|package-manager-cache):" $d/action.yml
done
echo; echo '$ diff setup-node-v5/src/authutil.ts setup-node-v6/src/authutil.ts'
diff /tmp/rp8e/actions/setup-node-v5/src/authutil.ts /tmp/rp8e/actions/setup-node-v6/src/authutil.ts
echo; echo "package.json packageManager/devEngines (automatic-caching precondition):"
node -p 'const p=require("./package.json");JSON.stringify({packageManager:p.packageManager??null,devEngines:p.devEngines??null})'
