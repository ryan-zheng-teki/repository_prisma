# Explicit Datasource and Strict SQLite WAL Readiness — Initialization API Contract

## Artifact Metadata

- Canonical path: `tickets/in-progress/explicit-datasource-strict-wal-readiness/initialization-api-contract.md`
- Type: Supplemental public API and lifecycle contract
- Scope: `initializePrisma`, root-client acquisition, datasource identity, strict SQLite WAL readiness, failure/recovery, and diagnostics
- Status: `Approved by user — 2026-07-13`, conditional on best-practice design
- Related requirements: `REQ-RP-001`–`REQ-RP-010`
- Related acceptance criteria: `AC-RP-001`–`AC-RP-013`
- Relationship to mandatory artifacts: Clarifies externally observable behavior required by `requirements.md`; design must implement this contract without moving authority out of the mandatory requirements or design spec.

## Recommended Public Shape

```ts
export type PrismaInitializationErrorCode =
  | 'DATABASE_URL_MISSING'
  | 'DATASOURCE_CONFLICT'
  | 'CONNECTION_FAILED'
  | 'DATABASE_IDENTITY_MISMATCH'
  | 'WAL_UNSUPPORTED_PROVIDER'
  | 'WAL_ACTIVATION_FAILED'
  | 'WAL_VERIFICATION_FAILED'
  | 'CLIENT_NOT_READY';

export type PrismaInitializationDiagnostic = {
  code: PrismaInitializationErrorCode;
  cause: unknown;
};

export type InitializePrismaOptions = {
  datasourceUrl?: string;
  enableWAL?: boolean;
  onDiagnostic?: (diagnostic: PrismaInitializationDiagnostic) => void;
};

export class PrismaInitializationError extends Error {
  readonly code: PrismaInitializationErrorCode;
}

export function initializePrisma(
  options?: InitializePrismaOptions
): Promise<void>;

export function shutdownPrisma(): Promise<void>;
```

The final names may change only if architecture review finds a concrete conflict. The semantics below are authoritative for requirements approval.

## Datasource Selection and Identity

1. `options.datasourceUrl`, when a non-empty string, is the selected target.
2. Otherwise `getDatabaseUrl()` selects the target using current precedence:
   - `DATABASE_URL_TEST` when `NODE_ENV === 'test'` and that value is non-empty;
   - otherwise `DATABASE_URL`;
   - otherwise `DATABASE_URL_TEST`.
3. No effective value produces `DATABASE_URL_MISSING` before constructing a Prisma Client.
4. The selected target is passed to `new PrismaClient({ datasourceUrl: effectiveUrl, ... })`; the generated client must not independently select another environment value.
5. A relative physical SQLite `file:` target is resolved against `process.cwd()` and converted to an absolute file URL before client construction. Supported query parameters are preserved.
6. Absolute physical SQLite paths are canonicalized after connection for identity comparison. Canonicalization may resolve symlinks/platform aliases but must not log the result.
7. Physical SQLite initialization verifies `PRAGMA database_list` has exactly one `main` row matching the canonical expected target before any WAL mutation.
8. SQLite in-memory targets may initialize without WAL when Prisma supports them, but `enableWAL: true` rejects with `WAL_UNSUPPORTED_PROVIDER` because there is no physical main database that can be made WAL-ready.
9. For non-SQLite providers, the selected normalized URL is the configured identity. No SQLite identity PRAGMA is issued.

## Lazy Access and Bound-Target Rules

- Optional lazy usage remains supported. The first root/repository/proxy operation uses the same target-resolution path and passes the resolved target explicitly into Prisma Client construction.
- Public root and context-aware Prisma proxies are forwarding/revocable boundaries, not raw-client extractors: captured method or model-delegate handles resolve the current lifecycle/ALS client at invocation time and cannot retain a disconnected or failed root client across lifecycle boundaries.
- The lifecycle owner records the normalized bound target even when client creation began lazily.
- If a client is already bound, `initializePrisma` may operate on it only when the requested/effective normalized target equals the bound target.
- A different requested target rejects with `DATASOURCE_CONFLICT`; it never causes an implicit switch, dual client, or environment mutation.
- Callers switch targets only by awaiting `shutdownPrisma()` and then initializing or lazily acquiring the new target.

## Initialization and Strict WAL Semantics

### `enableWAL` omitted or `false`

- Connect the selected client.
- If the target is physical SQLite, verify the actual `main` database identity.
- Publish/mark the root client ready only after required checks pass.
- Do not issue journal-mode mutation SQL.

### `enableWAL: true`

- Reject a non-physical-SQLite target with `WAL_UNSUPPORTED_PROVIDER`.
- Connect the selected client.
- Verify `main` database identity before changing journal mode.
- Execute WAL activation.
- Query the effective journal mode separately after activation.
- Resolve only when the verified effective value is case-insensitively `wal`.
- Activation failure maps to `WAL_ACTIVATION_FAILED`; a non-`wal` or unreadable verification result maps to `WAL_VERIFICATION_FAILED`.
- There is no best-effort warning-and-resolve mode and no second compatibility flag retaining it.

## Failure, Recovery, and Concurrency

- A candidate client is not exposed as ready while initialization checks are in flight.
- Root/repository/transaction access during an in-flight initialization must fail synchronously with `CLIENT_NOT_READY`; it must not construct a parallel client.
- Concurrent initialization for the same normalized target may share the in-flight result. A different target rejects with `DATASOURCE_CONFLICT`.
- Connection, identity, WAL activation, or WAL verification failure disconnects the candidate/current invalidated client and enters a failed-not-ready state.
- In failed-not-ready state, root/repository/transaction access fails with `CLIENT_NOT_READY`; it must not silently recreate a non-strict client.
- A later explicit `initializePrisma` retry may replace the failed candidate. `shutdownPrisma` also clears the failure boundary.
- `shutdownPrisma` waits for or safely coordinates with in-flight initialization, disconnects any retained client, and clears client, target, readiness, failure, and in-flight state in a `finally`-equivalent path.
- A target conflict against an already healthy ready client does not discard that client; the rejected switch is explicit and the caller must shut down before rebinding.

## Safe Error and Diagnostic Rules

- `PrismaInitializationError.name` and `.code` are stable public classifications.
- Public messages are constant/safe for each code and contain no datasource URL, credentials, physical path, raw Prisma request text, or raw SQLite/provider message.
- Raw causes are not attached to the public error object and are never passed to `console` by the library.
- The root Prisma Client configuration must not subscribe provider `error` events to stdout during initialization. Removing only the current `console.warn` is insufficient because Prisma's configured `error` log level emits first.
- When `onDiagnostic` is present, the lifecycle owner invokes it with the same stable code and original cause. This is deliberate opt-in access and is the only raw-cause channel in this scope.
- A diagnostic callback failure must not replace the stable initialization error or be printed by the library.
- Query/info/warn logging policy beyond preventing raw initialization error emission is outside this contract.

## Observable Decision Table

| Starting State | Request | Result | Bound/Ready State After Result |
| --- | --- | --- | --- |
| Idle | Lazy root operation; env target A | Construct explicitly for A and perform operation | Bound A; lazy/usable |
| Idle | Initialize target A; checks pass | Resolve | Bound A; ready |
| Idle | Initialize without any target | Reject `DATABASE_URL_MISSING` | Failed/not ready |
| Bound A | Initialize target A; checks pass | Resolve | Bound A; ready |
| Bound A | Initialize target B | Reject `DATASOURCE_CONFLICT` | Bound A remains usable if it was healthy |
| Initializing A | Root/repository access | Throw/reject `CLIENT_NOT_READY` | Initializing A |
| Initializing A | Concurrent initialize A | Share result | Result of first initialization |
| Initializing A | Concurrent initialize B | Reject `DATASOURCE_CONFLICT` | Initializing A |
| Any candidate | Connection/identity/WAL check fails | Reject stage-specific code; disconnect | Failed/not ready |
| Failed/not ready | Root/repository access | Throw/reject `CLIENT_NOT_READY` | Failed/not ready |
| Failed/not ready | Corrected initialize B passes | Resolve | Bound B; ready |
| Bound/failed | Shutdown | Disconnect if applicable and clear state | Idle |

## Compatibility and Removal Decision

- Preserved: optional initialization, lazy repository/proxy use, `initializePrisma({ enableWAL: true })` call shape, `Promise<void>` result, root/proxy/repository/ALS convergence, and shutdown/reinitialize capability.
- Added: optional explicit `datasourceUrl`, diagnostic callback, exported stable error/type surface, deterministic relative SQLite resolution, identity verification, and lifecycle readiness state.
- Tightened: `enableWAL: true` rejects unless WAL is verified; it no longer warns and resolves.
- Removed: implicit generated-client target selection, swallowed WAL failure, raw `console.warn`, provider raw-error stdout during initialization, and silent reuse/recreation after readiness failure.
- Rejected: a legacy `bestEffortWAL` flag, dual old/new initialization functions, environment mutation to force Prisma selection, compatibility wrapper, or second root client.

## Approval Record

The user approved the requirements basis and this contract on 2026-07-13, provided the solution follows best practices. The accepted best-practice interpretation is one authoritative lifecycle owner, a bounded lifecycle state machine, provider-specific SQLite readiness behind that owner, revocable forwarding proxies that do not leak stale raw root handles, safe default errors, explicit opt-in diagnostics, and clean removal of the best-effort WAL path.
