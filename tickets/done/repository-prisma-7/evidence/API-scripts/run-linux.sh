#!/bin/sh
docker volume rm rp7e-linux >/dev/null 2>&1; docker volume create rp7e-linux >/dev/null
docker run --rm --platform linux/amd64 -v rp7e-linux:/work node:24-bookworm chown node:node /work
docker run --rm --platform linux/amd64 --user node -v rp7e-linux:/work -v /tmp/rp7e/pack:/pack:ro -v /tmp/rp7e/scripts:/scripts:ro node:24-bookworm sh /scripts/linux-a-node24.sh > /tmp/rp7e/api02.log 2>&1; echo "api02 docker-exit=$?"
docker run --rm --platform linux/amd64 --user node -v rp7e-linux:/work -v /tmp/rp7e/scripts:/scripts:ro node:22-bookworm sh /scripts/linux-b-node22.sh > /tmp/rp7e/api03.log 2>&1; echo "api03 docker-exit=$?"
