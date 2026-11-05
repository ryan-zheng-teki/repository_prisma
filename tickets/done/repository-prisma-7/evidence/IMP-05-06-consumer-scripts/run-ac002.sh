# AC-002 E2E: real better-sqlite3 failures through the packed build, npm 12 consumer (README steps).
set -u
S=/tmp/rp7/scripts; C=/tmp/rp7/consumer-npm12; NODE25=/opt/homebrew/opt/node@25/bin
export PATH=/tmp/rp6-npm12-prefix/bin:$PATH
rm -rf $C && mkdir -p $C/prisma && cd $C
echo "## tools: npm $(npm -v), node $(node -v) (ABI $(node -p process.versions.modules)), node25 $($NODE25/node -v) (ABI $($NODE25/node -p process.versions.modules))"
printf '{"name":"ac002-consumer","private":true}\n' > package.json
echo '$ npm install <packed bcf2be0 tarball>   (README: npm install repository_prisma@2)'
npm install /tmp/rp7/pack/repository_prisma-2.0.0.tgz --no-fund --no-audit 2>&1 | grep -E "added|install-scripts +[a-z@]" ; echo "exit=${PIPESTATUS[0]}"
echo '$ npm install -D prisma@7'; npm install -D prisma@7 --no-fund --no-audit > /dev/null 2>&1; echo "exit=$?"
cp $S/schema.prisma prisma/schema.prisma; cp $S/reg-schema.prisma prisma/reg-schema.prisma; cp $S/prisma.config.ts .; cp $S/app.mjs $S/app.cjs $S/reg-app.mjs $S/tsconfig.reg.json .
echo '$ npx prisma generate; npx prisma generate --schema prisma/reg-schema.prisma; tsc -p tsconfig.reg.json'
npx prisma generate > /dev/null 2>&1; echo "generate exit=$?"
npx prisma generate --schema prisma/reg-schema.prisma > /dev/null 2>&1; echo "generate (prisma-client) exit=$?"
printf '{"type":"module"}\n' > reg-generated/package.json   # the prisma-client output is ESM; NodeNext then emits ESM
node /Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/node_modules/typescript/bin/tsc -p tsconfig.reg.json; echo "tsc exit=$?"
printf '{"type":"module"}\n' > reg-out/package.json
echo "native module present: $(ls node_modules/better-sqlite3/build/Release/*.node 2>/dev/null | wc -l | tr -d ' ')"

echo; echo "==== 1. native module missing (install script blocked by npm 12), Node $(node -v)"
node app.mjs explicit; node app.cjs; node reg-app.mjs; node app.mjs lazy

echo; echo "==== 2. README fix: npm install-scripts approve better-sqlite3; npm rebuild better-sqlite3"
npm install-scripts approve better-sqlite3 2>&1 | tail -1; npm rebuild better-sqlite3 2>&1 | tail -1
node app.mjs explicit; node app.cjs; node reg-app.mjs

echo; echo "==== 3. native module built for Node $(node -v) (ABI $(node -p process.versions.modules)), run with Node $($NODE25/node -v)"
$NODE25/node app.mjs explicit; $NODE25/node app.cjs; $NODE25/node reg-app.mjs; $NODE25/node app.mjs lazy

echo; echo "==== 4. README fix: rebuild for the Node.js you run (npm rebuild better-sqlite3 under Node $($NODE25/node -v))"
PATH=$NODE25:$PATH npm rebuild better-sqlite3 2>&1 | tail -1
$NODE25/node app.mjs explicit; $NODE25/node app.cjs; $NODE25/node reg-app.mjs

echo; echo "==== 5. baseline (reproduction): published repository_prisma@2.0.0, native module missing, Node $(node -v)"
B=/tmp/rp7/consumer-base; rm -rf $B && mkdir -p $B/prisma && cd $B
printf '{"name":"ac002-base","private":true}\n' > package.json
npm install repository_prisma@2.0.0 --no-fund --no-audit > /dev/null 2>&1; npm install -D prisma@7 --no-fund --no-audit > /dev/null 2>&1
cp $S/schema.prisma prisma/schema.prisma; cp $S/prisma.config.ts .; cp $S/app.mjs .
npx prisma generate > /dev/null 2>&1; echo "native module present: $(ls node_modules/better-sqlite3/build/Release/*.node 2>/dev/null | wc -l | tr -d ' ')"
node app.mjs explicit
