# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 17:43 | API-01 | Completed | Pass | Reused IMP-01..06, IMP-08; e213742..4ad013e touches only tickets/ |
| 17:43 | API-02 | Started | | amd64 node:24 non-root CI steps (background, /tmp/rp2-e2e/api02.log); API-03 and API-06 queued in the same job |
| 17:44 | API-05 | Completed | Pass | actionlint 0 errors (control errors); v5 using node24; npm@^11.5.1 -> 11.21.1 |
| 17:44 | API-07 | Started | | pack + fresh ESM/CJS consumers on macOS, /tmp/rp2-e2e |
| 17:44 | API-07 | Completed | Pass | ESM+CJS consumers pass; npm ls uuid empty; published 2.0.0 has uuid@13.0.2 |
| 17:44 | API-04 | Started | | guard mutation in worktree smoke script (restored after) |
| 17:45 | API-04 | Completed | Pass | mutated guard -> AssertionError at run-package-smoke.js:600 exit 1; restored -> readonlyWal pass |
| 17:46 | API-02 | Completed | Pass | amd64 node 24.22.2 non-root: ci/typecheck/test/build/audit/test:package exit 0; uuid absent |
| 17:46 | API-03 | Completed | Pass | amd64 root: skip line + readonlyWal skipped-root, both result pass |
| 17:46 | API-06 | Checkpoint | | release steps ok up to dry-run publish, which refuses existing 2.0.0 (version intentionally unchanged); rerunning with container-only prerelease bump |
| 17:49 | API-06 | Completed | Pass | npm 11.19.1 -> 11.21.1; ci/build ok; bumped dry-run publish exit 0 (unbumped refusal expected) |
| 17:49 | API-08 | Completed | Pass | docs review + claim checks |
| 17:49 | API-09 | Completed | Not Tested | post-merge GitHub run; baseline captured; handed to delivery |
| 17:49 | — | Completed | Pass | /tmp/rp2-e2e removed; committing |
