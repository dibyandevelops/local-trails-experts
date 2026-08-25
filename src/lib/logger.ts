import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  durationMs?: number;
  [key: string]: any;
};

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const logPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context || {}),
    ...(error instanceof Error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : error
      ? { error: String(error) }
      : {}),
  };

  const json = JSON.stringify(logPayload);

  if (level === 'error') {
    console.error(json);
  } else if (level === 'warn') {
    console.warn(json);
  } else {
    console.log(json);
  }

  return logPayload;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      return formatLog('debug', message, context);
    }
  },

  info(message: string, context?: LogContext) {
    return formatLog('info', message, context);
  },

  warn(message: string, context?: LogContext) {
    const payload = formatLog('warn', message, context);
    try {
      Sentry.addBreadcrumb({
        category: 'log.warn',
        message,
        level: 'warning',
        data: context,
      });
    } catch {
      // Ignore Sentry unavailable in test
    }
    return payload;
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const payload = formatLog('error', message, context, error);
    try {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: { logMessage: message, ...context },
        });
      } else {
        Sentry.captureMessage(`${message}: ${String(error || '')}`, {
          level: 'error',
          extra: context,
        });
      }
    } catch {
      // Ignore Sentry unavailable in test
    }
    return payload;
  },

  child(defaultContext: LogContext) {
    return {
      debug: (msg: string, ctx?: LogContext) => logger.debug(msg, { ...defaultContext, ...ctx }),
      info: (msg: string, ctx?: LogContext) => logger.info(msg, { ...defaultContext, ...ctx }),
      warn: (msg: string, ctx?: LogContext) => logger.warn(msg, { ...defaultContext, ...ctx }),
      error: (msg: string, err?: unknown, ctx?: LogContext) =>
        logger.error(msg, err, { ...defaultContext, ...ctx }),
    };
  },
};
