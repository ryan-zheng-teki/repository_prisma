# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation (`task_size = Medium`, `architectural_risk = Low`); no architecture review selected.
- Requirements doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/requirements-doc.md` (approved, SR-001)
- Investigation notes: `.../repository-prisma-6/investigation-notes.md`
- Solution revision record: `.../repository-prisma-6/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `probes/` (consumer schema, config and app; the pnpm workspace files; `repo-allowScripts.json`). Evidence only.
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)
- Workspace: worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6`, branch `codex/repository-prisma-6-smoke-split-install-scripts`, base `origin/main@5a73159`, package commit `5528fc4`. Implementation commits:
  - `8ef7b77` refactor: smoke split (move only)
  - `23b23f3` build: `allowScripts` + strict CI install
  - `b87252c` fix: read npm 12's `npm pack --json` shape
  - `7047cdf` docs: README + CHANGELOG

  This handoff and `evidence/` are in the next ticket commit. Finalization target: `origin/main`; no release or version bump.

## Current Implementation Summary

- **Smoke split:** `scripts/run-package-smoke.js` (739 lines) is now a 43-line runner plus `scripts/package-smoke/`:
  - `harness` 67 lines, `packed-artifact` 108, `consumer-install` 33, `import-safety` 118;
  - `logging-policy` 222, `cjs-runtime` 121, `esm-runtime` 53, `consumer-types` 78.
  The runner owns the order, the result JSON and cleanup. Each step exports one function `(context, inputs?)`. Cross-step values are returned and passed by the runner: `tarballPath` and `includedPaths` from packed-artifact, `readonlyWal` from cjs-runtime.
- **Approvals:** `package.json` `allowScripts` was written by `npm install-scripts approve better-sqlite3` and `npm install-scripts deny esbuild prisma @prisma/engines fsevents` (npm 12.2.1). It holds `better-sqlite3@12.11.1: true` and the four denials. `package-lock.json` is unchanged. CI installs with `npm ci --strict-allow-scripts`.
- **npm 12 pack parsing:** the smoke now reads npm 12's `npm pack --json` shape (see Design deviation).
- **README:** the consumer setup gives the pnpm direct `@prisma/client` step, a native-build step for npm 12+, pnpm 11+ and pnpm 10, and the symptom when the build is skipped. The wrong pnpm-peers sentence is fixed. The Testing section gives the maintainers' approval policy. CHANGELOG `## Unreleased` has the entries.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review, code-review, API/E2E, delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change touches test infrastructure, install policy and docs only. There is no `src/` change, and no API, persistence or ownership change.
  - Smoke preservation is shown by the output diffs (IMP-05) and the mutation checks (IMP-06).
  - The one unplanned change (npm 12 pack parsing) stays inside the packed-artifact step's own parsing and does not change what it asserts.
  - None of the design's escalation triggers fired. No check had to change what it asserts; the strict install passes for CI's exact toolchain (IMP-09 A); and no `src/` change was needed.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`. See the design deviation below, which stays within REQ-002/AC-003.

## Design Deviation (Recorded, Within Scope)

- **npm 12 changed `npm pack --json`.** npm 10 and 11 print an array of pack records, while npm 12.2.1 prints an object keyed by package name (shown with a two-line package on npm 10.9.8, 11.19.1 and 12.2.1). The smoke parsed only the array, so `npm run test:package` failed on npm 12 with `SyntaxError: Unexpected end of JSON input`. That breaks AC-003, which requires test:package to pass on npm 12.
- **The probe evidence did not show this.** The investigation notes record "both `test:package` checks pass" on npm 12. That run most likely used `npx npm@12.2.1 ci` while the smoke's own `npm pack` still resolved to npm 10 on `PATH`. In IMP-08 and IMP-09, npm 12 is first on `PATH`, so the smoke's own npm calls use it.
- **Fix (`b87252c`):** find the JSON start at `^[[{]`, then take the array as is or `Object.values()` of the object. The checks on the record are unchanged.
- **Why I did not escalate:** it is in an in-scope file, it is required by an approved AC, and it changes no assertion. I kept it as a separate commit, so the split commit (`8ef7b77`) stays move-only and its byte-for-byte check (below) holds.

## Lightweight Implementation Self-Review

- Move-only split: a script checked that every non-blank line of the original lines 18-739, except the old `try {`, appears in order in the new files. Result: `none missing`. The generated consumer scripts (template literals) are byte-identical, because the function bodies keep the original 2-space indentation. Hand-written glue is limited to:
  - the module headers, with `require`s and the context destructuring;
  - `createSmokeContext()`, which is the former top-level setup;
  - the step `return`s;
  - the runner's calls.
  `repoRoot` is now `path.resolve(__dirname, '..', '..')`, because the harness sits one folder deeper.
- Behavior: the same steps in the same order. The same temp-root lifecycle: it is created before `try` and removed in `finally`. The same final JSON keys, order and values (IMP-05). The `.env` canary is still written before the logging and runtime steps run, as before.
- Sizes: every new file is under 500 lines; the largest is `logging-policy.js` with 222.
- Ownership: steps don't call each other; only the runner orders them. `harness.js` holds helpers only, with no checks.
- Approvals: written by npm, not by hand. The values match `probes/repo-allowScripts.json`, and the lockfile is unchanged (IMP-07).
- CI: the only change is `npm ci --strict-allow-scripts`.
- README: every consumer instruction was followed literally in fresh consumers (IMP-10). After those runs I added one sentence: pnpm 12's `pnpm add` exits 1 with `ERR_PNPM_IGNORED_BUILDS`, even though the packages are installed, and a reader would otherwise stop there.
- Not changed: `src/`, `scripts/run-esm-cjs-interop.js`, `scripts/run-tests.js`, `release.yml`, the version.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Same checks, order and output; new structure | `scripts/run-package-smoke.js` runner, then `scripts/package-smoke/*` | The normalized output is identical on macOS non-root. On Linux root it is identical apart from tsup's parallel build-line order from `npm run build`, which precedes the smoke (IMP-05). Mutations (b) and (c) fail in the owning step (IMP-06). |
| BEH-002 | `allowScripts` policy | `package.json` `allowScripts` | npm 12.2.1: no install-script warnings and the native module is built, on macOS arm64 (IMP-08) and Linux x64 (IMP-09 C). Control without approvals: 5 blocked scripts and no native module (IMP-08). npm 10 is unaffected (IMP-11). |
| BEH-003 | Strict CI install | `.github/workflows/ci.yml` | npm 11.19.1 strict passes on Linux x64 (IMP-09 A). A stale pin gives `npm error code ESTRICTALLOWSCRIPTS`, and nothing is installed (IMP-09 B). The GitHub run happens after push/merge (AC-005). |
| BEH-004 | README consumer guidance | `README.md` setup section | Fresh consumers on the published 2.0.0 with npm 12.2.1, pnpm 12.16.1 and pnpm 10.28.2 reach `RESULT ok`. Without the approval step, the README's symptom reproduces exactly (IMP-10). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

`scripts/run-package-smoke.js`, `scripts/package-smoke/*.js`, `package.json`, `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`.

## Important Assumptions

- GitHub's `ubuntu-latest` with Node 24 bundles npm 11.19.1 or another npm ≥ 11.16 that supports `--strict-allow-scripts`. The local proxy is `node:24-bookworm` linux/amd64 with npm 11.19.1 (IMP-09 A). An npm older than 11.16 would not know the flag; AC-005 (the GitHub run) confirms.

## Known Risks

- **pnpm 11+ release-age default.** It makes newly published versions invisible for a while. On pnpm 12.16.1, `pnpm add repository_prisma` silently resolved 1.0.10 (the Prisma 5 line), because 2.0.0 is too new (IMP-10 C). This is temporary for 2.0.0 and is not README material, but every future release will meet it for its first day or so. I mention it for the Solution Designer and delivery; I did not add a follow-up myself.
- **README pnpm 11 wording.** The design asked for "pnpm 11+". I verified pnpm 12.16.1 and pnpm 10.28.2, but not pnpm 11.
- **Prisma install scripts.** In consumers, `prisma` and `@prisma/engines` stay unapproved. `prisma generate` and the app work without them (IMP-10), as in the probes.
- **Run time.** Container runs used emulated linux/amd64 and are slow (several minutes); this does not affect CI.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Refactor` + `Behavior Change`
- Reviewed root-cause classification: File Placement Or Responsibility Drift (smoke)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the split follows the design's file mapping exactly. Line counts are close to the design's estimates.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The two `npm pack --json` shapes both belong to supported toolchains (npm 10 locally, 11 in CI, 12 per AC-003); neither is legacy retention.
- Legacy old-behavior retained in scope: `No`. No copy of the monolithic script remains.
- Dead code in the touched files and modules removed: `Yes`. None found; the moved code is all reached.
- Dead code found elsewhere, added to `follow-ups.md`: None. I observed one redundancy without recording it: the tsup `external` entry for `@prisma/adapter-better-sqlite3` is redundant, because tsup externalizes peers by default (IMP-06 note on mutation (a)). It is harmless and outside this ticket.
- Shared structures remain tight: `Yes`. The context holds only the former top-level locals.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. All files are under 500 lines; this resolves the earlier FU-001.

## Persisted Data Transition Check

`Not Affected`.

## Environment Or Dependency Notes

- npm 12.2.1 and pnpm 12.16.1 were installed into temporary prefixes (`/tmp/rp6-npm12-prefix`, `/tmp/rp6-pnpm12-prefix`) and put first on `PATH`; pnpm 10.28.2 is the local install. Docker 29.0.1 ran `node:24-bookworm` with `--platform linux/amd64`, emulated on arm64.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `npm run test:package` (baseline) | `5528fc4` | macOS arm64, Node 22.23.1, npm 10.9.8, uid 501 | original smoke | AC-001 | Pass | `evidence/IMP-01-baseline-test-package-macos.log` | `"readonlyWal":"pass"`; `exit=0` |
| IMP-02 | `git archive` + `docker run --platform linux/amd64 node:24-bookworm`: `npm ci`; `npm run test:package` as root (baseline) | `5528fc4` | Linux x64, Node 24.22.2, npm 11.19.1, root | original smoke | AC-001 | Pass | `evidence/IMP-02-baseline-test-package-linux-root.log` | `skip: read-only WAL case (...)`; `"readonlyWal":"skipped-root"` |
| IMP-03 | `npm run test:package` (after the split) | `8ef7b77` | as IMP-01 | split smoke | AC-001 | Pass | `evidence/IMP-03-split-test-package-macos.log` | `exit=0` |
| IMP-04 | as IMP-02 (after the split) | `8ef7b77` | as IMP-02 | split smoke | AC-001 | Pass | `evidence/IMP-04-split-test-package-linux-root.log` | `"readonlyWal":"skipped-root"`; `exit=0` |
| IMP-05 | normalize (temp dirs, durations) and `diff` the before/after outputs; `wc -l` of the new files | `5528fc4` vs `8ef7b77` | — | output equivalence | AC-001 | Pass | `evidence/IMP-05-output-diff.log` | macOS: `identical`. Linux: only the 3 tsup `CJS ...` build lines move (build-order note). Every file under 500 lines (max 222) |
| IMP-06 | Mutations on the split smoke: (a) drop the adapter from tsup `external`; (b) the generated CJS smoke prints the secret datasource path; (c) drop `DESIGN.md` from `files`; restore | `8ef7b77` (working tree, restored) | macOS | `cjs-runtime.js`, `packed-artifact.js` | AC-002 | Pass for (b) and (c). (a) was not a break: tsup externalizes peers anyway | `evidence/IMP-06-mutation-checks.log` | (b) `at checkCjsRuntime (...cjs-runtime.js:114:10)` with `actual: true`; (c) `AssertionError [ERR_ASSERTION]: missing DESIGN.md` `at checkPackedArtifact`; `working tree restored` |
| IMP-07 | `npx npm@12.2.1 install-scripts approve better-sqlite3`; `... deny esbuild prisma @prisma/engines fsevents`; `git diff package.json`; lockfile compare | `8ef7b77` worktree | macOS, npm 12.2.1 | `package.json` | REQ-002 | Pass | `evidence/IMP-07-allow-scripts-commands.log` | `"better-sqlite3@12.11.1": true` and the four `false` entries; `package-lock.json unchanged` |
| IMP-08 | archive copy, npm 12.2.1 first on `PATH`: `npm ci`, warning count, typecheck, test, build, `test:package`; control without `allowScripts` | `b87252c` | macOS arm64, Node 22.23.1, npm 12.2.1 | approvals; smoke on npm 12 | AC-003 | Pass | `evidence/IMP-08-npm12-macos.log` | `install-script warning lines (...): 0`; `better_sqlite3.node`; `Tests  113 passed (113)`; `test-package exit=0`. Control: `5 packages had install scripts blocked`, `native module present: 0` |
| IMP-09 | `docker run --platform linux/amd64 node:24-bookworm`: (A) npm 11.19.1 `npm ci --strict-allow-scripts` + test; (B) stale pin `better-sqlite3@12.10.0`; (C) npm 12.2.1: `npm ci`, typecheck, test, build, `test:package` | `b87252c` | Linux x64, Node 24.22.2, root | approvals, strict mode, smoke | AC-003, AC-004 | Pass | `evidence/IMP-09-linux-x64-npm11-strict-npm12.log` | A: `npm-ci-strict exit=0`, `warning lines: 0`, `113 passed`. B: `npm error code ESTRICTALLOWSCRIPTS`, `node_modules present after the failure: no`. C: `warning lines: 0`, `schema-engine-debian-openssl-3.0.x`, `113 passed`, `test-package exit=0` |
| IMP-10 | Fresh consumers on the published 2.0.0 following only the README: npm 12.2.1; npm 12 without approval (symptom); pnpm 12.16.1 (with a test-only release-age exclusion); pnpm 10.28.2 | published 2.0.0 + README at `7047cdf` | macOS arm64, Node 22.23.1 | README setup guidance | AC-006 | Pass | `evidence/IMP-10-readme-consumers.log` | A, D, E: `RESULT ok`. B: `diagnostic CONNECTION_FAILED Could not locate the bindings file`. C: `+ repository_prisma 1.0.10` without the exclusion |
| IMP-11 | npm 10.9.8: fresh `npm ci`, typecheck, test, `test:package`; `git diff --check 5528fc4..HEAD` | `7047cdf` | macOS arm64, Node 22.23.1, npm 10.9.8 | the whole branch on npm 10 (array pack shape) | REQ-002, AC-001 | Pass | `evidence/IMP-11-npm10-regression.log` | `113 passed`; `test-package exit=0`; `diff-check exit=0` |

- Not run, and why:
  - The GitHub CI run with the strict install (AC-005): it runs after push/merge.
  - pnpm 11 consumer: no pnpm 11 available locally; pnpm 10 and 12 were run.
  - A Windows consumer or host.

## Frontend Rendered-Result Check

`Not Applicable`: tooling, install policy and docs only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005: the CI run for the branch or PR shows `npm ci --strict-allow-scripts` succeeding on Node 24, then green on `main`.
- AC-001/002: rerun `npm run test:package` as non-root and as root and compare with IMP-01/02; optionally another mutation in a step not covered here (`import-safety`, `logging-policy`, `esm-runtime`, `consumer-types`).
- AC-006: a pnpm 11 consumer, if available; a Linux npm 12 consumer.
- AC-007: README and CHANGELOG review; `version` is still 2.0.0.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E validates AC-001..AC-007 independently, including the GitHub CI run (AC-005).
