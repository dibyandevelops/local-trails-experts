'use client';

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getFirebaseApp } from '@/lib/firebase';
import type { User } from '@/types';

type PermissionState = NotificationPermission | 'unsupported';
type PromptState = 'checking' | 'ready' | 'hidden';

const DISMISS_STORAGE_KEY = 'push_prompt_dismissed_until';
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

function getPlatformLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
}

function hasFirebasePushConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  );
}

function isDismissed() {
  try {
    const dismissedUntil = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) || '0');
    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  } catch {
    return false;
  }
}

function dismissPrompt() {
  try {
    window.localStorage.setItem(
      DISMISS_STORAGE_KEY,
      String(Date.now() + DISMISS_DURATION_MS)
    );
  } catch {}
}

type PushNotificationPromptProps = {
  initialUser?: User | null;
};

export default function PushNotificationPrompt({
  initialUser = null,
}: PushNotificationPromptProps) {
  const { data: user = null } = useCurrentUser(initialUser);
  const [permission, setPermission] = useState<PermissionState>('unsupported');
  const [isEnabling, setIsEnabling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<PromptState>('checking');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      process.env.NODE_ENV !== 'production' ||
      !hasFirebasePushConfig() ||
      !window.isSecureContext ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      setPermission('unsupported');
      setPromptState('hidden');
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateMobile = () => setIsMobile(mediaQuery.matches);
    updateMobile();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMobile);
    } else {
      mediaQuery.addListener(updateMobile);
    }

    setPermission(Notification.permission);
    setPromptState(isDismissed() || Notification.permission === 'denied' ? 'hidden' : 'ready');

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', updateMobile);
      } else {
        mediaQuery.removeListener(updateMobile);
      }
    };
  }, []);

  const enablePushNotifications = async () => {
    if (!user) return;
    setIsEnabling(true);
    setMessage(null);
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setMessage('Push is not supported on this device/browser.');
        return;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setMessage('Notifications were not enabled. You can allow them from browser settings later.');
        setPromptState('hidden');
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration('/')) ||
        (await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        }));

      const [{ isSupported, getMessaging, getToken, onMessage }] = await Promise.all([
        import('firebase/messaging'),
      ]);

      const supported = await isSupported();
      if (!supported) {
        setMessage('Push messaging is not supported by this browser.');
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      const messaging = getMessaging(getFirebaseApp());
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        setMessage('Unable to get push token.');
        return;
      }

      const response = await fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          platform: getPlatformLabel(),
          userAgent: navigator.userAgent,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save notification subscription.');
      }

      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'LocoXperts';
        const body = payload.notification?.body || 'You have a new notification.';
        if (document.visibilityState === 'visible') {
          // Keep it simple for foreground messages.
          setMessage(`${title}: ${body}`);
        }
      });

      setMessage('Ride and event notifications are enabled on this device.');
      setPromptState('hidden');
    } catch (error) {
      console.error('Enable push notifications failed:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to enable notifications.');
    } finally {
      setIsEnabling(false);
    }
  };

  if (!user || permission === 'unsupported' || !isMobile || promptState !== 'ready') return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[94vw] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur dark:border-emerald-900/70 dark:bg-slate-950/95 dark:shadow-black/30">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-gray-950 dark:text-white">
            Get trail and event alerts
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-slate-300">
            We’ll notify you about bookings, approvals, trail requests, and important ride changes.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification prompt"
          onClick={() => {
            dismissPrompt();
            setPromptState('hidden');
          }}
          className="rounded-full border border-gray-300 px-2 py-0.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Not now
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={enablePushNotifications}
          disabled={isEnabling}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60 dark:bg-lime-300/20 dark:text-lime-50 dark:ring-1 dark:ring-lime-300/30 dark:hover:bg-lime-300/30"
        >
          {isEnabling ? 'Enabling...' : 'Enable notifications'}
        </button>
      </div>
      {message && (
        <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}
