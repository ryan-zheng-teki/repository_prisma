// README step 4: the app's own Prisma.ModelName or the type parameter work in any load order.
import { Prisma } from '@acme/db';
import { BaseRepository } from 'repository_prisma';

export class UserRepository extends BaseRepository.forModel(Prisma.ModelName.User) {}
export class PostRepository extends BaseRepository<'Post'> {}
