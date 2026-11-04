#!/bin/sh
# Normalize run-specific values: ANSI codes, /private prefix, repo roots, temp dirs, durations, timestamps.
sed -E -e 's/\x1b\[[0-9;]*m//g' -e 's#/private/#/#g' \
  -e "s#$2#<REPO>#g" \
  -e 's#/var/folders/[^ "]*/T/(repository-prisma-[a-z-]+)-[A-Za-z0-9]+#<TMP>/\1-XXXX#g' \
  -e 's#/tmp/(repository-prisma-[a-z-]+)-[A-Za-z0-9]+#<TMP>/\1-XXXX#g' \
  -e 's/ in [0-9]+(\.[0-9]+)?(ms|s)/ in <T>/g' \
  -e 's/(added|changed|removed) [0-9]+ packages?/\1 <N> packages/g' "$1"
