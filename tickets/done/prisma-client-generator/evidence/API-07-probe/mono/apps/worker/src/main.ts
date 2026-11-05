// A bundled worker (moduleResolution bundler; @acme/db through its TypeScript source).
import '@acme/db';
import { BaseRepository, initializePrisma, prisma, runInTransaction, shutdownPrisma } from 'repository_prisma';

class PostRepository extends BaseRepository<'Post'> {}

export const rejected = async (): Promise<void> => {
  // @ts-expect-error unknown field
  await new PostRepository().create({ data: { nope: 1 } });
  // @ts-expect-error invalid isolation level
  await runInTransaction(async () => undefined, { isolationLevel: 'Bogus' });
};

await initializePrisma({ datasourceUrl: process.env.APP_DATABASE_URL! });
await runInTransaction(async () => {
  const author = await prisma.user.create({ data: { email: 'worker@mono.test' } });
  await new PostRepository().create({ data: { title: 'From the bundle', authorId: author.id } });
});
const posts: { title: string }[] = await prisma.post.findMany({ select: { title: true } });
console.log('worker-bundle', JSON.stringify(posts));
await shutdownPrisma();
