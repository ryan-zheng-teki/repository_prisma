import { PrismaClient } from '@prisma/client';
import type { ResolvedDatasourceTarget } from './datasource-target';
import { resolveDatasourceTarget } from './datasource-target';
import {
  InitializePrismaOptions,
  InitializationStageFailure,
  PrismaInitializationDiagnosticListener,
  PrismaInitializationError,
  PrismaInitializationErrorCode,
  initializationError,
} from './initialization-error';
import {
  activateSqliteWal,
  verifySqliteIdentity,
  verifySqliteWal,
} from './sqlite-readiness';

type IdleState = { kind: 'idle' };
type LazyBoundState = {
  kind: 'lazy-bound';
  target: ResolvedDatasourceTarget;
  client: PrismaClient;
};
type InitializingState = {
  kind: 'initializing';
  target: ResolvedDatasourceTarget;
  client: PrismaClient;
  enableWAL: boolean;
  diagnosticListeners: Set<PrismaInitializationDiagnosticListener>;
  task: Promise<void>;
  shutdownRequested: boolean;
  shutdownTask?: Promise<void>;
};
type ReadyState = {
  kind: 'ready';
  target: ResolvedDatasourceTarget;
  client: PrismaClient;
  walReady: boolean;
};
type FailedState = { kind: 'failed' };
type ShuttingDownState = {
  kind: 'shutting-down';
  client: PrismaClient;
  task: Promise<void>;
};

type LifecycleState =
  | IdleState
  | LazyBoundState
  | InitializingState
  | ReadyState
  | FailedState
  | ShuttingDownState;

export type PrismaClientFactory = (target: ResolvedDatasourceTarget) => PrismaClient;

const defaultClientFactory: PrismaClientFactory = (target) =>
  new PrismaClient({
    datasourceUrl: target.clientUrl,
    log: ['query', 'info', 'warn'],
  });

const failureFrom = (
  error: unknown,
  fallbackCode: PrismaInitializationErrorCode
): InitializationStageFailure => {
  if (error instanceof InitializationStageFailure) {
    return error;
  }
  return new InitializationStageFailure(fallbackCode, error);
};

export class PrismaClientLifecycle {
  private state: LifecycleState = { kind: 'idle' };

  constructor(private readonly clientFactory: PrismaClientFactory = defaultClientFactory) {}

  getClientForOperation(): PrismaClient {
    switch (this.state.kind) {
      case 'lazy-bound':
      case 'ready':
        return this.state.client;
      case 'idle':
        return this.bindLazyClient();
      case 'initializing':
      case 'failed':
      case 'shutting-down':
        throw new PrismaInitializationError('CLIENT_NOT_READY');
    }
  }

  initialize(options: InitializePrismaOptions = {}): Promise<void> {
    if (this.state.kind === 'shutting-down') {
      return this.rejectRequest(
        'CLIENT_NOT_READY',
        new Error('Shutdown is in progress.'),
        options.onDiagnostic
      );
    }

    let target: ResolvedDatasourceTarget;
    try {
      target = resolveDatasourceTarget(options.datasourceUrl);
    } catch (error) {
      const failure = failureFrom(error, 'CONNECTION_FAILED');
      if (this.state.kind === 'idle' || this.state.kind === 'failed') {
        this.state = { kind: 'failed' };
      }
      return this.rejectRequest(failure.code, failure.cause, options.onDiagnostic);
    }

    const enableWAL = options.enableWAL === true;
    switch (this.state.kind) {
      case 'idle':
      case 'failed':
        return this.initializeNewClient(target, enableWAL, options.onDiagnostic);
      case 'lazy-bound':
        if (!this.hasSameTarget(this.state.target, target)) {
          return this.rejectConflict(options.onDiagnostic);
        }
        return this.startInitialization(
          target,
          this.state.client,
          enableWAL,
          false,
          options.onDiagnostic
        );
      case 'ready':
        if (!this.hasSameTarget(this.state.target, target)) {
          return this.rejectConflict(options.onDiagnostic);
        }
        if (!enableWAL || this.state.walReady) {
          return Promise.resolve();
        }
        return this.startInitialization(
          target,
          this.state.client,
          true,
          this.state.walReady,
          options.onDiagnostic
        );
      case 'initializing':
        if (this.state.shutdownRequested) {
          return this.rejectRequest(
            'CLIENT_NOT_READY',
            new Error('Shutdown is in progress.'),
            options.onDiagnostic
          );
        }
        if (!this.hasSameTarget(this.state.target, target)) {
          return this.rejectConflict(options.onDiagnostic);
        }
        if (this.state.enableWAL !== enableWAL) {
          return this.rejectRequest(
            'CLIENT_NOT_READY',
            new Error('A different readiness request is already in progress.'),
            options.onDiagnostic
          );
        }
        if (options.onDiagnostic) {
          this.state.diagnosticListeners.add(options.onDiagnostic);
        }
        return this.state.task;
    }
  }

  shutdown(): Promise<void> {
    switch (this.state.kind) {
      case 'idle':
        return Promise.resolve();
      case 'failed':
        this.state = { kind: 'idle' };
        return Promise.resolve();
      case 'initializing':
        return this.shutdownInitializingClient(this.state);
      case 'shutting-down':
        return this.state.task;
      case 'lazy-bound':
      case 'ready':
        return this.shutdownBoundClient(this.state.client);
    }
  }

  private bindLazyClient(): PrismaClient {
    let target: ResolvedDatasourceTarget;
    try {
      target = resolveDatasourceTarget();
    } catch (error) {
      const failure = failureFrom(error, 'CONNECTION_FAILED');
      this.state = { kind: 'failed' };
      throw new PrismaInitializationError(failure.code);
    }

    try {
      const client = this.clientFactory(target);
      this.state = { kind: 'lazy-bound', target, client };
      return client;
    } catch {
      this.state = { kind: 'failed' };
      throw new PrismaInitializationError('CONNECTION_FAILED');
    }
  }

  private initializeNewClient(
    target: ResolvedDatasourceTarget,
    enableWAL: boolean,
    listener?: PrismaInitializationDiagnosticListener
  ): Promise<void> {
    let client: PrismaClient;
    try {
      client = this.clientFactory(target);
    } catch (cause) {
      this.state = { kind: 'failed' };
      return this.rejectRequest('CONNECTION_FAILED', cause, listener);
    }
    return this.startInitialization(target, client, enableWAL, false, listener);
  }

  private startInitialization(
    target: ResolvedDatasourceTarget,
    client: PrismaClient,
    enableWAL: boolean,
    previousWalReady: boolean,
    listener?: PrismaInitializationDiagnosticListener
  ): Promise<void> {
    const diagnosticListeners = new Set<PrismaInitializationDiagnosticListener>();
    if (listener) {
      diagnosticListeners.add(listener);
    }

    let initializingState!: InitializingState;
    const task = Promise.resolve().then(() =>
      this.performInitialization(initializingState, previousWalReady)
    );
    initializingState = {
      kind: 'initializing',
      target,
      client,
      enableWAL,
      diagnosticListeners,
      task,
      shutdownRequested: false,
    };
    this.state = initializingState;
    return task;
  }

  private async performInitialization(
    request: InitializingState,
    previousWalReady: boolean
  ): Promise<void> {
    try {
      if (request.enableWAL && request.target.kind !== 'sqlite-file') {
        throw new InitializationStageFailure(
          'WAL_UNSUPPORTED_PROVIDER',
          new Error('The selected datasource cannot provide physical SQLite WAL readiness.')
        );
      }

      try {
        await request.client.$connect();
      } catch (error) {
        throw new InitializationStageFailure('CONNECTION_FAILED', error);
      }

      if (request.target.kind === 'sqlite-file') {
        try {
          await verifySqliteIdentity(request.client, request.target);
        } catch (error) {
          throw new InitializationStageFailure('DATABASE_IDENTITY_MISMATCH', error);
        }
      }

      if (request.enableWAL) {
        try {
          await activateSqliteWal(request.client);
        } catch (error) {
          throw new InitializationStageFailure('WAL_ACTIVATION_FAILED', error);
        }
        try {
          await verifySqliteWal(request.client);
        } catch (error) {
          throw new InitializationStageFailure('WAL_VERIFICATION_FAILED', error);
        }
      }

      if (this.state !== request || request.shutdownRequested) {
        throw new InitializationStageFailure(
          'CLIENT_NOT_READY',
          new Error('Initialization was superseded by shutdown.')
        );
      }

      this.state = {
        kind: 'ready',
        target: request.target,
        client: request.client,
        walReady: previousWalReady || request.enableWAL,
      };
    } catch (error) {
      const failure = failureFrom(error, 'CONNECTION_FAILED');
      if (!request.shutdownRequested) {
        await this.disconnectWithoutReplacingFailure(request.client);
      }
      if (this.state === request && !request.shutdownRequested) {
        this.state = { kind: 'failed' };
      }
      throw initializationError(
        failure.code,
        failure.cause,
        request.diagnosticListeners
      );
    }
  }

  private shutdownInitializingClient(state: InitializingState): Promise<void> {
    if (state.shutdownTask) {
      return state.shutdownTask;
    }

    state.shutdownRequested = true;
    const task = (async () => {
      try {
        await state.task;
      } catch {
        // Initialization reports its own stable error; shutdown still owns final cleanup.
      }
      try {
        await state.client.$disconnect();
      } finally {
        if (this.state === state) {
          this.state = { kind: 'idle' };
        }
      }
    })();
    state.shutdownTask = task;
    return task;
  }

  private shutdownBoundClient(client: PrismaClient): Promise<void> {
    let shuttingDownState!: ShuttingDownState;
    const task = Promise.resolve().then(async () => {
      try {
        await client.$disconnect();
      } finally {
        if (this.state === shuttingDownState) {
          this.state = { kind: 'idle' };
        }
      }
    });
    shuttingDownState = { kind: 'shutting-down', client, task };
    this.state = shuttingDownState;
    return task;
  }

  private async disconnectWithoutReplacingFailure(client: PrismaClient): Promise<void> {
    try {
      await client.$disconnect();
    } catch {
      // The original classified initialization failure remains authoritative.
    }
  }

  private hasSameTarget(
    current: ResolvedDatasourceTarget,
    requested: ResolvedDatasourceTarget
  ): boolean {
    return current.bindingKey === requested.bindingKey;
  }

  private rejectConflict(
    listener?: PrismaInitializationDiagnosticListener
  ): Promise<void> {
    return this.rejectRequest(
      'DATASOURCE_CONFLICT',
      new Error('The requested datasource differs from the bound datasource.'),
      listener
    );
  }

  private rejectRequest(
    code: PrismaInitializationErrorCode,
    cause: unknown,
    listener?: PrismaInitializationDiagnosticListener
  ): Promise<void> {
    const listeners = listener ? [listener] : [];
    return Promise.reject(initializationError(code, cause, listeners));
  }
}
