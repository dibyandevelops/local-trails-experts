'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Service workers and Next.js dev HMR can conflict and cause stale chunk/runtime issues.
    // Keep PWA enabled in production only.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      // Best-effort cache cleanup (safe in dev).
      if (typeof caches !== 'undefined') {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        await registration.update();
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    register();
  }, []);

  return null;
}
