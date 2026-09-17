import mongoose from 'mongoose';
import dns from 'dns';
import net from 'net';
import logger, { logError, logInfo } from './logger';

const READY_STATE_LABEL: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export let lastConnectionError: any = null;
export let lastConnectionErrorAt: string | null = null;
export let lastDisconnectedAt: string | null = null;
export let lastReconnectedAt: string | null = null;
export let lastDisconnectDurationMs: number | null = null;
export let disconnectCount = 0;

let lastAppliedOptions: mongoose.ConnectOptions | null = null;
let lifecycleListenersAttached = false;
let clientListenersAttached = false;
let keepAliveTimer: NodeJS.Timeout | null = null;
let lastDisconnectEpochMs: number | null = null;

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Only apply custom DNS servers if explicitly configured via environment variable.
if (process.env['DNS_SERVERS']) {
  try {
    const dnsServers = process.env['DNS_SERVERS'].split(',').map((s) => s.trim());
    dns.setServers(dnsServers);
    logger.info(`Custom DNS servers configured: ${dnsServers.join(', ')}`);
  } catch (err) {
    logger.warn('Failed to set custom DNS servers', { error: err });
  }
}

mongoose.set('bufferCommands', false);

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const redactSecrets = (value: string): string =>
  String(value)
    .replace(/:([^:@/]+)@/g, ':****@')
    .replace(/(mongodb(?:\+srv)?:\/\/)[^/\s]+/gi, '$1****')
    .replace(/(bearer\s+)[a-zA-Z0-9._-]+/gi, '$1****')
    .replace(/(jwt=)[a-zA-Z0-9._-]+/gi, '$1****');

const currentStateLabel = (): string =>
  READY_STATE_LABEL[mongoose.connection.readyState] || String(mongoose.connection.readyState);

const serializeMongoError = (error: any): Record<string, unknown> | null => {
  if (!error) return null;
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: redactSecrets(error),
      code: null,
    };
  }
  const serialized: Record<string, unknown> = {
    name: error?.name || 'Error',
    message: error?.message ? redactSecrets(String(error.message)) : 'Unknown error',
    code: error?.code ?? null,
    topologyType: error?.reason?.type || null,
    connectionId: error?.connectionId ?? null,
    servers: [] as unknown[],
  };

  if (error?.reason?.servers) {
    try {
      const serverEntries: any[] = error.reason.servers instanceof Map
        ? Array.from(error.reason.servers.entries())
        : Object.entries(error.reason.servers);
      serialized.servers = serverEntries.map((entry: any) => {
        const addr = entry[0];
        const server = entry[1] || {};
        return {
          address: addr,
          type: server.type || 'Unknown',
          errorName: server.error?.name || null,
          errorMessage: server.error?.message ? redactSecrets(String(server.error.message)) : null,
          errorCode: server.error?.code || null,
        };
      });
    } catch {
      // Keep empty servers array if topology dump fails
    }
  }

  return serialized;
};

const recordRuntimeError = (error: any, source: string): void => {
  lastConnectionError = serializeMongoError(error);
  lastConnectionErrorAt = new Date().toISOString();
  const safeMessage = String(lastConnectionError?.message || 'Unknown error');
  const safeName = String(lastConnectionError?.name || 'Error');
  const safeError = new Error(safeMessage);
  safeError.name = safeName;
  logError(`MongoDB ${source}`, safeError, {
    ...lastConnectionError,
    timestamp: lastConnectionErrorAt,
    connectionState: currentStateLabel(),
    readyState: mongoose.connection.readyState,
  });
};

const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env['NODE_ENV'] === 'test'
    ? process.env['MONGODB_URI_TEST']
    : process.env['MONGODB_URI'];

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const maxPoolSize = parseInt(process.env['MONGODB_MAX_POOL_SIZE'] || '10', 10);
  const minPoolSize = parseInt(process.env['MONGODB_MIN_POOL_SIZE'] || '2', 10);
  const connectTimeoutMS = parseInt(process.env['MONGODB_CONNECT_TIMEOUT_MS'] || '10000', 10);
  const socketTimeoutMS = parseInt(process.env['MONGODB_SOCKET_TIMEOUT'] || '45000', 10);
  const serverSelectionTimeoutMS = parseInt(
    process.env['MONGODB_SERVER_SELECTION_TIMEOUT'] || '5000',
    10
  );
  const waitQueueTimeoutMS = parseInt(process.env['MONGODB_WAIT_QUEUE_TIMEOUT'] || '5000', 10);
  const maxIdleTimeMS = parseInt(process.env['MONGODB_MAX_IDLE_TIME_MS'] || '120000', 10);

  const options: mongoose.ConnectOptions = {
    maxPoolSize: Number.isFinite(maxPoolSize) && maxPoolSize > 0 ? maxPoolSize : 10,
    minPoolSize: Number.isFinite(minPoolSize) && minPoolSize >= 0 ? minPoolSize : 2,
    connectTimeoutMS: Number.isFinite(connectTimeoutMS) && connectTimeoutMS > 0 ? connectTimeoutMS : 10000,
    socketTimeoutMS: Number.isFinite(socketTimeoutMS) && socketTimeoutMS > 0 ? socketTimeoutMS : 45000,
    serverSelectionTimeoutMS: Number.isFinite(serverSelectionTimeoutMS) && serverSelectionTimeoutMS > 0 ? serverSelectionTimeoutMS : 5000,
    waitQueueTimeoutMS: Number.isFinite(waitQueueTimeoutMS) && waitQueueTimeoutMS > 0 ? waitQueueTimeoutMS : 5000,
    maxIdleTimeMS: Number.isFinite(maxIdleTimeMS) && maxIdleTimeMS > 0 ? maxIdleTimeMS : 120000,
    retryWrites: true,
    retryReads: true,
    w: 'majority',
  };

  return { uri, options };
};

const startKeepAlive = () => {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return;
    }
    try {
      await mongoose.connection.db.admin().ping();
    } catch (error: any) {
      recordRuntimeError(error, 'keepalive ping failed');
    }
  }, 60000);
  if (typeof keepAliveTimer.unref === 'function') {
    keepAliveTimer.unref();
  }
};

const stopKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
};

const attachClientListenersOnce = (client: any): void => {
  if (!client || clientListenersAttached || typeof client.on !== 'function') return;
  clientListenersAttached = true;

  // Officially supported SDAM events in MongoDB Node Driver v6
  client.on('serverHeartbeatFailed', (event: any) => {
    const failure = event?.failure;
    const details = serializeMongoError(failure);
    const duration = event?.duration;
    const connectionId = event?.connectionId;

    lastConnectionError = {
      ...(details || { name: 'ServerHeartbeatFailed', message: 'MongoDB server heartbeat failed' }),
      connectionId: connectionId || null,
      durationMs: duration || null,
    };
    lastConnectionErrorAt = new Date().toISOString();

    const safeMessage = String(lastConnectionError?.message || 'Server heartbeat failed');
    const safeError = new Error(safeMessage);
    safeError.name = String(lastConnectionError?.name || 'ServerHeartbeatFailed');

    logger.warn('MongoDB server heartbeat failed', {
      ...lastConnectionError,
      timestamp: lastConnectionErrorAt,
      connectionState: currentStateLabel(),
      readyState: mongoose.connection.readyState,
    });
  });

  client.on('connectionCheckOutFailed', (event: any) => {
    logger.warn('MongoDB connection pool checkout failed', {
      reason: event?.reason || 'Unknown',
      timestamp: new Date().toISOString(),
      connectionState: currentStateLabel(),
      readyState: mongoose.connection.readyState,
    });
  });
};

const attachLifecycleListenersOnce = (): void => {
  if (lifecycleListenersAttached) return;
  lifecycleListenersAttached = true;

  mongoose.connection.on('connecting', () => {
    logInfo('MongoDB connecting', {
      timestamp: new Date().toISOString(),
      connectionState: currentStateLabel(),
      readyState: mongoose.connection.readyState,
    });
  });

  mongoose.connection.on('connected', () => {
    const now = Date.now();
    let downtimeMs: number | null = null;
    if (lastDisconnectEpochMs != null) {
      downtimeMs = now - lastDisconnectEpochMs;
      lastDisconnectDurationMs = downtimeMs;
      lastDisconnectEpochMs = null;
      lastReconnectedAt = new Date(now).toISOString();
    }
    logInfo('MongoDB connected', {
      timestamp: new Date().toISOString(),
      connectionState: currentStateLabel(),
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      ...(downtimeMs != null && {
        downtimeMs,
        downtimeSeconds: Number((downtimeMs / 1000).toFixed(3)),
      }),
    });
  });

  mongoose.connection.on('error', (err) => {
    const details = serializeMongoError(err);
    console.error('❌ MongoDB runtime error:', details?.name, details?.message, details?.code);
    recordRuntimeError(err, 'runtime error');
  });

  mongoose.connection.on('disconnected', () => {
    lastDisconnectEpochMs = Date.now();
    lastDisconnectedAt = new Date(lastDisconnectEpochMs).toISOString();
    disconnectCount += 1;
    logger.warn('MongoDB disconnected', {
      timestamp: lastDisconnectedAt,
      connectionState: currentStateLabel(),
      readyState: mongoose.connection.readyState,
      disconnectCount,
      lastErrorName: lastConnectionError?.name || null,
      lastErrorMessage: lastConnectionError?.message || null,
      lastErrorCode: lastConnectionError?.code ?? null,
      lastConnectionErrorAt,
    });
  });

  mongoose.connection.on('reconnected', () => {
    const now = Date.now();
    lastReconnectedAt = new Date(now).toISOString();
    const downtimeMs = lastDisconnectEpochMs != null ? now - lastDisconnectEpochMs : null;
    if (downtimeMs != null) {
      lastDisconnectDurationMs = downtimeMs;
      lastDisconnectEpochMs = null;
    }
    logInfo(
      downtimeMs != null
        ? `MongoDB reconnected after ${downtimeMs}ms`
        : 'MongoDB reconnected',
      {
        timestamp: lastReconnectedAt,
        downtimeMs,
        downtimeSeconds: downtimeMs != null ? Number((downtimeMs / 1000).toFixed(3)) : null,
        connectionState: currentStateLabel(),
        readyState: mongoose.connection.readyState,
        disconnectCount,
      }
    );
  });
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();
    lastAppliedOptions = options;
    attachLifecycleListenersOnce();

    logInfo('Connecting to MongoDB', {
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
      connectTimeoutMS: options.connectTimeoutMS,
      socketTimeoutMS: options.socketTimeoutMS,
      waitQueueTimeoutMS: options.waitQueueTimeoutMS,
      maxIdleTimeMS: options.maxIdleTimeMS,
    });

    await mongoose.connect(uri, options);

    try {
      const client = mongoose.connection.getClient();
      attachClientListenersOnce(client);
    } catch {
      // client listener non-fatal
    }

    startKeepAlive();

    logInfo('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      poolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
      connectionState: currentStateLabel(),
    });
  } catch (error: any) {
    recordRuntimeError(error, 'initial connection failure');
    console.error('❌ Failed to connect to MongoDB:', error?.message ? redactSecrets(String(error.message)) : error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    stopKeepAlive();
    await mongoose.connection.close();
    logInfo('MongoDB connection closed');
  } catch (error) {
    logError('Error closing MongoDB connection', error);
    throw error;
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export const getDatabaseStats = () => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models),
  };
};

const probeTcp = (host: string, port: number, timeoutMs = 3000): Promise<{ host: string; port: number; status: string; error?: string }> => {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port, timeout: timeoutMs });
    s.on('connect', () => {
      s.destroy();
      resolve({ host, port, status: 'CONNECTED_OPEN' });
    });
    s.on('timeout', () => {
      s.destroy();
      resolve({ host, port, status: 'TIMED_OUT' });
    });
    s.on('error', (err: any) => {
      resolve({ host, port, status: 'ERROR', error: err.code || err.message });
    });
  });
};

const resolveAppliedOptions = (): mongoose.ConnectOptions => {
  if (lastAppliedOptions) return lastAppliedOptions;
  try {
    return getDatabaseConfig().options;
  } catch {
    return {
      maxPoolSize: parseInt(process.env['MONGODB_MAX_POOL_SIZE'] || '10', 10),
      minPoolSize: parseInt(process.env['MONGODB_MIN_POOL_SIZE'] || '2', 10),
      connectTimeoutMS: 10000,
      socketTimeoutMS: parseInt(process.env['MONGODB_SOCKET_TIMEOUT'] || '45000', 10),
      serverSelectionTimeoutMS: parseInt(process.env['MONGODB_SERVER_SELECTION_TIMEOUT'] || '5000', 10),
      waitQueueTimeoutMS: parseInt(process.env['MONGODB_WAIT_QUEUE_TIMEOUT'] || '5000', 10),
      maxIdleTimeMS: parseInt(process.env['MONGODB_MAX_IDLE_TIME_MS'] || '120000', 10),
    };
  }
};

export const getDiagnosticInfo = async (runActiveProbes = false) => {
  const options = resolveAppliedOptions();
  const timeouts = {
    connectTimeoutMS: options.connectTimeoutMS ?? 10000,
    socketTimeoutMS: options.socketTimeoutMS ?? 45000,
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 5000,
    waitQueueTimeoutMS: options.waitQueueTimeoutMS ?? 5000,
    maxIdleTimeMS: options.maxIdleTimeMS ?? 120000,
  };

  const pool = {
    maxPoolSize: options.maxPoolSize ?? 10,
    minPoolSize: options.minPoolSize ?? 2,
  };

  const runtime = {
    disconnectCount,
    lastDisconnectedAt,
    lastReconnectedAt,
    lastDisconnectDurationMs,
    lastConnectionErrorAt,
    currentConnectionState: currentStateLabel(),
  };

  const rawUri = process.env['NODE_ENV'] === 'test'
    ? process.env['MONGODB_URI_TEST']
    : process.env['MONGODB_URI'];

  let sanitizedConfig: any = { exists: Boolean(rawUri) };
  if (rawUri) {
    try {
      const protocolMatch = rawUri.match(/^([^:]+):\/\//);
      const protocol = protocolMatch ? protocolMatch[1] : 'unknown';
      const withoutProtocol = rawUri.replace(/^[^:]+:\/\//, '');
      const withoutAuth = withoutProtocol.replace(/^[^@]+@/, '');
      const [hostPart, queryPart] = withoutAuth.split('?');
      const [hosts, dbName] = hostPart ? hostPart.split('/') : ['', ''];
      sanitizedConfig = {
        exists: true,
        protocol,
        hosts: hosts ? hosts.split(',') : [],
        database: dbName || null,
        hasCredentials: rawUri.includes('@'),
        isLocalhost: hosts ? (hosts.includes('localhost') || hosts.includes('127.0.0.1')) : false,
        queryParams: queryPart ? queryPart.split('&').map((p) => p.split('=')[0]) : [],
      };
    } catch (e: any) {
      sanitizedConfig = { exists: true, parseError: e.message };
    }
  }

  const diagnostic: any = {
    timestamp: new Date().toISOString(),
    connected: isDatabaseConnected(),
    readyState: mongoose.connection.readyState,
    currentConnectionState: currentStateLabel(),
    isDatabaseConnected: isDatabaseConnected(),
    pool,
    timeouts,
    connectionTimeouts: timeouts,
    runtime,
    lastConnectionError: lastConnectionError ? serializeMongoError(lastConnectionError) : null,
    environment: process.env['NODE_ENV'] || 'unknown',
    mongooseVersion: mongoose.version,
    configuredDnsServers: dns.getServers(),
    uriConfig: sanitizedConfig,
  };

  if (runActiveProbes && sanitizedConfig.hosts?.length) {
    const activeProbes: any = { dnsSrv: null, dnsLookup: null, tcpPorts: [] };
    const primaryHost = sanitizedConfig.hosts[0];
    if (sanitizedConfig.protocol === 'mongodb+srv') {
      try {
        const srv = await dns.promises.resolveSrv('_mongodb._tcp.' + primaryHost);
        activeProbes.dnsSrv = { status: 'success', records: srv.map((r) => ({ name: r.name, port: r.port })) };
        for (const record of srv) {
          const tcpStatus = await probeTcp(record.name, record.port, 3000);
          activeProbes.tcpPorts.push(tcpStatus);
        }
      } catch (err: any) {
        activeProbes.dnsSrv = { status: 'failed', code: err.code || 'UNKNOWN', message: err.message };
      }
    } else {
      const [h, p] = primaryHost.split(':');
      const port = parseInt(p || '27017', 10);
      try {
        const lookup = await dns.promises.lookup(h, { all: true });
        activeProbes.dnsLookup = { status: 'success', addresses: lookup };
      } catch (err: any) {
        activeProbes.dnsLookup = { status: 'failed', code: err.code || 'UNKNOWN', message: err.message };
      }
      const tcpStatus = await probeTcp(h, port, 3000);
      activeProbes.tcpPorts.push(tcpStatus);
    }
    diagnostic.activeProbes = activeProbes;
  }

  return diagnostic;
};

export const supportsTransactions = (): boolean => {
  try {
    const client = (mongoose.connection?.getClient?.() || (mongoose.connection as any).client) as any;
    const topology = client?.topology?.description;
    if (!topology) return false;
    if (topology.type === 'Single') return false;
    const servers = Array.from(topology.servers?.values?.() || []) as any[];
    if (servers.some((s: any) => s.type === 'Standalone')) return false;
    return true;
  } catch (_err) {
    return false;
  }
};

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  isConnected: isDatabaseConnected,
  supportsTransactions,
  getStats: getDatabaseStats,
  getDiagnosticInfo,
};
