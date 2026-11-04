#!/bin/sh
S=/tmp/rp2-e2e/scripts
docker run --rm --platform linux/amd64 -e CI=true --user node -v /tmp/rp2-e2e/src:/in:ro -v $S:/scripts:ro node:24-bookworm sh /scripts/node24-steps.sh ci > /tmp/rp2-e2e/api02.log 2>&1; echo "api02 docker-exit=$?"
docker run --rm --platform linux/amd64 -e CI=true -v /tmp/rp2-e2e/src:/in:ro -v $S:/scripts:ro node:24-bookworm sh /scripts/node24-steps.sh root-smoke > /tmp/rp2-e2e/api03.log 2>&1; echo "api03 docker-exit=$?"
docker run --rm --platform linux/amd64 -e CI=true -v /tmp/rp2-e2e/src:/in:ro -v $S:/scripts:ro node:24-bookworm sh /scripts/node24-steps.sh release > /tmp/rp2-e2e/api06.log 2>&1; echo "api06 docker-exit=$?"
