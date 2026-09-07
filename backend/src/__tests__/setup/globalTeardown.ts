/**
 * Jest global teardown — stops the in-memory MongoDB instance after all suites finish.
 */
export default async function globalTeardown() {
  const mongod = (global as any).__MONGOD__;
  if (mongod) {
    await mongod.stop();
  }
}
