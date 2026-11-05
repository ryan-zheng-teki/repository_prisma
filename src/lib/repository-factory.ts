import type { ModelName } from './prisma-types';
import { BaseRepository } from './base-repository';

export const defineRepository = <M extends ModelName>(modelName: M) => {
  return BaseRepository.forModel(modelName);
};
