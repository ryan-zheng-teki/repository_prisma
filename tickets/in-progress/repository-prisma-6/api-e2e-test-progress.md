# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 18:23 | API-01 | Completed | Pass | Reused IMP-01,02,06,07,08,09,10,11; b87252c..72ef918 outside tickets = README/CHANGELOG |
| 18:23 | API-05 | Completed | Pass | main CI run 41872190680: node v24.22.2, npm 11.19.1 |
| 18:23 | API-06 | Started | | amd64 node:24 non-root CI + root test:package (background /tmp/rp6-e2e/api06-*.log) |
| 18:23 | API-03 | Completed | Pass | only old-only line: repoRoot; 91 glue lines; 303/303 template lines present |
| 18:23 | API-02 | Started | | base archive npm ci + test:package vs HEAD worktree, macOS npm 10; then HEAD on npm 12.2.1 |
| 18:25 | API-02 | Completed | Pass | npm 10 base vs HEAD: build set + smoke section identical; npm 12 HEAD smoke identical; base on npm 12 fails (deviation confirmed) |
| 18:25 | API-04 | Started | | dist mutations M1..M4 in the worktree, rebuild after each |
| 18:25 | API-04 | Completed | Pass | M1 import-safety, M2 logging-policy, M3 esm-runtime, M4 consumer-types each fail in their step; restored control pass |
| 18:25 | API-07 | Started | | pnpm 11.28.9 README consumer on macOS (/tmp/rp6-e2e/c-pnpm11*) |
| 18:26 | API-06 | Completed | Pass | x86_64 non-root strict ci 0 warnings, 113 tests, build, test:package; root test:package skipped-root pass |
| 18:26 | API-07 | Completed | Pass | pnpm 11.28.9 README flow RESULT ok; no-approve control shows README symptom; release age resolves 1.0.10 without exclusion |
| 18:26 | API-08 | Started | | npm 12.2.1 consumer in amd64 node:24 non-root |
| 18:28 | API-08 | Completed | Pass | npm 12.2.1 Linux x64 README flow RESULT ok; no-approve control shows symptom |
| 18:28 | API-11 | Started | | added case: release.yml steps with allowScripts (npm 11.21.1), amd64, background |
| 18:29 | API-11 | Completed | Pass | npm 11.21.1 ci 0 warnings, native built, build ok, bumped dry-run publish ok |
| 18:29 | API-09 | Completed | Pass | README/CHANGELOG/Testing reviewed; version 2.0.0; no tags |
| 18:29 | API-10 | Completed | Not Tested | post-merge GitHub run; handed to delivery |
| 18:31 | — | Completed | Pass | /tmp/rp6-e2e removed; TESTING.md written; committing |
