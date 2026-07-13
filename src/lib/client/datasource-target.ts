import path from 'node:path';
import {
  DatabaseProvider,
  getDatabaseUrl,
  inferDatabaseProviderFromUrl,
} from '../database';
import { InitializationStageFailure } from './initialization-error';

export type SqliteFileDatasourceTarget = {
  kind: 'sqlite-file';
  clientUrl: string;
  bindingKey: string;
  expectedPath: string;
};

export type SqliteMemoryDatasourceTarget = {
  kind: 'sqlite-memory';
  clientUrl: string;
  bindingKey: string;
};

export type OtherDatasourceTarget = {
  kind: 'other';
  provider: DatabaseProvider;
  clientUrl: string;
  bindingKey: string;
};

export type ResolvedDatasourceTarget =
  | SqliteFileDatasourceTarget
  | SqliteMemoryDatasourceTarget
  | OtherDatasourceTarget;

const selectedDatasourceUrl = (explicitUrl?: string): string => {
  if (explicitUrl !== undefined && explicitUrl.trim().length > 0) {
    return explicitUrl.trim();
  }

  const environmentUrl = getDatabaseUrl();
  if (environmentUrl === undefined || environmentUrl.trim().length === 0) {
    throw new InitializationStageFailure(
      'DATABASE_URL_MISSING',
      new Error('No effective datasource URL was selected.')
    );
  }
  return environmentUrl.trim();
};

const splitSqliteUrl = (
  datasourceUrl: string
): { filePath: string; query: string } => {
  const value = /^file:/i.test(datasourceUrl)
    ? datasourceUrl.slice('file:'.length)
    : datasourceUrl;
  const queryIndex = value.indexOf('?');
  if (queryIndex === -1) {
    return { filePath: value, query: '' };
  }
  return {
    filePath: value.slice(0, queryIndex),
    query: value.slice(queryIndex),
  };
};

const isMemoryTarget = (filePath: string, query: string): boolean => {
  if (filePath.length === 0 || filePath.toLowerCase() === ':memory:') {
    return true;
  }

  const parameters = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  return parameters.get('mode')?.toLowerCase() === 'memory';
};

const normalizeClientPath = (absolutePath: string): string => {
  if (process.platform === 'win32') {
    return absolutePath.replace(/\\/g, '/');
  }
  return absolutePath;
};

const normalizeInputPath = (filePath: string): string => {
  if (process.platform !== 'win32') {
    return filePath;
  }

  const fileUrlDrivePath = filePath.match(/^\/+([a-zA-Z]:[\\/].*)$/);
  return fileUrlDrivePath ? fileUrlDrivePath[1] : filePath;
};

const resolveSqliteTarget = (datasourceUrl: string): ResolvedDatasourceTarget => {
  const { filePath, query } = splitSqliteUrl(datasourceUrl);
  if (isMemoryTarget(filePath, query)) {
    const clientUrl = /^file:/i.test(datasourceUrl)
      ? `file:${datasourceUrl.slice('file:'.length)}`
      : `file:${datasourceUrl}`;
    return {
      kind: 'sqlite-memory',
      clientUrl,
      bindingKey: clientUrl,
    };
  }

  const absolutePath = path.resolve(process.cwd(), normalizeInputPath(filePath));
  const clientPath = normalizeClientPath(absolutePath);
  const clientUrl = `file:${clientPath}${query}`;
  const bindingPath = process.platform === 'win32' ? clientPath.toLowerCase() : clientPath;
  return {
    kind: 'sqlite-file',
    clientUrl,
    bindingKey: `file:${bindingPath}${query}`,
    expectedPath: absolutePath,
  };
};

export const resolveDatasourceTarget = (
  explicitUrl?: string
): ResolvedDatasourceTarget => {
  const datasourceUrl = selectedDatasourceUrl(explicitUrl);
  const provider = inferDatabaseProviderFromUrl(datasourceUrl);

  if (/^file:/i.test(datasourceUrl) || provider === 'sqlite') {
    return resolveSqliteTarget(datasourceUrl);
  }

  return {
    kind: 'other',
    provider,
    clientUrl: datasourceUrl,
    bindingKey: datasourceUrl,
  };
};
