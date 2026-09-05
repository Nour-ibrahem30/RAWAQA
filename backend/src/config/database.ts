import mongoose from 'mongoose';
import logger, { logError, logInfo } from './logger';

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
    maxPoolSize: parseInt(process.env['MONGODB_MAX_POOL_SIZE'] || '10', 10),
    minPoolSize: parseInt(process.env['MONGODB_MIN_POOL_SIZE'] || '2', 10),
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

    logInfo('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      poolSize: options.maxPoolSize,
    });

    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      logError('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logInfo('MongoDB reconnected');
    });

  } catch (error) {
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

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  isConnected: isDatabaseConnected,
  getStats: getDatabaseStats,
};
