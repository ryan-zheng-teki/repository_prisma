export type PrismaInitializationErrorCode =
  | 'DATABASE_URL_MISSING'
  | 'UNSUPPORTED_DATASOURCE_PROVIDER'
  | 'DATASOURCE_CONFLICT'
  | 'CONNECTION_FAILED'
  | 'SQLITE_DRIVER_UNAVAILABLE'
  | 'DATABASE_IDENTITY_MISMATCH'
  | 'WAL_UNSUPPORTED_PROVIDER'
  | 'WAL_ACTIVATION_FAILED'
  | 'WAL_VERIFICATION_FAILED'
  | 'LOGGING_POLICY_CONFLICT'
  | 'CLIENT_NOT_READY'
  | 'PRISMA_CLIENT_UNAVAILABLE'
  | 'PRISMA_CLIENT_CONFLICT';

export type PrismaInitializationDiagnostic = {
  code: PrismaInitializationErrorCode;
  cause: unknown;
};

export type PrismaInitializationDiagnosticListener = (
  diagnostic: PrismaInitializationDiagnostic
) => void;

export type InitializePrismaOptions = {
  datasourceUrl?: string;
  enableWAL?: boolean;
  logQueries?: boolean;
  onDiagnostic?: PrismaInitializationDiagnosticListener;
};

const SAFE_ERROR_MESSAGES: Record<PrismaInitializationErrorCode, string> = {
  DATABASE_URL_MISSING: 'No Prisma datasource URL is configured.',
  UNSUPPORTED_DATASOURCE_PROVIDER:
    'repository_prisma supports SQLite datasources only; use a file: URL.',
  DATASOURCE_CONFLICT: 'The Prisma client is already bound to another datasource.',
  CONNECTION_FAILED: 'The Prisma client could not connect to its datasource.',
  SQLITE_DRIVER_UNAVAILABLE:
    'The SQLite driver (better-sqlite3) could not load its native module. Allow its build or ' +
    'rebuild it for this Node.js version; see "Allow the native SQLite build" in the ' +
    'repository_prisma README.',
  DATABASE_IDENTITY_MISMATCH: 'The connected SQLite database identity could not be verified.',
  WAL_UNSUPPORTED_PROVIDER: 'Strict WAL readiness requires a physical SQLite datasource.',
  WAL_ACTIVATION_FAILED: 'SQLite WAL mode could not be activated.',
  WAL_VERIFICATION_FAILED: 'SQLite WAL mode could not be verified.',
  LOGGING_POLICY_CONFLICT:
    'The requested query logging policy differs from the bound Prisma client.',
  CLIENT_NOT_READY: 'The Prisma client is not ready for operations.',
  PRISMA_CLIENT_UNAVAILABLE:
    'No generated Prisma client is available. Run `prisma generate`, or pass the client your ' +
    'prisma-client generator created to registerPrismaClient().',
  PRISMA_CLIENT_CONFLICT:
    'A different Prisma client is already in use; call and await shutdownPrisma() before ' +
    'registering another.',
};

export class PrismaInitializationError extends Error {
  readonly code: PrismaInitializationErrorCode;

  constructor(code: PrismaInitializationErrorCode) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = 'PrismaInitializationError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InitializationStageFailure {
  readonly code: PrismaInitializationErrorCode;
  readonly cause: unknown;

  constructor(code: PrismaInitializationErrorCode, cause: unknown) {
    this.code = code;
    this.cause = cause;
  }
}

export const notifyDiagnosticListeners = (
  listeners: Iterable<PrismaInitializationDiagnosticListener>,
  code: PrismaInitializationErrorCode,
  cause: unknown
): void => {
  for (const listener of listeners) {
    try {
      listener({ code, cause });
    } catch {
      // Diagnostics are deliberately best-effort and must never affect lifecycle errors.
    }
  }
};

export const initializationError = (
  code: PrismaInitializationErrorCode,
  cause: unknown,
  listeners: Iterable<PrismaInitializationDiagnosticListener> = []
): PrismaInitializationError => {
  notifyDiagnosticListeners(listeners, code, cause);
  return new PrismaInitializationError(code);
};
