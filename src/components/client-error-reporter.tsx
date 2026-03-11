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
      const message = event.message || 'Unknown client error';
      // When a client has stale/corrupted chunks (common after deploys or dev HMR),
      // webpack can throw errors like "originalFactory is undefined".
      if (
        typeof window !== 'undefined' &&
        (message.includes('originalFactory is undefined') ||
          message.includes('ChunkLoadError'))
      ) {
        const guardKey = 'mtb_self_heal_reload_v1';
        try {
          if (!sessionStorage.getItem(guardKey)) {
            sessionStorage.setItem(guardKey, '1');
            window.location.reload();
            return;
          }
        } catch {
          // ignore
        }
      }
      sendClientError({
        message,
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
