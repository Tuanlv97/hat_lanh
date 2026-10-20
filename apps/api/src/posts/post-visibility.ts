import type { Prisma } from '@prisma/client';

/** A post is public only when PUBLISHED with publishAt null or already past (checked at read time, no cron). */
export function publishedWhere(now: Date = new Date()): Prisma.PostWhereInput {
  return { status: 'PUBLISHED', OR: [{ publishAt: null }, { publishAt: { lte: now } }] };
}
