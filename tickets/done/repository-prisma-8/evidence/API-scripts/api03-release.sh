#!/bin/bash
# API-03: setup-node's own code (v6, then v5 as control) writes the job .npmrc; then release.yml's npm steps run against it.
echo "# node $(node -v), bundled npm $(npm -v), $(uname -sm), user $(id -un), CI=$CI, $(date -u +%FT%TZ)"
export NPM_CONFIG_PREFIX=$HOME/.npm-global PATH=$HOME/.npm-global/bin:$PATH   # the runner's tool-cache Node is writable by its user
mkdir -p $HOME/.npm-global
count() { grep -c 'always-auth' "$1"; }
for v in v6 v5; do
  echo; echo "################ setup-node $v ($(cat /actions/setup-node-$v.commit))"
  W=$HOME/work-$v; RT=$HOME/runner-temp-$v; rm -rf $W $RT; mkdir -p $W $RT; tar -xf /in/head.tar -C $W
  : > $RT/env; : > $RT/path; : > $RT/output; : > $RT/state
  ( cd $W && env -u NODE_AUTH_TOKEN RUNNER_TEMP=$RT RUNNER_TOOL_CACHE=$RT/tc GITHUB_ENV=$RT/env GITHUB_PATH=$RT/path GITHUB_OUTPUT=$RT/output GITHUB_STATE=$RT/state GITHUB_WORKSPACE=$W \
      'INPUT_NODE-VERSION=' 'INPUT_NODE-VERSION-FILE=' 'INPUT_REGISTRY-URL=https://registry.npmjs.org' 'INPUT_ALWAYS-AUTH=false' 'INPUT_CHECK-LATEST=false' 'INPUT_CACHE=' 'INPUT_PACKAGE-MANAGER-CACHE=true' 'INPUT_CACHE-DEPENDENCY-PATH=' 'INPUT_SCOPE=' 'INPUT_TOKEN=' 'INPUT_ARCHITECTURE=' 'INPUT_MIRROR=' 'INPUT_MIRROR-TOKEN=' \
      node /actions/setup-node-$v/dist/setup/index.js 2>&1 | sed 's/^/  [action] /' )
  echo "action exit=${PIPESTATUS[0]}"
  echo "--- GITHUB_ENV written by the action:"; cat $RT/env | sed 's/^/  /'
  # Export what the runner would export from GITHUB_ENV (NAME=value or NAME<<DELIM ... DELIM).
  eval "$(node -e '
    const t=require("fs").readFileSync(process.argv[1],"utf8").split("\n");const out=[];
    for(let i=0;i<t.length;i++){const l=t[i];let m;
      if((m=l.match(/^([A-Za-z_][A-Za-z0-9_]*)<<(.+)$/))){const v=[];i++;while(i<t.length&&t[i]!==m[2]){v.push(t[i]);i++}out.push("export "+m[1]+"="+JSON.stringify(v.join("\n")))}
      else if((m=l.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)))out.push("export "+m[1]+"="+JSON.stringify(m[2]));}
    console.log(out.join("\n"))' $RT/env)"
  echo "--- NPM_CONFIG_USERCONFIG=$NPM_CONFIG_USERCONFIG ; NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN"
  echo "--- .npmrc written by setup-node $v:"; cat "$NPM_CONFIG_USERCONFIG" | sed 's/^/  /'; echo
  cd $W
  step() { echo "\$ $*"; "$@" > $RT/step.out 2>&1; rc=$?; grep -E 'always-auth|Publishing to|^\+ |npm notice (version|total files)|ERR|error' $RT/step.out | sed 's/^/  /' | head -8; echo "  exit=$rc  always-auth warnings: $(count $RT/step.out)"; }
  step npm --version
  step npm i -g npm@^11.5.1; hash -r
  step npm --version; echo "  npm now: $(npm -v)"
  step npm ci
  step npm run build
  step npm version 2.1.1 --no-git-tag-version
  step npm publish --dry-run --provenance=false --access public
  unset NPM_CONFIG_USERCONFIG NODE_AUTH_TOKEN
  rm -rf $HOME/.npm-global/*; hash -r   # reset the upgraded npm for the next variant
done
