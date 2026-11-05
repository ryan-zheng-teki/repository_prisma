#!/bin/bash
# API-04b: `pnpm cache view <pkg>` as TESTING.md names it (default cache), and with pnpm_config_cache_dir.
for PB in "$@"; do
  export PATH=$PB:$PATH; hash -r
  echo; echo "################ pnpm $(pnpm -v)"
  P=$(mktemp -d /tmp/rp8e/proj.XXXXXX); C=$(mktemp -d /tmp/rp8e/cache.XXXXXX); cd $P; printf '{"name":"cv","private":true}\n' > package.json
  pnpm add repository_prisma@2 --ignore-scripts >/dev/null 2>&1; echo "pnpm add (default cache) exit=$?"
  echo '$ pnpm cache view repository_prisma   (default cache)'; pnpm cache view repository_prisma 2>&1 | head -c 600; echo; echo "exit=${PIPESTATUS[0]}"
  rm -rf node_modules pnpm-lock.yaml
  pnpm_config_cache_dir=$C pnpm add repository_prisma@2 --ignore-scripts >/dev/null 2>&1; echo "pnpm add (pnpm_config_cache_dir=<tmp>) exit=$?"
  echo '$ pnpm_config_cache_dir=<tmp> pnpm cache view repository_prisma'; pnpm_config_cache_dir=$C pnpm cache view repository_prisma 2>&1 | head -c 600; echo; echo "exit=${PIPESTATUS[0]}"
  cd /tmp; rm -rf $P $C
done
