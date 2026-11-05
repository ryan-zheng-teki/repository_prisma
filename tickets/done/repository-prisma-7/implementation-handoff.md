# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (`architectural_risk = High`); ARCH-REV-001 `Pass` at SR-001. The architecture reviewer handed Part A to implementation. Part B (the release) is not part of this work.
- Requirements doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/requirements-doc.md` (Approved, SR-001)
- Investigation notes: `.../repository-prisma-7/investigation-notes.md`
- Solution revision record: `.../repository-prisma-7/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/design-spec.md` (SR-001, Part A, Ready)
- Supplemental task artifacts: `probes/README.md`, `probes/driver-failure-inspect.mjs`, `probes/lazy-coded-error-inspect.mjs` (evidence only)
- Design review report: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/design-review-report.md` (ARCH-REV-001)
- Architecture review revision record: `.../repository-prisma-7/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)
- Workspace: worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7`, branch `codex/repository-prisma-7-driver-error-and-release`. Implementation commit `bcf2be0` on `feeedf6` (base `origin/main@32f003d`). This handoff and `evidence/` are in the next ticket commit.
- Not committed by me, left for their owners: the architecture reviewer's `design-review-report.md` and `architecture-review-revision-record.md` (untracked), and the uncommitted edits to `design-spec.md` and `solution-revision-record.md`.

## Current Implementation Summary

- New public code `SQLITE_DRIVER_UNAVAILABLE` (`initialization-error.ts`). Its message is path-free: "The SQLite driver (better-sqlite3) could not load its native module. Allow its build or rebuild it for this Node.js version; see "Allow the native SQLite build" in the repository_prisma README."
- `isSqliteDriverLoadFailure(error: unknown): boolean` in `sqlite-driver-adapter.ts` returns true when:
  - `code === 'ERR_DLOPEN_FAILED'`, or
  - a string `message` starts with "Could not locate the bindings file",

  on the error or in its `cause` chain. The walk inspects at most 5 errors (the error and four causes), stops on a cycle, and never throws: property reads are inside `try`.
- `lifecycle.ts` `$connect()` catch: `isSqliteDriverLoadFailure(error) ? 'SQLITE_DRIVER_UNAVAILABLE' : 'CONNECTION_FAILED'`. The file is now 487 lines (+3). The lazy path is unchanged (DEC-002).
- Package smoke: the code is in the consumer type check (`consumer-types.js`) and in the packed-declaration marker list (`packed-artifact.js`, the reviewer's recommendation).
- README:
  - `### Allow the native SQLite build` heading, and a `### Schema, configuration and client` heading after it;
  - the symptom now names the new code, plus the lazy-path note and the other-Node.js-version rebuild note;
  - the code list entry;
  - `@2` in the npm and pnpm install lines, with the pnpm release-age paragraph;
  - the release-section reminder.
- DESIGN.md §E: a bullet on the classifier, the fallback, the lazy path, and the README-heading coupling.
- CHANGELOG `## Unreleased`: two bullets.
- TESTING.md: `sqlite-driver-unavailable` added to the list of fake-client test files.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review, API/E2E, delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Three source files gain 3-42 lines each, plus one new test file, two smoke lists and docs (Small).
  - The public error-code union grows, and one class of failures changes from `CONNECTION_FAILED` to the new code (High, additive).
- Escalation check (the design's trigger): the native-load failure does reach `$connect()` on every supported path. That holds for the prisma-client-js client in ESM and CJS, and for a registered `prisma-client` module (IMP-05, sections 1 and 3). Classification needs only the error itself. No Design Impact.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (AC-001, AC-002, AC-003) | `$connect` failure classified | `lifecycle.ts` `performInitialization` `$connect()` catch -> `isSqliteDriverLoadFailure` (`sqlite-driver-adapter.ts`) -> `InitializationStageFailure` -> `rejectRequest` with diagnostics | AC-001: (a)-(c) give `SQLITE_DRIVER_UNAVAILABLE` with the exact message; there is no `cause` property and no path; the diagnostic gets the raw error and the new code; the client disconnects once; the lifecycle then throws `CLIENT_NOT_READY`. (d) stays `CONNECTION_FAILED` (IMP-02). AC-002 against the real driver: see IMP-05. AC-003: typecheck, declaration smoke, `test:package` (IMP-01, IMP-03). The real `CONNECTION_FAILED` cases are unchanged (`registration-recovery` missing directory; the `cjs-runtime` missing parent). |
| BEH-002 (REQ-002) | Lazy path unchanged, documented | — | IMP-05: lazy missing module throws the raw `Error` "Could not locate the bindings file"; lazy ABI mismatch throws `PrismaClientKnownRequestError` `ERR_DLOPEN_FAILED`. Both are described in the README, DESIGN and CHANGELOG. |
| BEH-003 (AC-004) | README pinned major and pnpm note | `README.md` | Fresh consumers on npm 12.2.1, pnpm 11.28.9 and pnpm 12.16.1 follow only the README while 2.0.0 is about 15 hours old. They install 2.0.0, and pnpm records `minimumReleaseAgeExclude: repository_prisma@2.0.0`. ESM and CJS both reach `RESULT ok` (IMP-06). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Part B was not touched: no version bump, CHANGELOG still `## Unreleased`, no tag.

## Key Files Or Areas

`src/lib/client/initialization-error.ts`, `src/lib/client/sqlite-driver-adapter.ts`, `src/lib/client/lifecycle.ts`, `src/tests/sqlite-driver-unavailable.test.ts` (new), `scripts/package-smoke/consumer-types.js`, `scripts/package-smoke/packed-artifact.js`, `README.md`, `DESIGN.md`, `CHANGELOG.md`, `TESTING.md`.

Decisions within the design, for the reviewer:
1. **Depth:** "bounded depth" is implemented as at most 5 inspected errors (the error plus four causes). Tests pin both edges: four causes deep is recognized, and five is not.
2. **Plain objects:** a thrown plain object with `code: 'ERR_DLOPEN_FAILED'` is recognized; the rule reads `code` and `message`, not `instanceof Error`. Thrown strings are not inspected: the bindings loader throws an `Error`.
3. **Second README heading:** `### Schema, configuration and client` is new. Without it, the schema, config and first-use steps would sit under the new "Allow the native SQLite build" heading.
4. **README rebuild note:** names only `npm rebuild better-sqlite3`, which IMP-05 section 4 verified. For Electron it says "rebuild it against Electron's Node.js" and names no tool, as in the design.
5. **TESTING.md:** I added `sqlite-driver-unavailable` to the fake-client file list, so the guideline doesn't imply that test proves the real driver. The design said to leave TESTING.md alone unless a new testing method is introduced. This is a list correction, not a new layer. The consumer E2E stays ad hoc, as TESTING.md already describes.
6. **Message:** the design's wording is kept unchanged.

## Important Assumptions

- `$connect()` rejects with the driver's own error object, not a wrapper. This held in every real case (IMP-05). The cause walk covers wrapping defensively.

## Known Risks

- **Detection relies on two driver-side shapes.** These are the `bindings` message and Node's `ERR_DLOPEN_FAILED`. If either changes, the result falls back to `CONNECTION_FAILED`, which is today's behavior (DESIGN.md §E).
- **Message coupling.** The message cites the README heading; renaming the heading needs a message update (recorded in DESIGN.md §E).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the driver knowledge sits in `sqlite-driver-adapter.ts`, and the lifecycle only asks it, keeping `lifecycle.ts` under 500 lines.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no dual code)
- Legacy old-behavior retained in scope: `No`. The README's old "`initializePrisma` then rejects with `CONNECTION_FAILED`" symptom text is replaced.
- Dead code in the touched files and modules removed: `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `lifecycle.ts` 487 lines, `sqlite-driver-adapter.ts` 70, `initialization-error.ts` 99.

## Persisted Data Transition Check

`Not Affected`.

## Environment Or Dependency Notes

- E2E tools: npm 12.2.1 and pnpm 12.16.1 from temporary prefixes (`/tmp/rp6-*-prefix`), and pnpm 11.28.9 from `/tmp/rp7/pnpm11-prefix`. Node v22.23.1 (ABI 127) is the default; Homebrew Node v25.2.1 (ABI 141) is the "other Node.js version".
- The registered prisma-client consumer compiles the generated client with the repo's `tsc`, as the package smoke does (`importFileExtension = "js"`, ESM `package.json` in the generated folder).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/evidence/`. Probe scripts are in `evidence/IMP-05-06-consumer-scripts/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `npm run typecheck` | `bcf2be0` | macOS 26.5.2 arm64, Node 22.23.1, npm 10.9.8, uid 501 | both tsc programs + program check | AC-003 | Pass | `evidence/IMP-01-typecheck.log` | `exit=0`; `"result":"pass"` |
| IMP-02 | `npm test`; then verbose `sqlite-driver-unavailable` + `registration-recovery` | `bcf2be0` | same | lifecycle, classifier, the real missing-directory case | AC-001 | Pass | `evidence/IMP-02-npm-test.log` | `Test Files  17 passed (17)`, `Tests  167 passed (167)`; `(d) keeps CONNECTION_FAILED`; `accepts a different client after initializePrisma failed to connect` |
| IMP-03 | `npm run test:package` (non-root) | `bcf2be0` | same | packed declarations (new marker), consumer types (new code), CJS missing-parent `CONNECTION_FAILED` | AC-003 | Pass | `evidence/IMP-03-test-package.log` | both `"result":"pass"`; `"readonlyWal":"pass"` |
| IMP-04 | Mutations: the classifier always `false`, then always `true`; run the new suite + `registration-recovery`; restore | `bcf2be0` (working tree, restored) | same | the guards | AC-001 | Pass (the guards fail under mutation) | `evidence/IMP-04-mutation-checks.log` | always false: `Tests  9 failed`; always true: `Tests  12 failed`, including `registration-recovery ... accepts a different client`; `working tree restored` |
| IMP-05 | `run-ac002.sh`: an npm 12 consumer of the packed build following the README. (1) Native module missing (install script blocked); (2) README fix; (3) module built under Node 22 (ABI 127) run with Node 25 (ABI 141); (4) README rebuild; (5) baseline: published 2.0.0 with the module missing. Runs ESM, CJS, a registered prisma-client module, and lazy ESM | `bcf2be0` packed | macOS arm64, npm 12.2.1, Node 22.23.1 / 25.2.1 | real driver path | AC-002, BEH-002, escalation check | Pass | `evidence/IMP-05-ac002-real-driver.log` | (1) and (3): `RESULT failed SQLITE_DRIVER_UNAVAILABLE` ×3 (ESM, cjs, registered prisma-client), `diagnostic: SQLITE_DRIVER_UNAVAILABLE` with the cause `Could not locate the bindings file` / `cause.code = ERR_DLOPEN_FAILED`; lazy `RESULT failed (lazy) Error` / `PrismaClientKnownRequestError ERR_DLOPEN_FAILED`. (2) and (4): `RESULT ok` ×3. (5): `RESULT failed CONNECTION_FAILED` |
| IMP-06 | `run-ac004.sh`: fresh README-only consumers with `repository_prisma@2` on npm 12.2.1, pnpm 11.28.9 and pnpm 12.16.1; ESM and CJS | README at `bcf2be0`; registry 2.0.0 (published 2026-11-04T15:10Z, ~15 h old) | macOS arm64, Node 22.23.1 | README install guidance | AC-004 | Pass | `evidence/IMP-06-ac004-readme-consumers.log` | `installed repository_prisma: 2.0.0` ×3; pnpm: `Added 1 entry to minimumReleaseAgeExclude ...` `repository_prisma@2.0.0`; `RESULT ok` and `RESULT ok (cjs)` for each |

- Not run, and why:
  - The packed build on Linux x64 (CI parity): no toolchain or CI change in this part.
  - AC-002 with pnpm, and on Electron: the README's Electron line is guidance only.
  - Part B (AC-005): not in this work.

## Frontend Rendered-Result Check

`Not Applicable`: library error classification and docs.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 on Linux x64 (`node:24-bookworm`, user `node`): remove `node_modules/better-sqlite3/build`, then run explicit init in ESM and CJS.
- A lazy-path regression check: the first query still surfaces the driver error (DEC-002).
- AC-004 again once 2.0.0 is older than a day: pinned installs keep working, and no exclusion entry is added.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. After code review, API/E2E validates AC-001..AC-004 independently. The E2E runs above are implementation-scoped evidence that the reviewer asked for, not API/E2E sign-off.
