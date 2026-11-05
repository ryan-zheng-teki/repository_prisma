# Requirements Document

## Document Status

- Status: Part A `Approved`. Part B `Ready for Approval`: the build-or-not decision needs the user (DEC-B1).
- Current solution revision ID: `SR-001`
- Package identifier: `repository-prisma-8`
- Request / ticket: Project Task `repository-prisma-8` (repository-prisma-4 merged in)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-05
- Approved by and reference: Part A, `Solution Designer within the direction (user informed)`. Part B: pending the user (the Task requires the user's agreement for a decision not to build, and the user's approval for public API decisions).
- Exact approved requirements baseline: `SR-001` (Part A only)

## Part A: Small Fixes

### Requirements

| ID | Requirement | Evidence | Decision |
| --- | --- | --- | --- |
| REQ-A1 | The release workflow no longer writes `always-auth` into the job's `.npmrc`, so npm prints no `Unknown user config "always-auth"` warning. Trusted publishing (OIDC, `--provenance`) keeps the same npm authentication setup. | setup-node v6.1.0 removed always-auth handling; v6 keeps the same token setup | DEC-A1 |
| REQ-A2 | `TESTING.md` § Environments says that pnpm also caches registry metadata. To test a just-published version, use an empty cache (e.g. `npm_config_cache_dir=<tmp dir>`) in addition to the `minimumReleaseAgeExclude` entry, or check with `pnpm cache view <pkg>` that the version is listed. | release-2-1-0 REL-05/06 | DEC-A2 |

### Acceptance Criteria

| ID | REQ | Outcome | Verification |
| --- | --- | --- | --- |
| AC-A1 | REQ-A1 | `release.yml` uses `actions/setup-node@v6` with the same inputs. A replica of the job's npm steps on Node 24 (with an `.npmrc` as v6 writes it: registry + `_authToken=${NODE_AUTH_TOKEN}`, dummy token, no `always-auth`), through `npm publish --dry-run --provenance=false` of a throwaway version, shows no `always-auth` warning | container log; file review |
| AC-A2 | REQ-A1 | `ci.yml` also uses `setup-node@v6` (same major in both workflows); CI green on `main` | GitHub run |
| AC-A3 | REQ-A2 | TESTING.md text present and accurate | review |
| AC-A4 | REQ-A1 | Unproven until the next real release: the OIDC `npm publish --provenance` under setup-node v6. Recorded in the ticket and the delivery report | report |

### Decisions

| ID | Reasoning And Decision | Owner | Status |
| --- | --- | --- | --- |
| DEC-A1 | Options: (a) setup-node v6, (b) drop `registry-url`, (c) override `.npmrc` after setup-node. v6 removes exactly the always-auth line and keeps the token handling identical to v5. (b) changes the authentication setup, which can't be proven before a release. (c) adds a workaround step. **(a), applied to both workflows** for consistency; `checkout` stays at v5. | Solution Designer | Decided |
| DEC-A2 | Use the command delivery verified (REL-06b). | Solution Designer | Decided |

## Part B: Application-Supplied Driver Adapter

### Problem And Outcome To Verify

The user's idea: an application passes in its own Prisma driver adapter (e.g. `@prisma/adapter-pg`), and the library uses it instead of building the SQLite one, with lifecycle, transactions, errors and diagnostics correct for that database.

### Evidence Summary (investigation notes, Part B)

- It can be done cleanly. On real Postgres 17 with the published 2.1.0 and a one-line probe patch, the library's core works unchanged: CRUD, commit and rollback, concurrent-request isolation (correct without the SQLite gate), and parallel transactions.
- What it needs: a public adapter-registration API that also covers lazy binding; a new binding kind with adapter-based identity; connect-only readiness (WAL rejected); the gate only for SQLite-provider adapters; documented loss of the library-built SQLite guarantees (DateTime format, path handling); a real-Postgres test suite with its own schema and client, a CI Postgres service and a TESTING.md layer; docs.
- If built: `Medium` / `High`, plus a permanent public API.
- No known consumer needs it.

### DEC-B1 (Needs user)

| Option | What happens | Cost | Recommendation |
| --- | --- | --- | --- |
| **B-1 Do not build now; record the decision** | DESIGN.md gets a decision record: the probe evidence, the design above, and the trigger "build when a real non-SQLite consumer appears". `UNSUPPORTED_DATASOURCE_PROVIDER` stays. | Docs only | **Recommended.** No consumer needs it. It would add permanent public API, lifecycle variants and a Postgres CI suite to maintain, for a speculative benefit. The evidence shows it can be added later cleanly, without breaking anything, when a consumer appears. |
| B-2 Build it now | `registerDriverAdapter(adapter)` (lazy and explicit), adapter-identity binding, connect-only readiness, gate only for `provider === 'sqlite'`, real-Postgres tests in CI, docs; minor release later | Medium / High; new public API; CI service | Only if the user expects non-SQLite use soon |

The user's comment allows a recommendation not to build if the evidence supports it; the Task requires the user's agreement for that decision.

## Scope Guardrail

- In scope: Part A (REQ-A1, REQ-A2). Part B per DEC-B1.
- Out of scope: a release; changes to SQLite behavior or public types (they stay as in 2.1.0); `actions/checkout` upgrades; `setup-node@v7`.
- Preserved: everything in 2.1.0's runtime and types; CI steps apart from the action version.
