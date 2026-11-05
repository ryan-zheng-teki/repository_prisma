# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 07:10 | API-01 | Completed | Pass | Reused IMP-01..06 on bcf2be0; bcf2be0..HEAD outside tickets empty |
| 07:10 | API-02 | Started | | docker volume rp7e-linux, node:24 amd64 user node, npm 12 consumer (background); API-03 follows in node:22 |
| 07:11 | API-04 | Started | | macOS pnpm 11 then pnpm 12 tarball consumers (/tmp/rp7e/pnpm-c11, pnpm-c12) |
| 07:12 | API-02 | Completed | Pass | Linux x64 npm 12: missing -> SDU ESM/CJS, lazy raw driver error; README fix RESULT ok x4 |
| 07:12 | API-03 | Completed | Pass | Linux x64 ABI 137 on Node 22: SDU (ERR_DLOPEN_FAILED) ESM/CJS, lazy raw; npm rebuild (npm 10) -> ok |
| 07:12 | API-04 | Checkpoint | | macOS pnpm 11: npm 11.6.2 rebuild fixes ABI; pnpm 12 + npm 12 rebuild silently no-op (confound: npm 12 unsupported on Node 25); rerunning on supported Node 22->24 in Linux (API-04b) |
| 07:15 | API-04 | Completed | Pass | pnpm missing+approve ok (11,12); ABI: SDU; npm 11 rebuild ok, pnpm rebuild ok; npm 12 rebuild in pnpm project silent no-op (supported Node 24, API-04b-3) -> recorded gap/FU; bundled npm on all Node lines is <=11.20 |
| 07:15 | API-05 | Started | | AC-004 old-enough state via consumer minimumReleaseAge: 60, pnpm 11/12; npm 12 pinned install |
| 07:17 | API-05 | Completed | Pass | post-gate pnpm 11/12 pinned -> 2.0.0, no exclusion entry, RESULT ok ESM/CJS; npm 12 ok |
| 07:17 | API-06 | Completed | Pass | message path-free, heading/anchor exist, DESIGN/CHANGELOG ok |
| 07:17 | — | Completed | Pass | /tmp/rp7e and docker volumes removed; committing |
