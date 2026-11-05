// A repository module that reads Models.User while it is evaluated (README step 4 warns about it).
import { BaseRepository, Models } from 'repository_prisma';

export class UserRepository extends BaseRepository.forModel(Models.User) {}
