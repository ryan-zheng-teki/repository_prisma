import { Prisma } from '@prisma/client';

// Runtime model names from Prisma; helps avoid string literals in repositories.
export const Models = Prisma.ModelName;
export type ModelName = Prisma.ModelName;
