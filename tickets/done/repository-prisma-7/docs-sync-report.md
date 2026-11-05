# Docs Sync Report — repository-prisma-7 Part A

## Scope

- Ticket: `repository-prisma-7` Part A (Project Task `repository-prisma-7`); `task_size = Small`, `architectural_risk = High`, route `Reviewed` (architecture review, CRR-001 source review, API/E2E; test-code review CRR-002 Not Applicable)
- Trigger: code reviewer handoff (CRR-001 Pass; API-REV-001 Pass at 94.8%)
- Bootstrap base reference: `origin/main@32f003d`
- Integrated base reference used for docs sync: `origin/main@32f003d` (refreshed 2026-11-05 ~06:15Z, not advanced; the ticket branch is a fast-forward of it). Ticket head `a275b8e`, code `bcf2be0`.
- Post-integration verification reference: `evidence/DE-01-delivery-rerun.log` (on `a275b8e` plus the delivery README edit)

## Why Docs Were Updated

- Summary: the change adds the public error code `SQLITE_DRIVER_UNAVAILABLE`, pins the major in the README install lines, documents pnpm's minimum-release-age behavior, adds a release-guide reminder about the pinned major, and records how to test real driver failures. README, DESIGN.md, CHANGELOG and TESTING.md were updated in the change (`bcf2be0`, `a275b8e`).
- Delivery made one edit, resolving FU-001: the README wrong-ABI remedy, which this change added, named only `npm rebuild better-sqlite3`. In a pnpm project with npm 12 that command exits 0 but leaves the module unloadable. It now reads "`npm rebuild better-sqlite3` (pnpm: `pnpm rebuild better-sqlite3`)".
  - Evidence (API-04): `pnpm rebuild better-sqlite3` gives `RESULT ok` in Part 1 (macOS pnpm 11), Part 2 (macOS pnpm 12) and the Part 3 rerun (Linux x64 pnpm 12, Node 24). npm 12's `npm rebuild` stays `SQLITE_DRIVER_UNAVAILABLE`.
  - The first Part 3 4c attempt failed only because the harness could not find the tarball (`Failed to read local tarball`).
  - Scope: the text was introduced by this change, so per the team's ticket-scope rule the fix belongs to this ticket. The code reviewer suggested the same.
- Why this should live in long-lived project docs: consumers who meet the new error code are sent to this README section, so its remedy must work for every package manager it names.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design document | Updated (in this change; verified) | The §E bullet matches `sqlite-driver-adapter.ts` `isSqliteDriverLoadFailure`: the bindings prefix, `ERR_DLOPEN_FAILED`, the `cause` chain (5 errors, cycle-safe, never throws), the `$connect` catch in `lifecycle.ts`, the fallback to `CONNECTION_FAILED`, the unchanged lazy path, and the coupling to the README heading (API-06 shows `README.md:38:### Allow the native SQLite build`). |
| `TESTING.md` (testing guideline) | Testing guideline | Updated (in this change; verified) | `sqlite-driver-unavailable` is listed as a fake-client suite, which matches the test file. The new "real native-driver failures" bullet matches API-02..04. Its npm 12 / pnpm note is consistent with the delivery README fix. |
| `README.md` § Release (Tag-Based) (release guide per `AGENTS.md`) | Release guide | Updated (in this change; verified) | It now reminds maintainers to update the pinned major (`repository_prisma@2`) in a major release. This is accurate. Part B (release 2.1.0, a minor) needs no pin change. |
| `README.md` setup, "Allow the native SQLite build", codes list | Consumer guidance | Updated (in this change) + delivery edit (FU-001) | Pinned install lines, the release-age paragraph, the new heading and anchor, the `SQLITE_DRIVER_UNAVAILABLE` text and the lazy-path note match the code and evidence (API-02..06, IMP-06). Delivery added the pnpm rebuild command. |
| `CHANGELOG.md` `## Unreleased` | Change record | Updated (in this change; verified) | The two new entries match. `version` is `2.0.0` and there are no tags (API-06). |
| `AGENTS.md` | Project instructions | No change | Still accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md`, `DESIGN.md`, `CHANGELOG.md`, `TESTING.md` | In this change (`bcf2be0`, `a275b8e`) | New code, pinned major, pnpm release age, release-guide pin reminder, driver failure detection, real-driver test guidance | REQ-001..003 |
| `README.md` | Delivery edit | Wrong-ABI remedy: adds `(pnpm: pnpm rebuild better-sqlite3)` | FU-001 (API-04) |
| `tickets/.../follow-ups.md` | Delivery annotation | FU-001 marked "Not to be sent: resolved in this ticket" | FU-001 resolved here |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Driver-load failure detection | Shapes, chain limit, fallback, explicit path only, coupling to the README heading | `design-spec.md` DEC-001..003 | `DESIGN.md` §E |
| Testing real driver failures | Throwaway consumers; "not built" and "wrong ABI" setups; check the remedy per package manager | API-02..04 | `TESTING.md` |
| Pinned major and pnpm release age | Why the install lines pin `@2`; update the pin on a major | DEC-004, IMP-06, API-05 | `README.md` setup and release guide |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| A missing or wrong-ABI native module reported as `CONNECTION_FAILED` on `initializePrisma` | `SQLITE_DRIVER_UNAVAILABLE` | README codes list; DESIGN.md §E; CHANGELOG |
| Unpinned install lines | `repository_prisma@2` | README setup |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: commit the delivery edit, archive, merge to `main`, then the post-merge CI run
- Notes: Part B (release) follows as a separate `Release Requested` step from the Solution Designer.
