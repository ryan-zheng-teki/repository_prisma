// Control (AC-013): the README db.ts without the declare module block must not compile.
import * as generated from '../src/generated/prisma/client.js';
import { registerPrismaClient } from 'repository_prisma';

registerPrismaClient(generated);
