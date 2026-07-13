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

export type PrismaInitializationDiagnosticListener = (
  diagnostic: PrismaInitializationDiagnostic
) => void;

export type InitializePrismaOptions = {
  datasourceUrl?: string;
  enableWAL?: boolean;
  onDiagnostic?: PrismaInitializationDiagnosticListener;
};

const SAFE_ERROR_MESSAGES: Record<PrismaInitializationErrorCode, string> = {
  DATABASE_URL_MISSING: 'No Prisma datasource URL is configured.',
  DATASOURCE_CONFLICT: 'The Prisma client is already bound to another datasource.',
  CONNECTION_FAILED: 'The Prisma client could not connect to its datasource.',
  DATABASE_IDENTITY_MISMATCH: 'The connected SQLite database identity could not be verified.',
  WAL_UNSUPPORTED_PROVIDER: 'Strict WAL readiness requires a physical SQLite datasource.',
  WAL_ACTIVATION_FAILED: 'SQLite WAL mode could not be activated.',
  WAL_VERIFICATION_FAILED: 'SQLite WAL mode could not be verified.',
  CLIENT_NOT_READY: 'The Prisma client is not ready for operations.',
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
