# Design Spec (Part A)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` Part A (Solution Designer within the direction; user informed). Part B is pending DEC-B1 and has no design yet.
- User approval of the design: `Not required` (Part A)
- Design status: `Ready` (Part A)
- Authorities read (2026-11-05): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`; project `DESIGN.md`, `TESTING.md` (both present)

## Current-State Read

- `.github/workflows/release.yml:16-19`: `actions/setup-node@v5` with `node-version: 24` and `registry-url`.
- `.github/workflows/ci.yml:13-16`: `setup-node@v5` with `cache: npm`.
- `TESTING.md:76-78`: the pnpm release-age advice.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` (two workflow lines, a few TESTING.md lines, CHANGELOG)
- Architectural risk: `Low`. This is a CI/release action version bump whose only relevant change is the removed `always-auth` line (Read in the action's source). There is no runtime, API or data change. A release-workflow fault fails the publish with nothing partially published. What stays unproven until a real release is recorded (AC-A4).
- Escalation trigger: the replica shows npm authentication behaving differently, or CI fails on v6. Return `Design Impact`.

## Change Scope (Mandatory)

- In scope:
  - `.github/workflows/release.yml` and `ci.yml`: `actions/setup-node@v5` -> `actions/setup-node@v6`, inputs unchanged;
  - `TESTING.md` § Environments: one bullet (REQ-A2 text);
  - `CHANGELOG.md` `## Unreleased`: one line (repository: setup-node v6, no more always-auth warning).
- Deliberately left alone: `actions/checkout@v5`, the npm upgrade step, `setup-node@v7`, everything in `src/`.
- Follow-ups: none.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Root cause: `No Design Issue Found` (an upstream action default)
- Refactor needed now: `No`

## Legacy Removal Policy

- Removed: setup-node@v5 in both workflows.
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Verification Guidance

- AC-A1: in `node:24-bookworm` as user `node`:
  - install npm `^11.5.1` globally as the workflow does;
  - write a job-like `~/.npmrc` the way setup-node v6 does (`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` and `registry=https://registry.npmjs.org/`, with `NODE_AUTH_TOKEN=XXXXX-XXXXX-XXXXX-XXXXX`, no `always-auth`);
  - run `npm ci` (with allowScripts), `npm run build` and `npm publish --dry-run` on a throwaway version bump inside the container;
  - expect no `always-auth` warning.

  Then run the same with an added `always-auth=false` line as a control, which shows the warning. Never publish (TESTING.md).
- AC-A2: CI on the branch or `main` passes with setup-node v6.
- AC-A4: the delivery report states that the OIDC/provenance publish with v6 is proven only at the next release.
