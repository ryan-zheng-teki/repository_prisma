// Lazy binding through the packed CJS entry: no initializePrisma call; DATABASE_URL decides.
const { BaseRepository, Models, PrismaInitializationError, shutdownPrisma } = require('repository_prisma');
class UserRepository extends BaseRepository.forModel(Models.User) {}
const users = new UserRepository();
(async () => { const outcome = await (async () => { try { return { ok: true, count: await users.count() }; } catch (error) { return ({ ok: false, name: error.name, code: error.code, message: error.message, isInitError: error instanceof PrismaInitializationError, leaks: /s3cr3t|app_user|db\.internal|postgresql/.test(`${error.message} ${String(error)}`) }); } })();
console.log(JSON.stringify({ DATABASE_URL_kind: (process.env.DATABASE_URL || '').split(':')[0], outcome }));
await shutdownPrisma(); })();
