/**
 * Structured Logger for HiddenDepths Frontend
 * 
 * Provides consistent logging across the application with different levels.
 * In production, only warnings and errors are logged to the console.
 * Debug and info logs are suppressed in production builds.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === 'development';

// Format context data for readable output
const formatContext = (context?: LogContext): string => {
  if (!context || Object.keys(context).length === 0) return '';
  try {
    return ' ' + JSON.stringify(context);
  } catch {
    return ' [unserializable context]';
  }
};

// Get timestamp for logs
const timestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - only shown in development
   * Use for detailed debugging information
   */
  debug: (message: string, context?: LogContext): void => {
    if (isDev) {
      console.debug(`[DEBUG ${timestamp()}] ${message}${formatContext(context)}`);
    }
  },

  /**
   * Info level - only shown in development
   * Use for general operational information
   */
  info: (message: string, context?: LogContext): void => {
    if (isDev) {
      console.info(`[INFO ${timestamp()}] ${message}${formatContext(context)}`);
    }
  },

  /**
   * Warn level - shown in all environments
   * Use for recoverable issues or deprecation notices
   */
  warn: (message: string, context?: LogContext): void => {
    console.warn(`[WARN ${timestamp()}] ${message}${formatContext(context)}`);
  },

  /**
   * Error level - shown in all environments
   * Use for errors that need attention
   */
  error: (message: string, error?: unknown, context?: LogContext): void => {
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    const fullContext = {
      ...context,
      ...(errorMessage && { error: errorMessage }),
      ...(error instanceof Error && error.stack && isDev && { stack: error.stack }),
    };
    console.error(`[ERROR ${timestamp()}] ${message}${formatContext(fullContext)}`);
    
    // TODO: In production, send to error tracking service (e.g., Sentry)
    // if (!isDev && typeof window !== 'undefined') {
    //   Sentry.captureException(error, { extra: context });
    // }
  },

  /**
   * Performance timing helper
   * Use to measure operation duration
   */
  time: (label: string): void => {
    if (isDev) {
      console.time(`[PERF] ${label}`);
    }
  },

  timeEnd: (label: string): void => {
    if (isDev) {
      console.timeEnd(`[PERF] ${label}`);
    }
  },
};

export default logger;
