import type { ContainsStringFilter } from './prisma-types';
import { supportsCaseInsensitiveMode } from './database';

type ContainsFilterOptions = {
  caseInsensitive?: boolean;
};

export const buildContainsFilter = (
  value: string,
  options: ContainsFilterOptions = {}
): ContainsStringFilter => {
  if (!options.caseInsensitive) {
    return { contains: value };
  }

  if (supportsCaseInsensitiveMode()) {
    return { contains: value, mode: 'insensitive' } as ContainsStringFilter;
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
