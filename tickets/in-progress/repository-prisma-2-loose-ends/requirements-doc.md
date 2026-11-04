# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `repository-prisma-2-loose-ends`
- Request / ticket: Project Task `repository-prisma-2`
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-04
- Approved by and reference: `Solution Designer within the direction (user informed)`. The Task names every item and its expected fix; the decisions below are solution details within it. No `Needs user` decision. The user is informed in the conversation.
- Exact approved requirements baseline: `SR-001`
- Behavior-defining supplements: none

## Problem And Desired Outcome

Five small loose ends: CI and release run on an end-of-life Node; the package smoke fails as root; the release guide lacks a target and pre-tag checks; DESIGN.md has no home for design cases; and the lockfile carries 9 advisories plus an unused runtime dependency. Desired: all five fixed, CI green on `main`, merged and cleaned up, no release.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | CI/release on Node 20; actions v4 run on the deprecated Node 20 runtime | Workflows build on Node 24; actions on a Node 24 runtime | Same steps and order; trusted publishing with npm ≥ 11.5.1 | workflows, probes |
| BEH-002 | Operational | `test:package` fails as root at the read-only WAL case | As root, that one case is skipped with a visible reason; everything else still runs | Non-root runs keep the full assertion | smoke script, upgrade evidence |
| BEH-003 | Contract (docs) | Release guide: tag and push only | Names `main` as finalization target and lists the pre-tag checks and the post-publish check | Tag-based flow, trusted publishing | README, 2.0.0 report |
| BEH-004 | Contract (docs) | DESIGN.md has no design-cases section | Has one, with the first case | Existing sections | DESIGN.md |
| BEH-005 | Contract | Published manifest declares unused `uuid`; dev lockfile has 9 advisories | No `uuid`; `npm audit` reports 0 | Public API, peers, engines, dist content | audit, probes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | CI validates `main` and PRs; the release workflow publishes on a tag | SCN-001 |
| UC-002 | A maintainer runs `npm run test:package`, including as root (e.g. a Docker build) | SCN-002 |
| UC-003 | A maintainer releases following the README | SCN-003 |
| UC-004 | Designers and reviewers record and read design cases | SCN-004 |
| UC-005 | Maintainers and consumers install with no known advisories and no unused dependency | SCN-005 |

### Out Of Scope

A release, tag or version bump; runtime source changes; major-version upgrades of tooling (tsup 9, TypeScript 7, vitest 5, @types/node 26, uuid 14); adding `test:package` to CI; the agent-package change about creating DESIGN.md (separate ticket).

### Non-Goals

Making the read-only WAL check work as root by another mechanism.

### Preserved Behavior Boundary

All library behavior (no `src/` change); the published `dist` content; peers and engines; the existing workflow steps' purpose.

### Prerequisites

None.

### Review Authority

As in the team's standard: blocking findings must cite a REQ/AC/BEH; scope-changing proposals are Requirement Gaps.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Feasibility Evidence | Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `ci.yml` and `release.yml` use Node 24 and actions whose runtime is Node 24 | BEH-001 | Must | Node 24.22.2 probe passes; `action.yml@v5` `using: node24` | DEC-001, DEC-002 |
| REQ-002 | The release workflow still guarantees npm ≥ 11.5.1 for trusted publishing, without downgrading the npm that Node 24 bundles | BEH-001 | Must | Node 24.22.2 bundles npm 11.19.1 | DEC-003 |
| REQ-003 | As root, `test:package` passes. The read-only WAL case is skipped with a reason printed in the smoke output; non-root runs still execute and assert it | BEH-002 | Must | upgrade evidence API-04 | DEC-004 |
| REQ-004 | README release guide names `main` as the finalization target and lists the pre-tag checks and the post-publish verification | BEH-003 | Must | 2.0.0 practice | DEC-005 |
| REQ-005 | DESIGN.md has a "Design cases" section saying what a case records, with the transaction-isolation case as the first entry | BEH-004 | Must | — | DEC-006 |
| REQ-006 | `uuid` (runtime) and `@types/uuid` (dev) are removed, plus the `uuid` tsup external; `npm audit` reports 0 vulnerabilities on the lockfile; typecheck, tests, build and test:package pass | BEH-005 | Must | probes | DEC-007 |
| REQ-007 | CHANGELOG has an `## Unreleased` entry recording the consumer-visible change (uuid removed) and the tooling/CI changes; no version bump | BEH-005 | Must | — | DEC-008 |
| REQ-008 | CI is green on `main` after merge | all | Must | — | Task |

## Acceptance Criteria

| AC ID | REQ | Trigger | Observable Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-008 | push to `main` | CI run succeeds; log shows Node v24.x; no "Node.js 20 is deprecated" actions warning | GitHub CI run |
| AC-002 | REQ-001, REQ-002 | review `release.yml` | Node 24, actions v5, an npm step that ensures ≥ 11.5.1 without pinning below the bundled version | file review + `npm view npm@<spec> version` |
| AC-003 | REQ-003 | `npm run test:package` as root (Docker/Linux) and as non-root | Root: both checks `"result":"pass"`; the output names the skipped read-only WAL case and why. Non-root: the case runs and passes | logs |
| AC-004 | REQ-004, REQ-005 | docs review | README and DESIGN.md content as required | review |
| AC-005 | REQ-006 | fresh `npm ci` | `npm audit` = 0; `npm ls uuid` empty; typecheck, 113 tests, build, test:package pass; `npm pack` manifest has no `dependencies.uuid` | logs |
| AC-006 | REQ-007 | review | CHANGELOG `## Unreleased` entry; `version` still 2.0.0 | review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | GitHub Actions | Validate and publish | push / tag | green runs on a supported Node | Supported Normal |
| SCN-002 | Operational | Maintainer / container build | Package validation as root | `npm run test:package` as uid 0 | passes, skip visible | Supported Explicit Edge (Task names Docker builds) |
| SCN-003 | Operational | Maintainer | Release | README guide | safe, checked release | Supported Normal |
| SCN-004 | Operational | Designers / reviewers | Learn from past design mistakes | design and review work | cases findable in DESIGN.md | Supported Normal |
| SCN-005 | Operational/Contract | Maintainer, consumer | Clean install | `npm ci` / `npm install repository_prisma` | no advisories, no unused dep | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## Decisions

| ID | Question | Reasoning And Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Node 22 or 24? | Node 24 has maintenance support until 2028-04-30 (Node 22 until 2027-04-30) and is inside Prisma 7's range. Measured green locally with Node 24.22.2 + npm 11.19.1. **Node 24.** | Solution Designer | Decided |
| DEC-002 | Which action majors? | v5 of checkout and setup-node runs on Node 24 with no behavior change relevant here. v7 setup-node removes the dummy `NODE_AUTH_TOKEN`, and v6 checkout changes credential persistence; neither can be proven for the release workflow before a real release. **v5.** | Solution Designer | Decided |
| DEC-003 | npm step in release | `npm i -g npm@11.5.1` would downgrade Node 24's npm 11.19. **Install `npm@^11.5.1`** (newest 11.x, never below 11.5.1). | Solution Designer | Decided |
| DEC-004 | Root: skip or another technique? | Root bypasses file permissions; alternatives (immutable flags, read-only mounts) need privileges or platform specifics. The error mapping is also covered in vitest. **Skip with a printed reason; record it in the smoke's JSON result.** | Solution Designer | Decided |
| DEC-005 | Release guide content | Mirror the steps that 2.0.0 used successfully. | Solution Designer | Decided |
| DEC-006 | Design-case content | Start with CR-001 (single-connection transaction isolation). | Solution Designer | Decided |
| DEC-007 | How to fix the advisories | `npm audit fix` within semver, run with npm 11 (npm 10.9.8 crashes, Reproduced). No major-version upgrades. | Solution Designer | Decided |
| DEC-008 | CHANGELOG | An `## Unreleased` entry. Whether to publish a patch is a separate release decision. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-005 | UC-004 | BEH-004 | AC-004 | SCN-004 |
| REQ-006 | UC-005 | BEH-005 | AC-005 | SCN-005 |
| REQ-007 | UC-005 | BEH-005 | AC-006 | SCN-005 |
| REQ-008 | UC-001 | all | AC-001 | SCN-001 |

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (within the direction). Ready for design: `Yes`.
