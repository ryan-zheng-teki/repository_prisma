#!/bin/bash
# API-04: which settings move pnpm's registry-metadata cache (TESTING.md § Environments). Usage: api04-pnpm-cache.sh <pnpm-bin-dir>...
for PB in "$@"; do
  export PATH=$PB:$PATH; hash -r
  echo; echo "################ pnpm $(pnpm -v), node $(node -v), $(uname -sm), $(date -u +%FT%TZ)"
  echo "default cache-dir: $(pnpm config get cache-dir)"
  for mode in npm_config_cache_dir pnpm_config_cache_dir --cache-dir; do
    C=$(mktemp -d /tmp/rp8e/cache.XXXXXX); P=$(mktemp -d /tmp/rp8e/proj.XXXXXX)
    printf '{"name":"cachecheck","private":true}\n' > $P/package.json
    case $mode in
      npm_config_cache_dir) envs="npm_config_cache_dir=$C"; flag="";;
      pnpm_config_cache_dir) envs="pnpm_config_cache_dir=$C"; flag="";;
      --cache-dir) envs="X_UNUSED=1"; flag="--cache-dir=$C";;
    esac
    resolved=$(cd $P && env $envs pnpm config get cache-dir $flag 2>/dev/null)
    (cd $P && env $envs pnpm add is-number@7 $flag >/dev/null 2>&1); rc=$?
    n=$(find $C -type f | wc -l | tr -d ' ')
    echo "$mode=<tmp>: pnpm config get cache-dir -> $( [ "$resolved" = "$C" ] && echo '<tmp>' || echo "$resolved" ); pnpm add exit=$rc; files written to <tmp>: $n"
    if [ $mode = --cache-dir ]; then
      echo "\$ pnpm cache view repository_prisma --cache-dir=<tmp>   (versions listed)"
      (cd $P && pnpm add repository_prisma@2 --cache-dir=$C --ignore-scripts >/dev/null 2>&1; pnpm cache view repository_prisma --cache-dir=$C 2>&1 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const o=Object.values(j)[0]||j;const vs=Object.keys(o.versions||o.cachedVersions||{});console.log("  versions:",JSON.stringify(vs.length?vs:Object.keys(o)).slice(0,300))}catch(e){console.log("  raw:",s.slice(0,400).replace(/\n/g," "))}})')
    fi
    rm -rf $C $P
  done
done
