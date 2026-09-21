/**
 * logger.ts
 * 
 * On Cloudflare Workers: uses a lightweight console shim.
 * Winston creates Console transports with stream I/O at module-init which is
 * forbidden in the Worker global scope (Cloudflare error 10021).
 *
 * On Node/Render: uses full Winston with optional file rotation.
 */
import { isCloudflareWorker } from '../lib/worker-runtime';

// ── Cloudflare Workers — simple console shim (no streams/timers) ─────────────
function makeWorkerLogger() {
  return {
    error: (msg: string, meta?: any) => console.error('[ERROR]', msg, meta ?? ''),
    warn:  (msg: string, meta?: any) => console.warn('[WARN]',  msg, meta ?? ''),
    info:  (msg: string, meta?: any) => console.log('[INFO]',   msg, meta ?? ''),
    debug: (_msg: string, _meta?: any) => { /* no-op on Workers */ },
    stream: { write: (m: string) => console.log('[HTTP]', m.trim()) },
  };
}

// ── Node / Render — full Winston ──────────────────────────────────────────────
function makeNodeLogger() {
  // Dynamic require so the import never executes on Workers
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const winston       = require('winston');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DailyRotateFile = require('winston-daily-rotate-file');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');

  const logLevel       = process.env['LOG_LEVEL'] || 'info';
  const logFileEnabled = process.env['LOG_FILE_ENABLED'] === 'true';

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
      const metaString = Object.keys(meta).length > 0
        ? '\n' + JSON.stringify(meta, null, 2)
        : '';
      return `${timestamp} [${level}]: ${message}${metaString}`;
    })
  );

  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const transports: any[] = [
    new winston.transports.Console({ format: consoleFormat }),
  ];

  if (logFileEnabled) {
    const rotateOpts = {
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize:  process.env['LOG_ROTATION_MAX_SIZE']  || '20m',
      maxFiles: process.env['LOG_ROTATION_MAX_FILES'] || '14d',
      zippedArchive: true,
    };
    transports.push(new DailyRotateFile({ ...rotateOpts, filename: path.join('logs', 'error-%DATE%.log'),    level: 'error' }));
    transports.push(new DailyRotateFile({ ...rotateOpts, filename: path.join('logs', 'combined-%DATE%.log') }));
  }

  const logger = winston.createLogger({ level: logLevel, transports, exitOnError: false });
  logger.stream = { write: (m: string) => logger.info(m.trim()) };
  return logger;
}

// ── Export the right logger ───────────────────────────────────────────────────
const logger = isCloudflareWorker() ? makeWorkerLogger() : makeNodeLogger();

export const logError = (message: string, error: unknown, context?: Record<string, any>) => {
  if (error instanceof Error) {
    logger.error(message, { error: { name: error.name, message: error.message, stack: error.stack }, ...context });
  } else {
    logger.error(message, { error, ...context });
  }
};

export const logInfo  = (message: string, context?: Record<string, any>) => logger.info(message,  context);
export const logWarn  = (message: string, context?: Record<string, any>) => logger.warn(message,  context);
export const logDebug = (message: string, context?: Record<string, any>) => logger.debug(message, context);

export default logger;
