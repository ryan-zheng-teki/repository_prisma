# API-05 (AC-004): README installs once the newest version is older than pnpm's minimum release age.
# 2.0.0 is ~15 h old at test time, so each pnpm consumer sets minimumReleaseAge: 60 (minutes) first: the gate's post-day state.
set -u
S=/tmp/rp7e/scripts; BASE=$PATH
echo "## now $(date -u +%FT%TZ); 2.0.0 published $(npm view repository_prisma time --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)["2.0.0"]))'); node $(node -v)"
run_apps() {
  cp $S/schema.prisma prisma/; cp $S/prisma.config.ts $S/app.mjs $S/app.cjs .
  npx prisma generate >/dev/null 2>&1; echo "generate exit=$?"
  echo "installed repository_prisma: $(node -p "require('./node_modules/repository_prisma/package.json').version")"
  node app.mjs explicit; node app.cjs
}
for v in 11 12; do
  case $v in 11) PB=/tmp/rp7e/pnpm11/bin;; 12) PB=/tmp/rp6-pnpm12-prefix/bin;; esac
  PATH=$PB:$BASE
  for line in pinned unpinned; do
    echo; echo "==== pnpm $(pnpm -v), $line install line, minimumReleaseAge: 60"
    C=/tmp/rp7e/ac004-pnpm$v-$line; rm -rf $C; mkdir -p $C/prisma; cd $C
    printf '{"name":"ac004","private":true}\n' > package.json
    printf 'minimumReleaseAge: 60\n' > pnpm-workspace.yaml
    if [ $line = pinned ]; then spec=repository_prisma@2; else spec=repository_prisma; fi
    echo "\$ pnpm add $spec @prisma/client@7"; pnpm add $spec @prisma/client@7 2>&1 | grep -iE 'minimumReleaseAge|\+ repository_prisma|\+ @prisma/client'
    if [ $line = pinned ]; then
      pnpm add -D prisma@7 >/dev/null 2>&1; echo '$ pnpm approve-builds better-sqlite3'; pnpm approve-builds better-sqlite3 2>&1 | grep -E 'install: Done|ERR' | head -2
      echo '--- pnpm-workspace.yaml (expect no minimumReleaseAgeExclude entry):'; cat pnpm-workspace.yaml
      run_apps
    else
      echo "installed repository_prisma: $(node -p "require('./node_modules/repository_prisma/package.json').version")  (control: the unpinned line also gets 2.0.0 once the gate is passed)"
    fi
  done
done
echo; echo "==== npm 12.2.1, README npm line"
PATH=/tmp/rp6-npm12-prefix/bin:$BASE; C=/tmp/rp7e/ac004-npm12; rm -rf $C; mkdir -p $C/prisma; cd $C
printf '{"name":"ac004-npm12","private":true}\n' > package.json; echo "npm $(npm -v), min-release-age config: $(npm config get min-release-age 2>/dev/null)"
echo '$ npm install repository_prisma@2'; npm install repository_prisma@2 --no-fund --no-audit 2>&1 | grep -E 'added'
npm install -D prisma@7 --no-fund --no-audit >/dev/null 2>&1; npm install-scripts approve better-sqlite3 2>&1 | tail -1; npm rebuild better-sqlite3 2>&1 | tail -1
run_apps
