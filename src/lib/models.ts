import PrismaClientPackage from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';

const { Prisma: PrismaRuntime } = PrismaClientPackage;

// Runtime model names from Prisma; helps avoid string literals in repositories.
export const Models = PrismaRuntime.ModelName;
export type ModelName = PrismaTypes.ModelName;
