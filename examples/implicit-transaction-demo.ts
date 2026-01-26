import { BaseRepository, Transactional, runInTransaction } from '../src';

// --- Repositories ---

// Clean Inheritance!
class UserRepository extends BaseRepository<'User'> {
  // Infer "user" from "UserRepository"
}

class PostRepository extends BaseRepository<'Post'> {
  // Infer "post" from "PostRepository"
}

// --- Service ---

class UserService {
  private userRepo = new UserRepository();
  private postRepo = new PostRepository();

  @Transactional()
  async createUserAndPost(email: string, postTitle: string) {
    console.log('--- Inside Service Method ---');

    // 1. Create User
    const user = await this.userRepo.create({
      data: { email }
    });
    console.log(`User created: ${user.email} (ID: ${user.id})`);

    // 2. Create Post (Implicitly shares transaction)
    const post = await this.postRepo.create({
      data: {
        title: postTitle,
        authorId: user.id
      }
    });
    console.log(`Post created: "${post.title}"`);

    return user;
  }
}

// --- Main execution ---

async function main() {
  console.log('Starting implicit transaction demo...');
  const service = new UserService();

  try {
    const email = `user_${Date.now()}@example.com`;
    // Pattern 1: Decorator
    await service.createUserAndPost(email, 'My First Post (Decorator)');

    // Pattern 2: HOF (Node.js style)
    await runInTransaction(async () => {
      console.log('--- Inside HOF Transaction ---');
      const userRepo = new UserRepository();
      const postRepo = new PostRepository();

      const user2 = await userRepo.create({
        data: { email: `hof_${Date.now()}@example.com` }
      });
      await postRepo.create({
        data: { title: 'HOF Post', authorId: user2.id }
      });
      console.log('HOF transaction completed');
    });
    console.log('Demo finished successfully.');
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

void main();
