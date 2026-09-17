import mongoose from 'mongoose';
import dns from 'dns';
import net from 'net';
import logger, { logError, logInfo } from './logger';

// Store last connection error for non-destructive diagnostics
export let lastConnectionError: any = null;

// Force IPv4 lookup ordering to prevent getaddrinfo EAI_AGAIN on container environments
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Use explicitly configured DNS servers, or fallback to Google & Cloudflare public DNS
const dnsServers = process.env['DNS_SERVERS']
  ? process.env['DNS_SERVERS'].split(',').map((s) => s.trim())
  : ['8.8.8.8', '1.1.1.1', '8.8.4.4'];

try {
  dns.setServers(dnsServers);
  logger.info(`DNS servers configured: ${dnsServers.join(', ')}`);
} catch (err) {
  logger.warn('Failed to set DNS servers', { error: err });
}

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env['NODE_ENV'] === 'test' 
    ? process.env['MONGODB_URI_TEST'] 
    : process.env['MONGODB_URI'];

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const options: mongoose.ConnectOptions = {
    maxPoolSize: parseInt(process.env['MONGODB_MAX_POOL_SIZE'] || '50', 10),
    minPoolSize: parseInt(process.env['MONGODB_MIN_POOL_SIZE'] || '5', 10),
    connectTimeoutMS: 10000,
    socketTimeoutMS: parseInt(process.env['MONGODB_SOCKET_TIMEOUT'] || '45000', 10),
    serverSelectionTimeoutMS: parseInt(
      process.env['MONGODB_SERVER_SELECTION_TIMEOUT'] || '5000',
      10
    ),
    // Recommended settings for production
    retryWrites: true,
    retryReads: true,
    w: 'majority',
  };

  return { uri, options };
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();
    
    // Mask password in logs
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    logInfo(`Connecting to MongoDB: ${maskedUri}`);

    await mongoose.connect(uri, options);

    console.log('✅ Database connected');
    logInfo('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      poolSize: options.maxPoolSize,
    });

    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
      logError('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      logInfo('MongoDB reconnected');
    });

  } catch (error: any) {
    lastConnectionError = error;
    console.error('❌ Failed to connect to MongoDB:', error?.message || error);
    logError('Failed to connect to MongoDB', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logInfo('MongoDB connection closed');
  } catch (error) {
    logError('Error closing MongoDB connection', error);
    throw error;
  }
};

// Helper to check if database is connected
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Helper to get database connection stats
export const getDatabaseStats = () => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models),
  };
};

// Non-destructive TCP probe helper
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

// Comprehensive, safe diagnostic collector (NO secrets, NO passwords exposed)
export const getDiagnosticInfo = async (runActiveProbes = false) => {
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

  const serializedError: any = lastConnectionError ? {
    name: lastConnectionError.name || 'Error',
    message: lastConnectionError.message ? String(lastConnectionError.message).replace(/:([^:@]+)@/, ':****@') : 'Unknown error',
    code: lastConnectionError.code || null,
    topologyType: lastConnectionError.reason?.type || null,
    servers: [] as any[],
  } : null;

  if (lastConnectionError?.reason?.servers) {
    try {
      const serverEntries: any[] = lastConnectionError.reason.servers instanceof Map
        ? Array.from(lastConnectionError.reason.servers.entries())
        : Object.entries(lastConnectionError.reason.servers);
      serializedError.servers = serverEntries.map((entry: any) => {
        const addr = entry[0];
        const server = entry[1] || {};
        return {
          address: addr,
          type: server.type || 'Unknown',
          errorName: server.error?.name || null,
          errorMessage: server.error?.message ? String(server.error.message).replace(/:([^:@]+)@/, ':****@') : null,
          errorCode: server.error?.code || null,
        };
      });
    } catch (_e) {}
  }

  const diagnostic: any = {
    timestamp: new Date().toISOString(),
    isDatabaseConnected: isDatabaseConnected(),
    environment: process.env['NODE_ENV'] || 'unknown',
    mongooseVersion: mongoose.version,
    configuredDnsServers: dns.getServers(),
    uriConfig: sanitizedConfig,
    connectionTimeouts: {
      serverSelectionTimeoutMS: parseInt(process.env['MONGODB_SERVER_SELECTION_TIMEOUT'] || '5000', 10),
      connectTimeoutMS: 10000,
      socketTimeoutMS: parseInt(process.env['MONGODB_SOCKET_TIMEOUT'] || '45000', 10),
    },
    lastConnectionError: serializedError,
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

// Helper to check if transactions are supported by MongoDB topology
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
