# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 14:04 | API-01 | Completed | Pass | Reused IMP-01/07/09/12/13/14/16; `git diff --name-only e5d2371 f91b676` = tickets/ only |
| 14:04 | API-02 | Started | | durable load test in transaction-isolation.test.ts, vitest on macOS |
| 14:05 | API-02 | Completed | Pass | 7/7 green; mutation (ungated) fails the new test; restored |
| 14:05 | API-03 | Started | | typecheck + npm test + 10x isolation repeat, macOS |
| 14:06 | API-03 | Completed | Pass | typecheck exit 0; 11 files / 113 tests; isolation 10/10 repeats |
| 14:06 | API-04 | Started | | docker node:20-bookworm arm64, CI=true, background; log /tmp/rp-e2e/api04.log |
| 14:07 | API-05 | Started | | fresh ESM consumer /tmp/rp-e2e/consumer-esm, macOS |
| 14:08 | API-05 | Completed | Pass | 10/10 app checks; peers auto-installed 7.10.1; lazy file+postgres ok (probe fixed to catch the sync throw) |
| 14:08 | API-06 | Started | | fresh CJS consumer /tmp/rp-e2e/consumer-cjs, macOS |
| 14:08 | API-06 | Completed | Pass | 10/10 app checks CJS; lazy file+postgres ok |
| 14:08 | API-04 | Checkpoint | | root run: npm ci/typecheck/test/build pass; test:package fails at read-only WAL assertion (root ignores chmod); rerunning as non-root user node |
| 14:08 | API-07 | Started | | tsc 5.4.5 + latest 5.x on README-style code in consumer-esm and consumer-cjs |
| 14:09 | API-07 | Completed | Pass | tsc 5.4.5 and 5.9.3, NodeNext and CommonJS: exit 0; negative control exit 2 |
| 14:09 | API-08 | Started | | consumer-esm: cr01-esm.mjs + load-probe.mjs DELETE/WAL 8s each, then ungated control |
| 14:11 | API-08 | Completed | Pass | cr01-esm: seenUncommitted [], rowsAfter independent only; load DELETE+WAL 0 violations; ungated control FAIL as expected |
| 14:11 | API-04 | Completed | Pass | non-root node:20: all CI steps + test:package pass; root-only smoke failure reproduced on base f2ffd5c (pre-existing, follow-up) |
| 14:11 | API-09 | Started | | Prisma 5.22 writer /tmp/rp-e2e/p5-writer; consumer-dt on 7 |
| 14:12 | API-09 | Completed | Pass | 7/7 checks on 7.10.1 over Prisma-5.22 rows; Prisma 5.22 reads back 7-written row |
| 14:12 | API-10 | Started | | path probe in /tmp/rp-e2e/path-probe via consumer-esm package |
| 14:12 | API-10 | Completed | Pass | 4/4 path cases; no ? files |
| 14:12 | API-11 | Started | | docker node:20-bookworm --user node: consumers ESM+CJS, lazy, cr01, load, path |
| 14:15 | API-11 | Completed | Pass | ESM+CJS app/lazy pass; native binding present; cr01, load DELETE/WAL, path probe pass |
| 14:15 | API-04 | Checkpoint | | extra: amd64 emulated rerun (non-root) started in background, log /tmp/rp-e2e/api04-amd64.log |
| 14:18 | API-04 | Checkpoint | Pass | amd64 emulated non-root rerun: all steps exit 0, 113 tests, smoke+interop pass |
| 14:18 | API-12 | Completed | Not Tested | no Windows host |
| 14:19 | — | Completed | Pass | all cases done; /tmp/rp-e2e removed; reports written; committing |
