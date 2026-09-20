import dns from 'dns';
import net from 'net';
import logger from './logger';

export type DnsResolverStrategy = 'system' | 'fallback' | 'public';

export interface DnsMetrics {
  systemLookups: number;
  systemFailures: number;
  fallbackAttempts: number;
  fallbackRecoveries: number;
  fallbackFailures: number;
}

export interface DnsDiagnostic {
  strategy: DnsResolverStrategy;
  fallbackEnabled: boolean;
  fallbackServers: string[];
  configuredDnsServers: string[];
  resultOrder: string;
  mongodbHosts: string[];
  metrics: DnsMetrics;
  lastError: Record<string, unknown> | null;
  lastErrorAt: string | null;
  lastRecoveryAt: string | null;
}

export interface DnsConfigOptions {
  strategy?: DnsResolverStrategy;
  fallbackEnabled?: boolean;
  fallbackServers?: string[];
  dnsServers?: string[];
  mongoHosts?: string[];
}

// Preserve original Node.js DNS functions once to prevent recursive interception
const originalLookup = dns.lookup;
const originalPromisesLookup = dns.promises.lookup;

// Qualifying transient DNS error codes suitable for retry through fallback resolver
const QUALIFYING_DNS_ERROR_CODES = new Set([
  'EAI_AGAIN',     // Temporary failure in name resolution (root symptom in Abasthan)
  'ETIMEOUT',      // DNS query timed out
  'ENOTFOUND',     // Domain name not found through transient upstream container resolver
  'ECONNREFUSED',  // Local DNS resolver connection refused
  'ESERVFAIL',     // Upstream nameserver failure
]);

/**
 * Normalizes hostnames for strict exact matching:
 * - Trims whitespace
 * - Converts to lower case
 * - Strips trailing dots (FQDN root notation)
 */
export const normalizeHostname = (h: string): string => {
  if (!h || typeof h !== 'string') return '';
  return h.trim().toLowerCase().replace(/\.+$/, '');
};

/**
 * Extracts MongoDB hostnames safely from a MongoDB URI:
 * - Supports direct replica set URIs (multiple comma-separated hosts)
 * - Supports standalone, localhost, and SRV URIs
 * - Never logs or exposes credentials, usernames, passwords, or query tokens
 */
export const extractMongoHostsFromUri = (rawUri?: string | null): string[] => {
  if (!rawUri || typeof rawUri !== 'string') return [];
  try {
    const withoutProtocol = rawUri.replace(/^[a-zA-Z0-9+.-]+:\/\//, '');
    const withoutAuth = withoutProtocol.replace(/^[^@]+@/, '');
    const hostPart = withoutAuth.split('/')[0]?.split('?')[0];
    if (!hostPart) return [];

    const hostEntries = hostPart.split(',').map((s) => s.trim()).filter(Boolean);
    const result: string[] = [];

    for (const entry of hostEntries) {
      let host = entry;
      if (host.startsWith('[')) {
        const closing = host.indexOf(']');
        if (closing !== -1) {
          host = host.slice(1, closing);
        }
      } else {
        const colonIndex = host.indexOf(':');
        if (colonIndex !== -1) {
          host = host.slice(0, colonIndex);
        }
      }
      const normalized = normalizeHostname(host);
      if (normalized && !result.includes(normalized)) {
        result.push(normalized);
      }
    }
    return result;
  } catch {
    return [];
  }
};

/**
 * Checks if an error represents a qualifying transient DNS failure.
 */
export const isQualifyingDnsError = (err: any): boolean => {
  if (!err) return false;
  const code = String(err.code || '').toUpperCase();
  if (QUALIFYING_DNS_ERROR_CODES.has(code)) return true;
  const message = String(err.message || '');
  return (
    message.includes('EAI_AGAIN') ||
    message.includes('ETIMEOUT') ||
    message.includes('ENOTFOUND')
  );
};

// Module state
let activeStrategy: DnsResolverStrategy = 'system';
let fallbackEnabled = false;
let fallbackServers: string[] = ['1.1.1.1', '8.8.8.8'];
let fallbackResolver: dns.Resolver | null = null;
let mongoHostsAllowlist = new Set<string>();
let interceptorInstalled = false;

const metrics: DnsMetrics = {
  systemLookups: 0,
  systemFailures: 0,
  fallbackAttempts: 0,
  fallbackRecoveries: 0,
  fallbackFailures: 0,
};

let lastError: Record<string, unknown> | null = null;
let lastErrorAt: string | null = null;
let lastRecoveryAt: string | null = null;

const safeLog = (
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>
): void => {
  try {
    if (logger && typeof (logger as any)[level] === 'function') {
      (logger as any)[level](message, meta);
      return;
    }
  } catch {}
  if (level === 'error') {
    console.error(`[DNS] ${message}`, meta || '');
  } else if (level === 'warn') {
    console.warn(`[DNS] ${message}`, meta || '');
  } else {
    console.log(`[DNS] ${message}`, meta || '');
  }
};

/**
 * Checks whether a given hostname is explicitly allowlisted as a MongoDB host.
 * Guarantees that only MongoDB hosts extracted from MONGODB_URI are intercepted.
 * Non-MongoDB hosts (e.g. Sentry, payment gateways, Twilio, Cloudinary) always return false.
 */
export const isAllowlistedMongoHost = (
  hostname: string,
  allowlist: Set<string> = mongoHostsAllowlist
): boolean => {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  if (net.isIP(normalized) !== 0 || normalized === 'localhost') {
    return false;
  }
  return allowlist.has(normalized);
};

/**
 * Performs a DNS lookup using the dedicated fallback resolver.
 */
const resolveViaFallback = (
  hostname: string,
  family: number | string | undefined,
  all: boolean | undefined,
  callback: (err: Error | null, address?: any, family?: number) => void
): void => {
  if (!fallbackResolver) {
    fallbackResolver = new dns.Resolver();
    fallbackResolver.setServers(fallbackServers);
  }

  const handleResult = (err: Error | null, addresses: string[] | undefined, isIpv6: boolean) => {
    if (err || !addresses || addresses.length === 0) {
      return callback(err || new Error(`No DNS records found for ${hostname}`));
    }

    if (all) {
      const formatted = addresses.map((addr) => ({
        address: addr,
        family: isIpv6 ? 6 : 4,
      }));
      return callback(null, formatted);
    }

    return callback(null, addresses[0], isIpv6 ? 6 : 4);
  };

  const isV6 = family === 6 || family === 'IPv6';
  const isV4 = family === 4 || family === 'IPv4';

  if (isV6) {
    fallbackResolver.resolve6(hostname, (err, addresses) => handleResult(err, addresses, true));
  } else if (isV4) {
    fallbackResolver.resolve4(hostname, (err, addresses) => handleResult(err, addresses, false));
  } else {
    // Default: try IPv4 first (matching ipv4first result order), fallback to IPv6 if needed
    fallbackResolver.resolve4(hostname, (err4, addresses4) => {
      if (!err4 && addresses4 && addresses4.length > 0) {
        return handleResult(null, addresses4, false);
      }
      fallbackResolver!.resolve6(hostname, (err6, addresses6) => {
        if (!err6 && addresses6 && addresses6.length > 0) {
          return handleResult(null, addresses6, true);
        }
        return handleResult(err4 || err6, undefined, false);
      });
    });
  }
};

/**
 * Production-safe dns.lookup implementation with strict MongoDB-only allowlist scoping.
 */
const scopedLookup: typeof dns.lookup = ((
  hostname: string,
  optionsOrDefault: any,
  callbackOrDefault?: any
): void => {
  let opts: dns.LookupOptions = {};
  let callback: (err: NodeJS.ErrnoException | null, address?: any, family?: number) => void;

  if (typeof optionsOrDefault === 'function') {
    callback = optionsOrDefault;
    opts = {};
  } else if (typeof optionsOrDefault === 'number') {
    opts = { family: optionsOrDefault };
    callback = callbackOrDefault;
  } else if (typeof optionsOrDefault === 'object' && optionsOrDefault !== null) {
    opts = optionsOrDefault;
    callback = callbackOrDefault;
  } else {
    opts = {};
    callback = callbackOrDefault;
  }

  // Fast-path: non-function callback delegation to native validator
  if (typeof callback !== 'function') {
    return (originalLookup as any)(hostname, optionsOrDefault, callbackOrDefault);
  }

  // STRICT SAFETY ENFORCEMENT:
  // If the hostname is NOT on the explicit MongoDB allowlist, delegate directly
  // to the original system resolver with zero modification or interception.
  if (!isAllowlistedMongoHost(hostname)) {
    return originalLookup(hostname, opts, callback);
  }

  metrics.systemLookups += 1;

  // Direct public resolution mode for MongoDB hosts only
  if (activeStrategy === 'public' && fallbackEnabled) {
    metrics.fallbackAttempts += 1;
    resolveViaFallback(hostname, opts.family, opts.all, (fbErr, address, family) => {
      if (!fbErr && address) {
        metrics.fallbackRecoveries += 1;
        lastRecoveryAt = new Date().toISOString();
        return callback(null, address, family);
      }
      // If public fails, attempt system DNS before returning error
      originalLookup(hostname, opts, (sysErr, sysAddress, sysFamily) => {
        if (!sysErr) {
          return callback(null, sysAddress, sysFamily);
        }
        metrics.fallbackFailures += 1;
        metrics.systemFailures += 1;
        lastError = {
          hostname,
          strategy: 'public',
          publicError: fbErr?.message || null,
          systemError: sysErr?.message || null,
          code: sysErr?.code || (fbErr as any)?.code || null,
        };
        lastErrorAt = new Date().toISOString();
        return callback(sysErr, sysAddress, sysFamily);
      });
    });
    return;
  }

  // Standard/Fallback mode: Always try the OS system resolver first
  originalLookup(hostname, opts, (sysErr, address, family) => {
    if (!sysErr) {
      return callback(null, address, family);
    }

    metrics.systemFailures += 1;

    // Check if fallback is active and the error is a qualifying transient resolution error
    const shouldFallback =
      fallbackEnabled &&
      activeStrategy === 'fallback' &&
      isQualifyingDnsError(sysErr);

    if (!shouldFallback) {
      return callback(sysErr, address, family);
    }

    // Execute fallback resolution for the allowlisted MongoDB host
    metrics.fallbackAttempts += 1;
    safeLog(
      'warn',
      `DNS lookup failed via system resolver (${sysErr.code || sysErr.message}) for MongoDB host ${hostname}; attempting fallback DNS [${fallbackServers.join(', ')}]`,
      { hostname, code: sysErr.code }
    );

    resolveViaFallback(hostname, opts.family, opts.all, (fbErr, fbAddress, fbFamily) => {
      if (fbErr || !fbAddress) {
        metrics.fallbackFailures += 1;
        lastError = {
          hostname,
          systemError: sysErr.message,
          systemCode: sysErr.code || null,
          fallbackError: fbErr?.message || 'No records returned',
          fallbackCode: (fbErr as any)?.code || null,
        };
        lastErrorAt = new Date().toISOString();
        safeLog('error', `DNS fallback resolution also failed for MongoDB host ${hostname}`, {
          hostname,
          systemErrorCode: sysErr.code,
          fallbackErrorCode: (fbErr as any)?.code,
        });

        // PRESERVE AND PROPAGATE: Return original system error so it is never swallowed
        return callback(sysErr, address, family);
      }

      metrics.fallbackRecoveries += 1;
      lastRecoveryAt = new Date().toISOString();
      safeLog(
        'info',
        `DNS resolution recovered via fallback DNS for MongoDB host ${hostname} -> ${JSON.stringify(fbAddress)}`,
        { hostname, resolved: fbAddress, fallbackServers }
      );

      return callback(null, fbAddress, fbFamily);
    });
  });
}) as typeof dns.lookup;

/**
 * Production-safe dns.promises.lookup implementation matching native signature and behavior.
 */
const scopedPromisesLookup: typeof dns.promises.lookup = (async (
  hostname: string,
  options?: dns.LookupOptions | number
): Promise<dns.LookupAddress | dns.LookupAddress[]> => {
  if (!isAllowlistedMongoHost(hostname)) {
    return originalPromisesLookup(hostname, options as any);
  }

  return new Promise((resolve, reject) => {
    scopedLookup(hostname, options as any, (err: any, address: any, family: any) => {
      if (err) {
        return reject(err);
      }
      const opts = typeof options === 'object' && options !== null ? options : {};
      if (opts.all) {
        return resolve(address as dns.LookupAddress[]);
      }
      return resolve({ address: address as string, family: family as number });
    });
  });
}) as typeof dns.promises.lookup;

/**
 * Installs the scoped DNS interceptor once.
 */
const installInterceptor = (): void => {
  if (interceptorInstalled) return;
  dns.lookup = scopedLookup;
  dns.promises.lookup = scopedPromisesLookup;
  interceptorInstalled = true;
};

/**
 * Restores original Node.js DNS functions (useful for test isolation and cleanup).
 */
export const restoreOriginalDns = (): void => {
  dns.lookup = originalLookup;
  dns.promises.lookup = originalPromisesLookup;
  interceptorInstalled = false;
};

/**
 * Resets DNS diagnostic counters and records.
 */
export const resetDnsMetrics = (): void => {
  metrics.systemLookups = 0;
  metrics.systemFailures = 0;
  metrics.fallbackAttempts = 0;
  metrics.fallbackRecoveries = 0;
  metrics.fallbackFailures = 0;
  lastError = null;
  lastErrorAt = null;
  lastRecoveryAt = null;
};

/**
 * Dynamically updates the explicit MongoDB host allowlist.
 */
export const setMongoHostsAllowlist = (hosts: string[]): void => {
  mongoHostsAllowlist = new Set(hosts.map(normalizeHostname).filter(Boolean));
};

/**
 * Configures the DNS module with runtime or environment parameters.
 */
export const configureDns = (options: DnsConfigOptions = {}): void => {
  // 1. Enforce ipv4first result order safely
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {}

  // 2. Preserve existing DNS_SERVERS support
  const rawDnsServers = options.dnsServers || (process.env['DNS_SERVERS'] ? process.env['DNS_SERVERS'].split(',').map((s) => s.trim()) : undefined);
  if (rawDnsServers && rawDnsServers.length > 0) {
    try {
      dns.setServers(rawDnsServers);
      safeLog('info', `Custom DNS servers configured: ${rawDnsServers.join(', ')}`);
    } catch (err) {
      safeLog('warn', 'Failed to set custom DNS servers', { error: (err as any)?.message });
    }
  }

  // 3. Fallback servers configuration (defaults to 1.1.1.1, 8.8.8.8)
  const rawFallback = options.fallbackServers || (process.env['DNS_FALLBACK_SERVERS'] ? process.env['DNS_FALLBACK_SERVERS'].split(',').map((s) => s.trim()) : undefined);
  if (rawFallback && rawFallback.length > 0) {
    fallbackServers = rawFallback;
  } else {
    fallbackServers = ['1.1.1.1', '8.8.8.8'];
  }
  if (fallbackResolver) {
    fallbackResolver.setServers(fallbackServers);
  }

  // 4. Strategy & Fallback enablement
  //    Auto-default to 'fallback' in production when the DB host is a Neon host, because
  //    some host platforms' container resolvers return EAI_AGAIN for Neon endpoints.
  //    Explicit env/options always win over this default.
  const dbHostForDefault = (process.env['DATABASE_URL'] || process.env['DATABASE_URL_UNPOOLED'] || '');
  const looksLikeNeon = /neon\.tech/i.test(dbHostForDefault);
  const productionNeonDefault =
    process.env['NODE_ENV'] === 'production' && looksLikeNeon ? 'fallback' : 'system';

  const rawStrategy = options.strategy
    || (process.env['DNS_RESOLVER_STRATEGY'] as DnsResolverStrategy)
    || productionNeonDefault;
  activeStrategy = ['system', 'fallback', 'public'].includes(rawStrategy) ? rawStrategy : 'system';

  const rawFallbackEnabled = options.fallbackEnabled !== undefined
    ? options.fallbackEnabled
    : (process.env['DNS_FALLBACK_ENABLED'] === 'true' || productionNeonDefault === 'fallback');

  // Fallback is only active if explicitly enabled or if strategy explicitly specifies fallback/public
  fallbackEnabled = rawFallbackEnabled || activeStrategy === 'fallback' || activeStrategy === 'public';

  // 5. Database host allowlist population.
  //    The scoped fallback resolver only rescues hosts on this allowlist. Since the
  //    app now runs on PostgreSQL (Neon), the primary host to protect is DATABASE_URL.
  //    We also keep any MONGODB_URI host for backward-compat (harmless if unset).
  if (options.mongoHosts) {
    setMongoHostsAllowlist(options.mongoHosts);
  } else {
    const pgUri = process.env['NODE_ENV'] === 'test'
      ? (process.env['DATABASE_URL_TEST'] || process.env['DATABASE_URL'])
      : (process.env['DATABASE_URL'] || process.env['DATABASE_URL_UNPOOLED']);
    const mongoUri = process.env['NODE_ENV'] === 'test'
      ? (process.env['MONGODB_URI_TEST'] || process.env['MONGODB_URI'])
      : process.env['MONGODB_URI'];
    // Also include the unpooled Neon host if present, so migrations/session ops resolve too.
    const hosts = [
      ...extractMongoHostsFromUri(pgUri),
      ...extractMongoHostsFromUri(process.env['DATABASE_URL_UNPOOLED']),
      ...extractMongoHostsFromUri(mongoUri),
    ].filter((h, i, arr) => h && arr.indexOf(h) === i);
    setMongoHostsAllowlist(hosts);
  }

  // 6. Install interceptor if fallback is enabled or strategy is non-system
  installInterceptor();
};

/**
 * Returns comprehensive safe DNS diagnostics for inclusion in /health/db-diagnostic.
 * Does not expose any secrets, credentials, or full connection strings.
 */
export const getDnsDiagnostic = (): DnsDiagnostic => {
  return {
    strategy: activeStrategy,
    fallbackEnabled,
    fallbackServers: [...fallbackServers],
    configuredDnsServers: dns.getServers(),
    resultOrder: 'ipv4first',
    mongodbHosts: Array.from(mongoHostsAllowlist),
    metrics: { ...metrics },
    lastError: lastError ? { ...lastError } : null,
    lastErrorAt,
    lastRecoveryAt,
  };
};

// Auto-initialize with default environment variables on module import
configureDns();

export default {
  configure: configureDns,
  getDiagnostic: getDnsDiagnostic,
  resetMetrics: resetDnsMetrics,
  setAllowlist: setMongoHostsAllowlist,
  extractMongoHostsFromUri,
  isAllowlistedMongoHost,
  isQualifyingDnsError,
  normalizeHostname,
  restoreOriginalDns,
};
