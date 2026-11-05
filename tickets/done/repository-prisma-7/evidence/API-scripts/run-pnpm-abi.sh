#!/bin/sh
docker volume rm rp7e-pnpm >/dev/null 2>&1; docker volume create rp7e-pnpm >/dev/null
docker run --rm --platform linux/amd64 -v rp7e-pnpm:/work node:22-bookworm chown node:node /work
docker run --rm --platform linux/amd64 --user node -v rp7e-pnpm:/work -v /tmp/rp7e/pack:/pack:ro -v /tmp/rp7e/scripts:/scripts:ro node:22-bookworm sh /scripts/pnpm-abi-a-node22.sh > /tmp/rp7e/api04b-1.log 2>&1; echo "part1 docker-exit=$?"
docker run --rm --platform linux/amd64 --user node -v rp7e-pnpm:/work -v /tmp/rp7e/scripts:/scripts:ro node:24-bookworm sh /scripts/pnpm-abi-b-node24.sh > /tmp/rp7e/api04b-2.log 2>&1; echo "part2 docker-exit=$?"
