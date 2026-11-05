# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 08:50 | API-01 | Completed | Pass | Reused IMP-01..03; e44ea62..HEAD outside tickets empty |
| 08:50 | API-02 | Started | | actionlint, diff, v6 contract |
| 08:51 | API-02 | Completed | Pass | actionlint 0 errors; only setup-node version changed; v6 inputs present; authutil diff = always-auth only; no packageManager |
| 08:51 | API-03 | Started | | real setup-node v6/v5 dist in node:24 amd64 user node, then release npm steps |
| 08:55 | API-03 | Completed | Pass | real setup-node v6 .npmrc has no always-auth; npm 11.21.2 steps 0 warnings through dry-run publish; v5 control warns 1,1,1,1,2 |
| 08:55 | API-04 | Started | | pnpm 11/12 cache-dir settings, cache view, release-2-1-0 cross-check |
| 08:56 | API-04 | Completed | Pass | npm_config ignored (0 files) on pnpm 11.28.11/12.16.1; pnpm_config_cache_dir and --cache-dir honored; cache view (default cache) works and shows stale cache lacking 2.1.0 |
| 08:58 | API-05 | Completed | Pass | TESTING.md bullet accurate; CHANGELOG Unreleased; version 2.1.0; no tags |
| 08:58 | API-06 | Completed | Not Tested | post-merge GitHub run; delivery |
| 08:58 | API-07 | Completed | Not Tested | OIDC provenance under v6 at next release (AC-A4) |
| 08:58 | — | Completed | Pass | /tmp/rp8e removed; committing |
