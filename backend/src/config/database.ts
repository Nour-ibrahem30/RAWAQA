import mongoose from 'mongoose';
import dns from 'dns';
import logger, { logError, logInfo } from './logger';

// Only override DNS servers if explicitly provided in environment variables
if (process.env['DNS_SERVERS']) {
  try {
    dns.setServers(process.env['DNS_SERVERS'].split(',').map((s) => s.trim()));
    logger.info(`Custom DNS servers configured: ${process.env['DNS_SERVERS']}`);
  } catch (err) {
    logger.warn('Failed to set custom DNS servers', { error: err });
  }
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
};
