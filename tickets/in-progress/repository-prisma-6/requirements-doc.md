# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `repository-prisma-6`
- Request / ticket: Project Task `repository-prisma-6`
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-04
- Approved by and reference: `Solution Designer within the direction (user informed)`. The Task asks for both items and leaves the decision for item 2 to the worker; no `Needs user` decision.
- Exact approved requirements baseline: `SR-001`

## Problem And Desired Outcome

1. The package smoke script is one 739-line file mixing eight concerns.
2. npm 12 (npm's `latest`) and pnpm 10+ skip `better-sqlite3`'s native build by default. Measured:
   - the repo's tests fail on npm 12;
   - a fresh npm 12 or pnpm consumer of the published 2.0.0 fails at startup with `CONNECTION_FAILED`.

Desired outcome:
- The smoke is split into owned files with unchanged behavior and output.
- The repo records and enforces its install-script approvals.
- Consumers get clear setup instructions for npm 12 and pnpm.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | `test:package` runs one 739-line script | Same command, same checks in the same order, same final JSON (keys, order, values), from owned files each under 500 lines | All assertions and outputs | code |
| BEH-002 | Operational | No `allowScripts`. npm 11 warns; npm 12 skips `better-sqlite3`'s build, so 19 tests fail | Approvals recorded; npm 12 install is quiet and green; npm 10/11 unaffected | Install, test, build commands | probes |
| BEH-003 | Operational | CI does not notice a missing or stale approval | CI fails loudly when an install script is not covered | CI steps otherwise | probes |
| BEH-004 | Contract (docs) | README says "npm 7+ and pnpm install the peers automatically"; no word on blocked builds | README tells npm 12 and pnpm users how to allow `better-sqlite3`'s build, the symptom if they don't, and that pnpm users add `@prisma/client` directly | Rest of the setup section | probes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | Maintainer/CI runs `npm run test:package` | SCN-001 |
| UC-002 | Maintainer/CI installs the repo with npm 10, 11 or 12 | SCN-002 |
| UC-003 | A consumer installs the library with npm 12 or pnpm 10/12 | SCN-003 |

### Out Of Scope

Release; library source (`src/`); `scripts/run-esm-cjs-interop.js`; the release workflow; a clearer library error for a missing native binding (follow-up); Yarn-specific instructions beyond the existing sentence.

### Non-Goals

Rewriting smoke assertions or adding new smoke checks.

### Preserved Behavior Boundary

BEH-001 (output and assertions), library behavior, the published `dist`.

### Prerequisites

None.

### Review Authority

Team standard.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Feasibility Evidence | Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `scripts/run-package-smoke.js` is split into owned files, each under 500 lines. `npm run test:package` is unchanged and runs the same checks in the same order. The final JSON line has the same keys, order and values; console markers and the root-skip line are unchanged. | BEH-001 | Must | code | DEC-001 |
| REQ-002 | `package.json` `allowScripts` approves `better-sqlite3` (pinned to the installed version) and explicitly denies `esbuild`, `prisma`, `@prisma/engines` and `fsevents`. With npm 12: no install-script warnings; typecheck, tests, build and test:package pass on macOS arm64 and Linux x64. npm 10/11 installs are unaffected. | BEH-002 | Must | probes | DEC-002, DEC-003 |
| REQ-003 | CI's install uses `--strict-allow-scripts`, so an uncovered or stale approval fails the install with `ESTRICTALLOWSCRIPTS` | BEH-003 | Must | probe | DEC-004 |
| REQ-004 | README setup section: npm 12+ and pnpm 10+ skip `better-sqlite3`'s native build by default; the symptom (`CONNECTION_FAILED`, diagnostic "Could not locate the bindings file"); the fix per package manager (npm: `npm install-scripts approve better-sqlite3` then reinstall; pnpm 10: `onlyBuiltDependencies`; pnpm 11+: `pnpm approve-builds better-sqlite3`); and, for pnpm, add `@prisma/client` as a direct dependency. The incorrect "pnpm installs the peers automatically" wording is fixed. | BEH-004 | Must | probes | DEC-005 |
| REQ-005 | README Testing/maintainer text records the repo's approval policy: which packages are approved or denied and why; re-approve after upgrading `better-sqlite3` (`npm install-scripts approve better-sqlite3`); CI is strict. CHANGELOG `## Unreleased` notes the README guidance and the repo policy. | BEH-002, BEH-003 | Must | — | DEC-006 |

## Acceptance Criteria

| AC ID | REQ | Trigger | Observable Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `npm run test:package` before and after, as non-root and as root | Same final JSON apart from the temporary `cleanup` path; same markers; every new file < 500 lines (`wc -l`) | logs, diff of outputs |
| AC-002 | REQ-001 | A deliberate break in one moved check (e.g. bundling the adapter, or a leaked secret) | The split smoke still fails on it | mutation log |
| AC-003 | REQ-002 | npm 12.2.1 `npm ci` + checks on macOS arm64 and Linux x64 | No install-script warnings; 113 tests; build; test:package pass | logs |
| AC-004 | REQ-002, REQ-003 | npm 11.19.1 (Node 24) `npm ci --strict-allow-scripts`; then with a stale pin | Passes; stale pin -> `ESTRICTALLOWSCRIPTS` | logs |
| AC-005 | REQ-003 | push to `main` | CI green with the strict install | GitHub run |
| AC-006 | REQ-004 | A fresh consumer following only the README, with npm 12 and with pnpm 12 | App works (`initializePrisma` + query) | logs |
| AC-007 | REQ-005 | review | README/CHANGELOG content as required; version unchanged | review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Maintainer / CI | `npm run test:package` | identical results | Supported Normal |
| SCN-002 | Operational | Maintainer / CI | `npm ci` on npm 10/11/12 | green, no unreviewed scripts | Supported Normal |
| SCN-003 | User | Consumer developer | install with npm 12 or pnpm | working app by following the README | Supported Normal (npm 12 is npm `latest`; the known consumer uses pnpm 10) |

## UI, Interaction, And Experience Requirements

- Applicable: `No`.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## Decisions

| ID | Question | Reasoning And Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | How to split the smoke | One file per check area (owned step modules) plus a small runner, moved rather than rewritten. Details in the design. | Solution Designer | Decided |
| DEC-002 | Which scripts to approve | Only `better-sqlite3` is needed. Measured: without it 19 tests fail; without the other four, everything passes on macOS arm64 and Linux x64. Least privilege: approve the one needed, deny the rest explicitly, so the decision is visible and npm stops asking. | Solution Designer | Decided |
| DEC-003 | Pinned or name-only approval | Pinned (npm's default). An upgrade is re-reviewed; CI strict mode (DEC-004) makes a forgotten re-approval fail loudly instead of silently skipping the build. | Solution Designer | Decided |
| DEC-004 | Enforce in CI? | `npm ci --strict-allow-scripts` in `ci.yml` (Node 24 / npm 11.19 supports it, Measured). Not in `.npmrc`: npm 10 users would get unknown-config warnings. The release workflow stays unchanged; CI must be green before tagging per the README. | Solution Designer | Decided |
| DEC-005 | Consumer note scope | Include the pnpm `@prisma/client` direct-dependency step. Without it, the pnpm instructions still end in a failing `prisma generate` (Reproduced), so a pnpm note would be wrong without it. | Solution Designer | Decided |
| DEC-006 | Where to record the decision | Ticket evidence (this package), README maintainer text, CHANGELOG `## Unreleased`. | Solution Designer | Decided |

## Consumer Reach

- README text reaches consumers on npm only with the next release; on GitHub it is visible at once.
- The `allowScripts` field ships in the published `package.json`. npm ignores it for dependencies, so it has no effect on consumers.
- A patch release is a separate user decision.

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-003, AC-004 | SCN-002 |
| REQ-003 | UC-002 | BEH-003 | AC-004, AC-005 | SCN-002 |
| REQ-004 | UC-003 | BEH-004 | AC-006 | SCN-003 |
| REQ-005 | UC-002 | BEH-002, BEH-003 | AC-007 | SCN-002 |

## Readiness Check

- Content ready: `Yes`. Approval recorded: `Yes` (within the direction). Ready for design: `Yes`.
