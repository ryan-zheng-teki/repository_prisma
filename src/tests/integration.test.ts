import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { BaseRepository } from '../lib/base-repository';
import { Transactional } from '../lib/decorators';
import { runInTransaction } from '../lib/context';
import { Prisma } from '@prisma/client';
import { rootPrismaClient } from '../lib/prisma-manager';
import { initializePrisma, shutdownPrisma } from '../lib/client';

// --- Test Repositories ---
class UserRepository extends BaseRepository<'User'> {}
class PostRepository extends BaseRepository<'Post'> {}

// --- Test Service ---
class UserService {
    public userRepo = new UserRepository();
    public postRepo = new PostRepository();

    @Transactional()
    async createUserAndPost(email: string, title: string) {
        const user = await this.userRepo.create({ data: { email } });
        await this.postRepo.create({ data: { title, authorId: user.id } });
        return user;
    }

    @Transactional()
    async createThenFail(email: string) {
        await this.userRepo.create({ data: { email } });
        throw new Error("Simulated Failure");
    }

    @Transactional()
    async nestedTransaction(email: string, title: string) {
        return this.createUserAndPost(email, title);
    }
}

describe.sequential('Implicit Transactions (Integration)', () => {
    const service = new UserService();

    beforeAll(async () => {
        await initializePrisma({ enableWAL: true });
    });

    afterAll(async () => {
        await shutdownPrisma();
    });

    beforeEach(async () => {
        // Cleanup DB
        await rootPrismaClient.post.deleteMany();
        await rootPrismaClient.user.deleteMany();
    });

    it('should commit transaction correctly (Decorator)', async () => {
        const email = `test_${Date.now()}@example.com`;
        await service.createUserAndPost(email, 'Success Post');

        const user = await rootPrismaClient.user.findUnique({ where: { email } });
        expect(user).toBeDefined();
        const posts = await rootPrismaClient.post.findMany({ where: { authorId: user!.id } });
        expect(posts).toHaveLength(1);
        expect(posts[0].title).toBe('Success Post');
    });

    it('should rollback transaction on error (Decorator)', async () => {
        const email = `fail_${Date.now()}@example.com`;
        await expect(service.createThenFail(email)).rejects.toThrow("Simulated Failure");

        // Verify rollback
        const user = await rootPrismaClient.user.findUnique({ where: { email } });
        expect(user).toBeNull();
    });

    it('should commit transaction correctly (HOF)', async () => {
        const email = `hof_${Date.now()}@example.com`;
        
        await runInTransaction(async () => {
             // MUST use repository or getPrismaClient(), NOT rootPrismaClient directly
             const user = await service.userRepo.create({ data: { email } });
             await service.postRepo.create({ data: { title: 'HOF Post', authorId: user.id } });
        });

        const user = await rootPrismaClient.user.findUnique({ where: { email } });
        expect(user).toBeDefined();
    });

    it('should rollback transaction on error (HOF)', async () => {
        const email = `hof_fail_${Date.now()}@example.com`;
        
        await expect(runInTransaction(async () => {
             await service.userRepo.create({ data: { email } });
             throw new Error("HOF Failure");
        })).rejects.toThrow("HOF Failure");

        const user = await rootPrismaClient.user.findUnique({ where: { email } });
        expect(user).toBeNull();
    });

    it('should persist single operation WITHOUT transaction decorator (Implicit Atomic)', async () => {
        const email = `atomic_${Date.now()}@example.com`;
        
        // Directly calling repo method without @Transactional
        const user = await service.userRepo.create({ data: { email } });

        const found = await rootPrismaClient.user.findUnique({ where: { email } });
        expect(found).toBeDefined();
        expect(found!.id).toBe(user.id);
    });

    it('should perform full CRUD operations correctly', async () => {
        const email = `crud_${Date.now()}@example.com`;
        
        // 1. Create
        const user = await service.userRepo.create({ data: { email } });
        expect(user.id).toBeDefined();

        // 2. Read (FindUnique)
        const found = await service.userRepo.findUnique({ where: { id: user.id } });
        expect(found).not.toBeNull();
        if (!found) {
            throw new Error('Expected user to exist');
        }
        expect(found.email).toBe(email);

        // 3. Update
        const updated = await service.userRepo.update({ 
            where: { id: user.id }, 
            data: { email: `updated_${email}` } 
        });
        expect(updated.email).toBe(`updated_${email}`);

        // 4. Read (FindMany)
        const allUsers = await service.userRepo.findMany({ where: { id: user.id } });
        expect(allUsers).toHaveLength(1);

        // 5. Delete
        await service.userRepo.delete({ where: { id: user.id } });
        const deleted = await service.userRepo.findUnique({ where: { id: user.id } });
        expect(deleted).toBeNull();
    });

    it('should handle nested transactions by flattening them', async () => {
        const email = `nested_${Date.now()}@example.com`;
        
        // This calls a Transactional method which calls another Transactional method
        // In Prisma, we expect this to just reuse the top-level tx if strict nesting isn't manually configured
        await service.nestedTransaction(email, "Nested Post");
        
        const user = await rootPrismaClient.user.findUnique({ where: { email } });
        expect(user).toBeDefined();
    });
});
