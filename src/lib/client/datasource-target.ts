import path from 'node:path';
import { getDatabaseUrl, inferDatabaseProviderFromUrl } from '../database';
import { InitializationStageFailure } from './initialization-error';

export type SqliteFileDatasourceTarget = {
  kind: 'sqlite-file';
  bindingKey: string;
  expectedPath: string;
};

export type SqliteMemoryDatasourceTarget = {
  kind: 'sqlite-memory';
  bindingKey: string;
};

export type ResolvedDatasourceTarget =
  | SqliteFileDatasourceTarget
  | SqliteMemoryDatasourceTarget;

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

const normalizeBindingPath = (absolutePath: string): string => {
  if (process.platform === 'win32') {
    return absolutePath.replace(/\\/g, '/').toLowerCase();
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
    const bindingKey = /^file:/i.test(datasourceUrl)
      ? `file:${datasourceUrl.slice('file:'.length)}`
      : `file:${datasourceUrl}`;
    return {
      kind: 'sqlite-memory',
      bindingKey,
    };
  }

  const absolutePath = path.resolve(process.cwd(), normalizeInputPath(filePath));
  return {
    kind: 'sqlite-file',
    bindingKey: `file:${normalizeBindingPath(absolutePath)}${query}`,
    expectedPath: absolutePath,
  };
};

export const resolveDatasourceTarget = (
  explicitUrl?: string
): ResolvedDatasourceTarget => {
  const datasourceUrl = selectedDatasourceUrl(explicitUrl);

  if (inferDatabaseProviderFromUrl(datasourceUrl) !== 'sqlite') {
    throw new InitializationStageFailure(
      'UNSUPPORTED_DATASOURCE_PROVIDER',
      new Error('The selected datasource is not SQLite.')
    );
  }

  return resolveSqliteTarget(datasourceUrl);
};
