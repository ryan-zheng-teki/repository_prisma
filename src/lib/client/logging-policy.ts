import type { Prisma } from '@prisma/client';

const QUERY_LOG_TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

export const parseQueryLogFlag = (value: string | undefined): boolean =>
  value !== undefined && QUERY_LOG_TRUTHY_VALUES.has(value.trim().toLowerCase());

export const resolveQueryLoggingPolicy = (explicit?: boolean): boolean =>
  explicit !== undefined
    ? explicit
    : parseQueryLogFlag(process.env.PRISMA_LOG_QUERIES);

export const queryLogLevels = (logQueries: boolean): Prisma.LogLevel[] =>
  logQueries ? ['info', 'warn', 'error', 'query'] : ['info', 'warn', 'error'];
