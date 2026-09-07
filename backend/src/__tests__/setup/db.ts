/**
 * Per-test-file DB helper.
 * Call connect() in beforeAll and disconnect() in afterAll.
 * Call clearCollections() in beforeEach to start each test with a clean state.
 */
import mongoose from 'mongoose';

export async function connectTestDB(): Promise<void> {
  const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI!;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

export async function disconnectTestDB(): Promise<void> {
  await mongoose.disconnect();
}

export async function clearCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
}
