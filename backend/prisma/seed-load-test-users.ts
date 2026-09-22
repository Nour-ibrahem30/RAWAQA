/**
 * seed-load-test-users.ts
 * ──────────────────────
 * Creates load-testing accounts for k6 in PostgreSQL.
 *
 * Usage:
 *   $env:LOAD_TEST_USERS="50"; npm run seed:load-test-users   (PowerShell)
 *   LOAD_TEST_USERS=50 npm run seed:load-test-users           (bash)
 *
 * Rules:
 *  - Idempotent: safe to run multiple times.
 *  - Only creates/touches emails starting with "rawaqa-loadtest-".
 *  - Never deletes or modifies normal user accounts.
 *  - Uses the same bcrypt hashing as auth.service.ts.
 *  - Writes load-test-users.json (git-ignored) for k6 consumption.
 */

import 'dotenv/config';
import bcrypt        from 'bcryptjs';
import * as fs       from 'fs';
import * as path     from 'path';
import { PrismaClient, UserRole, AuthProvider } from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

// ── Config ────────────────────────────────────────────────────────────────────
const REQUESTED      = parseInt(process.env.LOAD_TEST_USERS ?? '50', 10);
const LOAD_TEST_PASS = 'LoadTest123!';
const EMAIL_PREFIX   = 'rawaqa-loadtest-';
const EMAIL_DOMAIN   = '@example.com';
const BCRYPT_ROUNDS  = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
const OUTPUT_FILE    = path.join(__dirname, '..', 'load-test-users.json');

if (isNaN(REQUESTED) || REQUESTED < 1) {
  console.error('❌ LOAD_TEST_USERS must be a positive integer.');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Zero-padded index → email, e.g. 1 → "rawaqa-loadtest-001@example.com" */
function makeEmail(n: number): string {
  return `${EMAIL_PREFIX}${String(n).padStart(3, '0')}${EMAIL_DOMAIN}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter } as any);

async function main(): Promise<void> {

  // 1. Find existing load-test accounts
  const existing = await prisma.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { email: true },
    orderBy: { email: 'asc' },
  });

  const existingEmails = new Set(existing.map((u: { email: string }) => u.email));
  const existingCount  = existingEmails.size;

  // 2. Determine which accounts still need creating
  const toCreate: number[] = [];
  for (let i = 1; i <= REQUESTED; i++) {
    const email = makeEmail(i);
    if (!existingEmails.has(email)) {
      toCreate.push(i);
    }
  }

  const skipped = REQUESTED - toCreate.length;

  // 3. Hash password once (same mechanism as auth.service.ts)
  let hashedPassword: string | null = null;
  if (toCreate.length > 0) {
    process.stdout.write(`Hashing password (bcrypt rounds=${BCRYPT_ROUNDS})...`);
    hashedPassword = await bcrypt.hash(LOAD_TEST_PASS, BCRYPT_ROUNDS);
    process.stdout.write(' done\n');
  }

  // 4. Create missing accounts
  let created = 0;
  for (const n of toCreate) {
    const email = makeEmail(n);
    await prisma.user.create({
      data: {
        email,
        password:       hashedPassword!,
        firstName:      'Load',
        lastName:       `Test${String(n).padStart(3, '0')}`,
        phone:          null,
        role:           UserRole.customer,
        authProvider:   AuthProvider.local,
        isActive:       true,
        isEmailVerified: true,   // pre-verify so no OTP blocking login
        isPhoneVerified: false,
      },
    });
    created++;

    // Progress dot every 10
    if (created % 10 === 0) {
      process.stdout.write(`  Created ${created}/${toCreate.length}...\n`);
    }
  }

  // 5. Build full credentials list for k6 (accounts 1..REQUESTED)
  const credentials = Array.from({ length: REQUESTED }, (_, i) => ({
    email:    makeEmail(i + 1),
    password: LOAD_TEST_PASS,
  }));

  // 6. Write load-test-users.json (git-ignored)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(credentials, null, 2), 'utf8');

  // 7. Print report
  console.log('\nRAWAQA LOAD TEST USERS');
  console.log('----------------------');
  console.log(`Requested : ${REQUESTED}`);
  console.log(`Existing  : ${existingCount}`);
  console.log(`Created   : ${created}`);
  console.log(`Skipped   : ${skipped}`);
  console.log('\nAccounts:');
  for (let i = 1; i <= REQUESTED; i++) {
    console.log(`  ${makeEmail(i)}`);
  }
  console.log('\nPassword:');
  console.log(`  ${LOAD_TEST_PASS}`);
  console.log(`\nCredentials written to: ${OUTPUT_FILE}`);
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
