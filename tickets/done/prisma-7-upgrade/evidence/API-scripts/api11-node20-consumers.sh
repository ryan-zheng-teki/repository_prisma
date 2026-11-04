#!/bin/sh
# API-11: fresh consumers from the packed tarball on Node 20 Linux (non-root), no --legacy-peer-deps.
echo "# API-11 Node 20 Linux consumers; image node:20-bookworm; node $(node -v); npm $(npm -v); $(uname -sm); $(id); $(date -u +%FT%TZ)"
cp /pack/repository_prisma-1.0.10.tgz $HOME/rp.tgz
for TYPE in module commonjs; do
  DIR=$HOME/consumer-$TYPE
  echo; echo "########## $TYPE consumer"
  sh /scripts/consumer-setup.sh $HOME/rp.tgz $DIR $TYPE /scripts 2>&1 | grep -vE '^(npm warn|added|$)'
  cd $DIR || exit 1
  node -e "const p=require.resolve('better-sqlite3/package.json');console.log('better-sqlite3 native binding present:', require('fs').existsSync(require('path').join(require('path').dirname(p),'build/Release/better_sqlite3.node')))"
  if [ $TYPE = module ]; then APP=app.mjs; LAZY=lazy.mjs; else APP=app.cjs; LAZY=lazy.cjs; fi
  echo "\$ node $APP"; node $APP | tail -1; echo "exit=$?"
  echo "\$ DATABASE_URL=file:./app.db node $LAZY"; DATABASE_URL=file:./app.db node $LAZY; echo "exit=$?"
  echo "\$ DATABASE_URL=postgresql://app_user:s3cr3t-pw@db.internal.example:5432/appdb node $LAZY"; DATABASE_URL=postgresql://app_user:s3cr3t-pw@db.internal.example:5432/appdb node $LAZY; echo "exit=$?"
  if [ $TYPE = module ]; then
    cp /scripts/cr01-esm.mjs /scripts/load-probe.mjs /scripts/path-probe.mjs .
    mkdir -p dbs
    for f in cr01 load0 load1; do DATABASE_URL=file:$DIR/dbs/$f.db npx prisma db push >/dev/null 2>&1; done
    echo '$ node cr01-esm.mjs dbs/cr01.db'; node cr01-esm.mjs $DIR/dbs/cr01.db | tr -d '\n '; echo; echo "exit=$?"
    echo '$ node load-probe.mjs dbs/load0.db 0 5000'; node load-probe.mjs $DIR/dbs/load0.db 0 5000; echo "exit=$?"
    echo '$ node load-probe.mjs dbs/load1.db 1 5000'; node load-probe.mjs $DIR/dbs/load1.db 1 5000; echo "exit=$?"
    mkdir -p $HOME/path-probe && cd $HOME/path-probe && echo '$ node consumer-module/path-probe.mjs (cwd ~/path-probe)'; node $DIR/path-probe.mjs; echo "exit=$?"
  fi
done
