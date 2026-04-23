/**
 * Production-safe logging utility
 * Only logs detailed errors in development mode to prevent information leakage
 */

const isDev = import.meta.env.DEV;

/**
 * Log an error with context - only shows details in development
 * @param context - A descriptive context for where the error occurred
 * @param error - The error object or message
 */
export const logError = (context: string, error: unknown): void => {
  if (isDev) {
    console.error(`[${context}]`, error);
  }
  // In production, errors are silently ignored to prevent information leakage
  // Consider integrating with an error tracking service like Sentry for production monitoring
};

/**
 * Log informational messages - only shows in development
 * @param context - A descriptive context for the log
 * @param data - Optional data to log
 */
export const logInfo = (context: string, data?: unknown): void => {
  if (isDev) {
    console.log(`[${context}]`, data);
  }
};

/**
 * Log debug messages - only shows in development
 * @param context - A descriptive context for the log
 * @param data - Optional data to log
 */
export const logDebug = (context: string, data?: unknown): void => {
  if (isDev) {
    console.debug(`[${context}]`, data);
  }
};
