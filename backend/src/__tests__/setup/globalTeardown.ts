/**
 * Jest global teardown — nothing to tear down (no external DB process is started).
 * The app runs entirely on PostgreSQL/Prisma (a managed Neon instance in real runs).
 */
export default async function globalTeardown() {
  // no-op
}
