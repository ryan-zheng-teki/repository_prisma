#!/bin/sh
S=/tmp/rp6-e2e/scripts
docker run --rm --platform linux/amd64 -e CI=true --user node -v /tmp/rp6-e2e/src:/in:ro -v $S:/scripts:ro node:24-bookworm sh /scripts/ci-node24.sh ci > /tmp/rp6-e2e/api06-nonroot.log 2>&1; echo "nonroot docker-exit=$?"
docker run --rm --platform linux/amd64 -e CI=true -v /tmp/rp6-e2e/src:/in:ro -v $S:/scripts:ro node:24-bookworm sh /scripts/ci-node24.sh root > /tmp/rp6-e2e/api06-root.log 2>&1; echo "root docker-exit=$?"
