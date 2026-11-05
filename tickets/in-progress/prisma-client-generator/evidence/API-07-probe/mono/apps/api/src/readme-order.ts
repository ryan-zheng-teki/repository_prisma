// Same import order as wrong-order.ts, with the README's model naming.
import { UserRepository } from './readme-repositories.js';
import '@acme/db';
import { initializePrisma, shutdownPrisma } from 'repository_prisma';

await initializePrisma({ datasourceUrl: process.env.APP_DATABASE_URL! });
console.log('readme-order', await new UserRepository().count());
await shutdownPrisma();
