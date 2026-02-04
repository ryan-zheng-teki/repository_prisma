import type { Prisma } from '@prisma/client';
import { supportsCaseInsensitiveMode } from './database';

type StringFilter = Prisma.StringFilter;
type StringFilterWithMode = Prisma.StringFilter & { mode?: 'insensitive' };

type ContainsFilterOptions = {
  caseInsensitive?: boolean;
};

export const buildContainsFilter = (
  value: string,
  options: ContainsFilterOptions = {}
): StringFilter => {
  if (!options.caseInsensitive) {
    return { contains: value };
  }

  if (supportsCaseInsensitiveMode()) {
    return { contains: value, mode: 'insensitive' } as StringFilterWithMode;
  }

  return { contains: value };
};

export const filterContainsCaseInsensitive = <T>(
  items: T[],
  value: string,
  selector: (item: T) => string
): T[] => {
  const needle = value.toLowerCase();
  return items.filter((item) => selector(item).toLowerCase().includes(needle));
};
