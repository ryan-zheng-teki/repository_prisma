# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-05T05:05:40Z | API-04 | Started | — | new registration-recovery.test.ts, narrow vitest run in worktree |
| 2026-11-05T05:06:05Z | API-04 | Completed | Pass | 3/3 pass; mutation control 3/3 fail; next: API-05 consumer-types extension |
| 2026-11-05T05:06:53Z | API-01 | Started | — | npm run typecheck in worktree (c97eab8 + API-04 test + API-05 smoke change) |
| 2026-11-05T05:07:02Z | API-01 | Completed | Pass | registered program lists 2 test files; next API-02 |
| 2026-11-05T05:07:02Z | API-02 | Started | — | npm test in worktree |
| 2026-11-05T05:07:14Z | API-02 | Completed | Pass | 16 files, 147 tests; next API-03 (includes API-05) |
| 2026-11-05T05:07:14Z | API-03 | Started | — | npm run test:package as normy (includes API-05 consumer modes) |
| 2026-11-05T05:07:40Z | API-03 | Checkpoint | — | first run passed (exit 0); smoke summary extended with registeredConsumerTypes; rerunning for final evidence |
| 2026-11-05T05:07:59Z | API-03 | Completed | Pass | smoke summary registeredConsumerTypes [nodenext,node16,bundler,cjs-node16]; interop pass. API-05 completed with it. Next: build+pack for journeys API-06..08 in /tmp/rp3-api |
| 2026-11-05T05:09:39Z | API-07 | Started | — | evidence/API-07-probe/run.sh into /tmp/rp3-api (also runs API-08 and API-06) |
| 2026-11-05T05:10:25Z | API-07 | Completed | Pass | run.sh ALL-STEPS-RAN; all expected exits; API-08 and API-06 ran in the same script |
| 2026-11-05T05:10:25Z | API-08 | Completed | Pass | wrong-order exit=1 PRISMA_CLIENT_UNAVAILABLE; readme-order exit=0 |
| 2026-11-05T05:10:25Z | API-06 | Completed | Pass | tsc 5.4.5: db/api/worker exit 0; controls exit 2 as expected. Next: API-09 docs review |
| 2026-11-05T05:10:46Z | API-09 | Completed | Pass | version 2.0.0, peers unchanged, no tag; README/DESIGN/CHANGELOG present. Next: commit durable tests, API-13 Linux |
| 2026-11-05T05:10:57Z | API-13 | Started | — | git archive 6c950bd into node:24-bookworm linux/amd64 as node |
| 2026-11-05T05:12:54Z | API-13 | Completed | Pass | ALL-STEPS-OK, 147 tests, registeredConsumerTypes 4 modes |
| 2026-11-05T05:12:54Z | API-14 | Started | — | Node 20 (engines lower range) in node:20-bookworm as node: npm ci, test, build, smoke, interop |
| 2026-11-05T05:15:39Z | API-14 | Completed | Pass | node v20.20.2: 147 tests, smoke + interop pass. All planned cases complete; next: report, revision record, commit |
