#!/bin/sh
# README npm consumer journey with npm 12.2.1 on the published package. Usage: consumer-npm12.sh <approve:0|1>
APPROVE="$1"
npm install -g --prefix $HOME/npm12 npm@12.2.1 >/dev/null 2>&1; export PATH=$HOME/npm12/bin:$PATH
echo "## npm $(npm -v), node $(node -v), $(uname -sm), $(id -un); approve=$APPROVE; $(date -u +%FT%TZ)"
D=$HOME/consumer; rm -rf $D; mkdir -p $D/prisma; cd $D || exit 1
printf '{ "name": "consumer", "version": "1.0.0", "private": true }\n' > package.json
s() { echo "\$ $*"; "$@"; echo "exit=$?"; }
s npm install repository_prisma
s npm install -D prisma@7
if [ "$APPROVE" = 1 ]; then s npm install-scripts approve better-sqlite3; s npm rebuild better-sqlite3; fi
cp /probes/consumer-schema.prisma prisma/schema.prisma; cp /probes/consumer-prisma.config.ts prisma.config.ts; cp /probes/consumer-app.mjs app.mjs
s npx prisma generate
echo "native module: $(ls node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>&1)"
echo "package.json allowScripts: $(node -p 'JSON.stringify(require("./package.json").allowScripts)')"
s node app.mjs
echo "versions: $(npm ls repository_prisma @prisma/client @prisma/adapter-better-sqlite3 prisma 2>/dev/null | tr -s ' \n' ' ')"
