import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logLevel = process.env['LOG_LEVEL'] || 'info';
const logFileEnabled = process.env['LOG_FILE_ENABLED'] === 'true';

// Custom format for console output (colorized and pretty)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Custom format for file output (JSON for easier parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports if enabled
if (logFileEnabled) {
  // Error logs - separate file for errors only
  transports.push(
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: process.env['LOG_ROTATION_MAX_SIZE'] || '20m',
      maxFiles: process.env['LOG_ROTATION_MAX_FILES'] || '14d',
      zippedArchive: true,
    })
  );

  // Combined logs - all levels
  transports.push(
    new DailyRotateFile({
      filename: path.join('logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: process.env['LOG_ROTATION_MAX_SIZE'] || '20m',
      maxFiles: process.env['LOG_ROTATION_MAX_FILES'] || '14d',
      zippedArchive: true,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  transports,
  // Don't exit on error
  exitOnError: false,
});

// Add stream for Morgan integration
logger.stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
} as any;

// Helper functions for structured logging
export const logError = (
  message: string,
  error: Error | unknown,
  context?: Record<string, any>
) => {
  if (error instanceof Error) {
    logger.error(message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  } else {
    logger.error(message, { error, ...context });
  }
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context);
};

// Export logger instance
export default logger;
