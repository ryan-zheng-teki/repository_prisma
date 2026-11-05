# Which setting points pnpm's registry-metadata cache at a given directory?
# Usage: bash pnpm-cache-dir.sh <dir containing pnpm 11 bin> <dir containing pnpm 12 bin>
for P in "$@"; do
  v=$("$P/pnpm" -v)
  for how in npm_config_cache_dir pnpm_config_cache_dir --cache-dir; do
    d=$(mktemp -d /tmp/pnpmcache-XXXX); w=$(mktemp -d /tmp/pnpmws-XXXX)
    cd "$w" && printf '{"name":"x","private":true}\n' > package.json
    if [ "$how" = "--cache-dir" ]; then "$P/pnpm" add is-number@7 --cache-dir "$d" > /dev/null 2>&1
    else env "$how=$d" "$P/pnpm" add is-number@7 > /dev/null 2>&1; fi
    echo "pnpm $v $how=<tmp>: files written to <tmp>: $(find "$d" -type f | wc -l | tr -d ' ')"
    cd / && rm -rf "$d" "$w"
  done
  d=$(mktemp -d /tmp/pnpmcache-XXXX); w=$(mktemp -d /tmp/pnpmws-XXXX)
  cd "$w" && printf '{"name":"x","private":true}\n' > package.json && pnpm_config_cache_dir="$d" "$P/pnpm" add is-number@7 > /dev/null 2>&1
  echo "pnpm $v pnpm cache view is-number (pnpm_config_cache_dir=<tmp>) lists 7.0.0: $(pnpm_config_cache_dir="$d" "$P/pnpm" cache view is-number 2>&1 | grep -c '"7.0.0"') line(s)"
  cd / && rm -rf "$d" "$w"
done
