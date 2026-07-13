export type DatabaseProvider =
  | 'sqlite'
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'sqlserver'
  | 'cockroachdb'
  | 'unknown';

const normalizeProvider = (value: string): DatabaseProvider => {
  const normalized = value.trim().toLowerCase().replace(/[-_]/g, '');
  switch (normalized) {
    case 'sqlite':
      return 'sqlite';
    case 'postgres':
    case 'postgresql':
      return 'postgresql';
    case 'mysql':
      return 'mysql';
    case 'mongodb':
      return 'mongodb';
    case 'sqlserver':
    case 'mssql':
      return 'sqlserver';
    case 'cockroach':
    case 'cockroachdb':
      return 'cockroachdb';
    default:
      return 'unknown';
  }
};

export const inferDatabaseProviderFromUrl = (url?: string): DatabaseProvider => {
  if (!url) {
    return 'unknown';
  }
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('file:') || trimmed.endsWith('.db')) {
    return 'sqlite';
  }
  if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) {
    return 'postgresql';
  }
  if (trimmed.startsWith('mysql://')) {
    return 'mysql';
  }
  if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
    return 'mongodb';
  }
  if (trimmed.startsWith('sqlserver://')) {
    return 'sqlserver';
  }
  if (trimmed.startsWith('cockroachdb://')) {
    return 'cockroachdb';
  }
  return 'unknown';
};

const nonEmptyEnvironmentValue = (value?: string): string | undefined => {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  return value;
};

export const getDatabaseUrl = (): string | undefined => {
  const testUrl = nonEmptyEnvironmentValue(process.env.DATABASE_URL_TEST);
  const defaultUrl = nonEmptyEnvironmentValue(process.env.DATABASE_URL);

  if (process.env.NODE_ENV === 'test' && testUrl) {
    return testUrl;
  }
  return defaultUrl ?? testUrl;
};

export const detectDatabaseProvider = (): DatabaseProvider => {
  const envProvider = process.env.PRISMA_DATASOURCE_PROVIDER;
  if (envProvider) {
    return normalizeProvider(envProvider);
  }
  return inferDatabaseProviderFromUrl(getDatabaseUrl());
};

export const isSqliteProvider = (): boolean => detectDatabaseProvider() === 'sqlite';

export const supportsCaseInsensitiveMode = (): boolean => !isSqliteProvider();
