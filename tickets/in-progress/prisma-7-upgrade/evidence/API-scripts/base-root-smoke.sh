#!/bin/sh
echo "# Base 1.0.10 (f2ffd5c) test:package as root; node $(node -v); $(id); $(date -u +%FT%TZ)"
mkdir -p /work && cd /work && tar -xf /in/head.tar
npm ci >/tmp/ci.log 2>&1; echo "npm ci exit=$?"
npm run test:package 2>&1 | tail -25; echo "test:package exit=$?"
