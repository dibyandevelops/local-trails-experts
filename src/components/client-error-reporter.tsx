'use client';

import { useEffect } from 'react';

type ClientErrorPayload = {
  message: string;
  stack?: string | null;
  source?: string;
  page?: string;
  userAgent?: string;
};

function sendClientError(payload: ClientErrorPayload) {
  const body = JSON.stringify(payload);
  const url = '/api/client-errors';

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // noop: don't throw from error reporter
  });
}

export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      sendClientError({
        message: event.message || 'Unknown client error',
        stack: event.error?.stack || null,
        source: event.filename || 'window.onerror',
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
      const stack = reason instanceof Error ? reason.stack : null;
      sendClientError({
        message,
        stack,
        source: 'unhandledrejection',
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
