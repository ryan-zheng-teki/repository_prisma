import { Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';

export const defineRepository = <M extends Prisma.ModelName>(modelName: M) => {
  return BaseRepository.forModel(modelName);
};
