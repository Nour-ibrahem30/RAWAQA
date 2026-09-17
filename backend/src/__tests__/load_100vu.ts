/**
 * 100-VU Load Test Simulation Script (Benchmarking Connected Node.js / MongoDB Server)
 * Spawns an in-memory MongoDB, connects the backend server, and runs 100 concurrent VUs
 * querying public endpoints and checking /health/live probe latency.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import http from 'http';

async function runBenchmark() {
  console.log('--- STARTING 100 CONCURRENT VUS LOAD BENCHMARK ---');
  
  // 1. Start isolated MongoDB memory instance
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_URI_TEST = uri;
  process.env.NODE_ENV = 'test';
  process.env.ENABLE_WORKERS = 'false';

  // 2. Connect DB and seed sample products/categories
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  
  const categoriesCol = db.collection('categories');
  const productsCol = db.collection('products');

  const catRes = await categoriesCol.insertOne({
    name: { ar: 'عطور فاخرة', en: 'Luxury Perfumes' },
    slug: 'luxury-perfumes',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const productsToInsert = [];
  for (let i = 1; i <= 20; i++) {
    productsToInsert.push({
      name: { ar: `عطر راوقة ${i}`, en: `Rawaqa Perfume ${i}` },
      slug: `rawaqa-perfume-${i}`,
      category: catRes.insertedId,
      basePrice: 150 + i * 10,
      salePrice: 130 + i * 10,
      stockQuantity: 100,
      sku: `RAW-PERF-${i}`,
      isFeatured: i <= 5,
      isPublished: true,
      isActive: true,
      images: ['https://example.com/image.jpg'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  await productsCol.insertMany(productsToInsert);
  console.log(`Seeded ${productsToInsert.length} test products & category in MongoDB.`);

  // 3. Start server
  const serverModule = await import('../server');
  const app = serverModule.default;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Server listening on ${baseUrl} for 100 VU benchmark.`);

  // 4. Verify /health/ready is 200 before starting
  const checkReady = await fetch(`${baseUrl}/health/ready`);
  const readyData = await checkReady.json();
  console.log('Readiness pre-check:', checkReady.status, readyData);
  if (checkReady.status !== 200) {
    throw new Error('Readiness check failed!');
  }

  // 5. Load Test Execution: 100 Concurrent Virtual Users for 15 seconds
  const DURATION_MS = 15000;
  const CONCURRENT_VUS = 100;
  const endpoints = [
    '/api/v1/products',
    '/api/v1/categories',
    '/api/v1/products/featured',
    '/health/live'
  ];

  const latencies: number[] = [];
  const healthLatencies: number[] = [];
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  const statusCounts: Record<number, number> = {};

  const startTime = Date.now();
  const endTime = startTime + DURATION_MS;

  async function virtualUser(_vuId: number) {
    while (Date.now() < endTime) {
      // Pick random endpoint
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      const reqStart = performance.now();
      try {
        const res = await fetch(`${baseUrl}${ep}`, {
          headers: { 'Connection': 'keep-alive' }
        });
        const reqDuration = performance.now() - reqStart;
        latencies.push(reqDuration);
        if (ep === '/health/live') {
          healthLatencies.push(reqDuration);
        }

        totalRequests++;
        statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;

        if (res.status >= 200 && res.status < 400) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch (_err: any) {
        totalRequests++;
        failedRequests++;
        statusCounts[599] = (statusCounts[599] || 0) + 1;
      }
    }
  }

  console.log(`Executing load test: ${CONCURRENT_VUS} VUs running for ${DURATION_MS / 1000}s...`);
  const vuPromises = Array.from({ length: CONCURRENT_VUS }, (_, i) => virtualUser(i));
  await Promise.all(vuPromises);

  const actualDurationSec = (Date.now() - startTime) / 1000;

  // 6. Compute Statistics
  latencies.sort((a, b) => a - b);
  healthLatencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = totalRequests / actualDurationSec;

  const hlP50 = healthLatencies[Math.floor(healthLatencies.length * 0.50)] || 0;
  const hlP95 = healthLatencies[Math.floor(healthLatencies.length * 0.95)] || 0;

  const mem = process.memoryUsage();

  console.log('\n================ LOAD TEST RESULTS (100 VUs CONNECTED) ================');
  console.log(`Total Duration:       ${actualDurationSec.toFixed(2)} s`);
  console.log(`Concurrent VUs:       ${CONCURRENT_VUS}`);
  console.log(`Total Requests:       ${totalRequests}`);
  console.log(`Successful (2xx):     ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed:               ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`RPS (Req/sec):        ${rps.toFixed(2)} req/s`);
  console.log(`Latency P50:          ${p50.toFixed(2)} ms`);
  console.log(`Latency P95:          ${p95.toFixed(2)} ms`);
  console.log(`Latency P99:          ${p99.toFixed(2)} ms`);
  console.log(`Health/Live P50:      ${hlP50.toFixed(2)} ms`);
  console.log(`Health/Live P95:      ${hlP95.toFixed(2)} ms`);
  console.log(`Status Codes:        `, JSON.stringify(statusCounts));
  console.log(`Memory Heap Used:     ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Memory RSS:           ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log('========================================================================\n');

  // Teardown
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
