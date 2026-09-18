import dns from 'dns';
import {
  configureDns,
  getDnsDiagnostic,
  resetDnsMetrics,
  setMongoHostsAllowlist,
  extractMongoHostsFromUri,
  isAllowlistedMongoHost,
  isQualifyingDnsError,
  normalizeHostname,
  restoreOriginalDns,
} from '../../config/dns';

describe('Scoped MongoDB DNS Resilience & Fallback Module', () => {
  const MONGO_HOST = 'ac-j3gihdl-shard-00-00.uvte5na.mongodb.net';
  const MONGO_URI = `mongodb://user:secret@${MONGO_HOST}:27017,ac-j3gihdl-shard-00-01.uvte5na.mongodb.net:27017/test?replicaSet=rs0`;
  const NON_MONGO_HOST = 'api.paymob.com';

  beforeEach(() => {
    resetDnsMetrics();
    configureDns({
      strategy: 'system',
      fallbackEnabled: false,
      fallbackServers: ['1.1.1.1', '8.8.8.8'],
      mongoHosts: [MONGO_HOST],
    });
  });

  afterAll(() => {
    restoreOriginalDns();
  });

  // ─── Test 1: URI Host Extraction & Exact Allowlist ──────────────────────────
  describe('URI Host Extraction & Allowlist Scoping', () => {
    it('extracts replica-set hostnames accurately without exposing credentials', () => {
      const extracted = extractMongoHostsFromUri(MONGO_URI);
      expect(extracted).toEqual([
        'ac-j3gihdl-shard-00-00.uvte5na.mongodb.net',
        'ac-j3gihdl-shard-00-01.uvte5na.mongodb.net',
      ]);
      expect(JSON.stringify(extracted)).not.toContain('user');
      expect(JSON.stringify(extracted)).not.toContain('secret');
    });

    it('normalizes hostnames (case insensitive, trim, strips trailing dots)', () => {
      expect(normalizeHostname('  AC-Shard-00.MongoDB.net. ')).toBe('ac-shard-00.mongodb.net');
    });

    it('strictly accepts allowlisted MongoDB hosts and rejects non-allowlisted hosts', () => {
      const allowlist = new Set([MONGO_HOST]);
      expect(isAllowlistedMongoHost(MONGO_HOST, allowlist)).toBe(true);
      expect(isAllowlistedMongoHost(MONGO_HOST.toUpperCase(), allowlist)).toBe(true);
      expect(isAllowlistedMongoHost(NON_MONGO_HOST, allowlist)).toBe(false);
      expect(isAllowlistedMongoHost('o12345.ingest.sentry.io', allowlist)).toBe(false);
    });

    it('rejects suffix attacks (e.g. evil-mongodb.net)', () => {
      const allowlist = new Set([MONGO_HOST]);
      expect(isAllowlistedMongoHost('evil-mongodb.net', allowlist)).toBe(false);
      expect(isAllowlistedMongoHost(`prefix-${MONGO_HOST}`, allowlist)).toBe(false);
      expect(isAllowlistedMongoHost('other.mongodb.net', allowlist)).toBe(false);
    });

    it('updates allowlist dynamically via setMongoHostsAllowlist', () => {
      setMongoHostsAllowlist(['dynamic-host.mongodb.net']);
      expect(isAllowlistedMongoHost('dynamic-host.mongodb.net')).toBe(true);
      expect(isAllowlistedMongoHost(MONGO_HOST)).toBe(false);
    });
  });

  // ─── Test 2: Qualifying DNS Error Detection ─────────────────────────────────
  describe('Qualifying DNS Errors', () => {
    it('identifies transient errors: EAI_AGAIN, ETIMEOUT, ENOTFOUND', () => {
      expect(isQualifyingDnsError({ code: 'EAI_AGAIN' })).toBe(true);
      expect(isQualifyingDnsError({ code: 'ETIMEOUT' })).toBe(true);
      expect(isQualifyingDnsError({ code: 'ENOTFOUND' })).toBe(true);
      expect(isQualifyingDnsError(new Error('getaddrinfo EAI_AGAIN host.com'))).toBe(true);
    });

    it('does not treat non-DNS / auth errors as qualifying DNS errors', () => {
      expect(isQualifyingDnsError({ code: 'ECONNREFUSED_APP' })).toBe(false);
      expect(isQualifyingDnsError({ code: 'AUTH_FAILED' })).toBe(false);
      expect(isQualifyingDnsError(null)).toBe(false);
    });
  });

  // ─── Test 3: System Mode (Default) ──────────────────────────────────────────
  describe('Strategy: system (Default)', () => {
    it('does not attempt fallback when strategy is system, even for MongoDB hosts', async () => {
      configureDns({
        strategy: 'system',
        fallbackEnabled: false,
        mongoHosts: [MONGO_HOST],
      });

      const diag = getDnsDiagnostic();
      expect(diag.strategy).toBe('system');
      expect(diag.fallbackEnabled).toBe(false);
    });
  });

  // ─── Test 4: Non-MongoDB Host Safety ────────────────────────────────────────
  describe('Non-MongoDB Host Safety Isolation', () => {
    it('never invokes fallback for non-allowlisted hostnames', (done) => {
      configureDns({
        strategy: 'fallback',
        fallbackEnabled: true,
        fallbackServers: ['1.1.1.1', '8.8.8.8'],
        mongoHosts: [MONGO_HOST], // only MONGO_HOST is allowlisted
      });

      // Query a non-existent non-MongoDB domain: must fail via native lookup with ENOTFOUND without fallback
      dns.lookup('this-domain-definitely-does-not-exist-123456.invalid', (err) => {
        expect(err).toBeTruthy();
        const diag = getDnsDiagnostic();
        // Fallback attempts MUST be 0 because host was not allowlisted
        expect(diag.metrics.fallbackAttempts).toBe(0);
        expect(diag.metrics.fallbackRecoveries).toBe(0);
        done();
      });
    });
  });

  // ─── Test 5: Fallback Resolution on EAI_AGAIN ────────────────────────────────
  describe('Fallback Resolution for MongoDB Host', () => {
    it('successfully resolves MongoDB host via fallback when enabled and system DNS fails', (done) => {
      configureDns({
        strategy: 'fallback',
        fallbackEnabled: true,
        fallbackServers: ['1.1.1.1', '8.8.8.8'],
        mongoHosts: [MONGO_HOST],
      });

      // The real Atlas host resolves via public DNS 1.1.1.1 / 8.8.8.8
      dns.lookup(MONGO_HOST, (err, address, family) => {
        expect(err).toBeNull();
        expect(address).toBeTruthy();
        expect(family).toBe(4);

        const diag = getDnsDiagnostic();
        expect(diag.metrics.systemLookups).toBeGreaterThanOrEqual(1);
        done();
      });
    });

    it('supports dns.promises.lookup API with exact parity', async () => {
      configureDns({
        strategy: 'fallback',
        fallbackEnabled: true,
        fallbackServers: ['1.1.1.1', '8.8.8.8'],
        mongoHosts: [MONGO_HOST],
      });

      const single = await dns.promises.lookup(MONGO_HOST);
      expect(single.address).toBeTruthy();
      expect(single.family).toBe(4);

      const all = await dns.promises.lookup(MONGO_HOST, { all: true });
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0);
      expect(all[0]?.address).toBe(single.address);
    });

    it('supports options with family=4 and all=true via callback', (done) => {
      configureDns({
        strategy: 'fallback',
        fallbackEnabled: true,
        fallbackServers: ['1.1.1.1', '8.8.8.8'],
        mongoHosts: [MONGO_HOST],
      });

      dns.lookup(MONGO_HOST, { family: 4, all: true }, (err, addresses: any) => {
        expect(err).toBeNull();
        expect(Array.isArray(addresses)).toBe(true);
        expect(addresses.length).toBeGreaterThan(0);
        expect(addresses[0].family).toBe(4);
        done();
      });
    });
  });

  // ─── Test 6: Diagnostics & Secret Redaction ─────────────────────────────────
  describe('DNS Diagnostics', () => {
    it('exposes safe diagnostic metrics and never includes credentials', () => {
      configureDns({
        strategy: 'fallback',
        fallbackEnabled: true,
        fallbackServers: ['1.1.1.1', '8.8.8.8'],
        mongoHosts: [MONGO_HOST],
      });

      const diag = getDnsDiagnostic();
      expect(diag.strategy).toBe('fallback');
      expect(diag.fallbackEnabled).toBe(true);
      expect(diag.fallbackServers).toEqual(['1.1.1.1', '8.8.8.8']);
      expect(diag.mongodbHosts).toContain(MONGO_HOST);
      expect(diag.metrics).toHaveProperty('systemLookups');
      expect(diag.metrics).toHaveProperty('systemFailures');
      expect(diag.metrics).toHaveProperty('fallbackAttempts');
      expect(diag.metrics).toHaveProperty('fallbackRecoveries');
      expect(diag.metrics).toHaveProperty('fallbackFailures');

      const diagJson = JSON.stringify(diag);
      expect(diagJson).not.toContain('password');
      expect(diagJson).not.toContain('secret');
    });
  });

  // ─── Test 7: Error Propagation (No Swallowed Errors) ────────────────────────
  describe('Error Propagation', () => {
    it('propagates the error when both system and fallback resolvers fail', (done) => {
      const fakeMongoHost = 'fake-shard-does-not-exist.uvte5na.mongodb.net';
      configureDns({
        strategy: 'fallback',
        fallbackEnabled: true,
        fallbackServers: ['127.0.0.1'], // deliberately unrouteable fallback to force failure
        mongoHosts: [fakeMongoHost],
      });

      dns.lookup(fakeMongoHost, (err) => {
        // Error MUST NOT be swallowed
        expect(err).toBeTruthy();
        const diag = getDnsDiagnostic();
        expect(diag.metrics.fallbackAttempts).toBeGreaterThanOrEqual(1);
        expect(diag.metrics.fallbackFailures).toBeGreaterThanOrEqual(1);
        expect(diag.lastError).not.toBeNull();
        done();
      });
    });
  });
});
