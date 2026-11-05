# AC-004 E2E: fresh consumers following only the README (pinned major), published registry versions.
set -u
S=/tmp/rp7/scripts
now=$(date -u +%Y-%m-%dT%H:%MZ); published=$(npm view repository_prisma time --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)["2.0.0"]))')
echo "## now $now; repository_prisma 2.0.0 published $published (the newest version); node $(node -v)"
setup_and_run() {
  cp $S/schema.prisma prisma/schema.prisma; cp $S/prisma.config.ts .; cp $S/app.mjs $S/app.cjs .
  npx prisma generate > /dev/null 2>&1; echo "generate exit=$?"
  echo "installed repository_prisma: $(node -p "require('./node_modules/repository_prisma/package.json').version")"
  node app.mjs explicit; node app.cjs
}
echo; echo "==== A. npm 12.2.1"
export PATH_BASE=$PATH
C=/tmp/rp7/ac004-npm12; rm -rf $C && mkdir -p $C/prisma && cd $C
PATH=/tmp/rp6-npm12-prefix/bin:$PATH_BASE; echo "npm $(npm -v)"
printf '{"name":"ac004-npm12","private":true}\n' > package.json
echo '$ npm install repository_prisma@2'; npm install repository_prisma@2 --no-fund --no-audit 2>&1 | grep -E "added|blocked"; echo "exit=${PIPESTATUS[0]}"
echo '$ npm install -D prisma@7'; npm install -D prisma@7 --no-fund --no-audit > /dev/null 2>&1; echo "exit=$?"
echo '$ npm install-scripts approve better-sqlite3; npm rebuild better-sqlite3'; npm install-scripts approve better-sqlite3 2>&1 | tail -1; npm rebuild better-sqlite3 2>&1 | tail -1
setup_and_run
for v in 11 12; do
  case $v in 11) PNPM_BIN=/tmp/rp7/pnpm11-prefix/bin;; 12) PNPM_BIN=/tmp/rp6-pnpm12-prefix/bin;; esac
  PATH=$PNPM_BIN:$PATH_BASE
  echo; echo "==== pnpm $(pnpm -v)"
  C=/tmp/rp7/ac004-pnpm$v; rm -rf $C && mkdir -p $C/prisma && cd $C
  printf '{"name":"ac004-pnpm%s","private":true}\n' $v > package.json
  echo '$ pnpm add repository_prisma@2 @prisma/client@7'; pnpm add repository_prisma@2 @prisma/client@7 2>&1 | grep -iE "minimumReleaseAge|repository_prisma|@prisma/client|IGNORED_BUILDS|Ignored build"; echo "exit=${PIPESTATUS[0]}"
  echo '$ pnpm add -D prisma@7'; pnpm add -D prisma@7 > /dev/null 2>&1; echo "exit=$?"
  echo '$ pnpm approve-builds better-sqlite3'; pnpm approve-builds better-sqlite3 2>&1 | grep -E "better-sqlite3 install|Done|ERR" | head -3; echo "exit=${PIPESTATUS[0]}"
  echo '--- pnpm-workspace.yaml'; cat pnpm-workspace.yaml
  setup_and_run
done
