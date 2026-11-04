import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from '../lib/client';

type StoredEventRow = { label: string; storage: string; occurredAt: number | bigint };

const prisma5OccurredAt = new Date('2026-01-02T08:30:00.000Z');
const prisma7OccurredAt = new Date('2026-03-01T12:00:00.000Z');

describe.sequential('DateTime continuity with rows written by Prisma 5', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await shutdownPrisma().catch(() => undefined);
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it('stores new DateTime values as INTEGER unix ms and filters and orders them with existing rows', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'repository-prisma-datetime-'));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, 'events.db');

    await initializePrisma({ datasourceUrl: `file:${databasePath}` });
    // The table shape `prisma db push` creates for the Event model.
    await rootPrismaClient.$executeRawUnsafe(
      'CREATE TABLE "Event" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "label" TEXT NOT NULL, "occurredAt" DATETIME NOT NULL);'
    );
    // Prisma 5.22 stored DateTime as INTEGER unix milliseconds.
    await rootPrismaClient.$executeRawUnsafe(
      `INSERT INTO "Event" ("label", "occurredAt") VALUES ('prisma-5', ${prisma5OccurredAt.getTime()});`
    );

    await rootPrismaClient.event.create({
      data: { label: 'prisma-7', occurredAt: prisma7OccurredAt },
    });

    const stored = await rootPrismaClient.$queryRawUnsafe<StoredEventRow[]>(
      'SELECT "label", typeof("occurredAt") AS "storage", "occurredAt" FROM "Event" ORDER BY "id";'
    );
    expect(stored.map(({ label, storage }) => ({ label, storage }))).toEqual([
      { label: 'prisma-5', storage: 'integer' },
      { label: 'prisma-7', storage: 'integer' },
    ]);
    expect(stored.map((row) => Number(row.occurredAt))).toEqual([
      prisma5OccurredAt.getTime(),
      prisma7OccurredAt.getTime(),
    ]);

    const after2025 = await rootPrismaClient.event.findMany({
      where: { occurredAt: { gt: new Date('2025-01-01T00:00:00.000Z') } },
      orderBy: { occurredAt: 'asc' },
    });
    expect(after2025.map((event) => event.label)).toEqual(['prisma-5', 'prisma-7']);
    expect(after2025.map((event) => event.occurredAt.toISOString())).toEqual([
      prisma5OccurredAt.toISOString(),
      prisma7OccurredAt.toISOString(),
    ]);

    const beforeFebruary = await rootPrismaClient.event.findMany({
      where: { occurredAt: { lt: new Date('2026-02-01T00:00:00.000Z') } },
    });
    expect(beforeFebruary.map((event) => event.label)).toEqual(['prisma-5']);

    const newestFirst = await rootPrismaClient.event.findMany({
      orderBy: { occurredAt: 'desc' },
    });
    expect(newestFirst.map((event) => event.label)).toEqual(['prisma-7', 'prisma-5']);
  });
});
