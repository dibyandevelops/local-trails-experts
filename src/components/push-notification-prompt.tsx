'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getFirebaseApp } from '@/lib/firebase';

type PermissionState = NotificationPermission | 'unsupported';

function getPlatformLabel() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
}

export default function PushNotificationPrompt() {
  const { data: user = null } = useCurrentUser();
  const [permission, setPermission] = useState<PermissionState>('unsupported');
  const [isEnabling, setIsEnabling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem('push_prompt_dismissed');
      setDismissed(stored === '1');
    } catch {}
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
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
        setMessage('Notification permission is required to enable push.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      const [{ isSupported, getMessaging, getToken, onMessage }] = await Promise.all([
        import('firebase/messaging'),
      ]);

      const supported = await isSupported();
      if (!supported) {
        setMessage('Push messaging is not supported by this browser.');
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        setMessage('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY configuration.');
        return;
      }

      const messaging = getMessaging(getFirebaseApp());
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        setMessage('Unable to get push token.');
        return;
      }

      await fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          platform: getPlatformLabel(),
          userAgent: navigator.userAgent,
        }),
      });

      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'LocoXperts';
        const body = payload.notification?.body || 'You have a new notification.';
        if (document.visibilityState === 'visible') {
          // Keep it simple for foreground messages.
          setMessage(`${title}: ${body}`);
        }
      });

      setEnabled(true);
      setMessage('Push notifications enabled.');
    } catch (error) {
      console.error('Enable push notifications failed:', error);
      setMessage('Failed to enable push notifications.');
    } finally {
      setIsEnabling(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send test notification');
      }
      setMessage('Test notification sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to send test notification.');
    }
  };

  if (!mounted || !user || permission === 'unsupported' || !isMobile) return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[94vw] max-w-md -translate-x-1/2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">
          Enable mobile push notifications
        </p>
        <button
          type="button"
          aria-label="Close push notification prompt"
          onClick={() => {
            setDismissed(true);
            try {
              window.localStorage.setItem('push_prompt_dismissed', '1');
            } catch {}
          }}
          className="rounded-md border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-600">
        Get instant updates for event joins, approvals, and changes.
      </p>
      <div className="mt-3 flex gap-2">
        {permission !== 'granted' || !enabled ? (
          <button
            type="button"
            onClick={enablePushNotifications}
            disabled={isEnabling}
            className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {isEnabling ? 'Enabling...' : 'Enable Push'}
          </button>
        ) : (
          <button
            type="button"
            onClick={sendTestNotification}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Send Test
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-xs text-gray-600">{message}</p>}
    </div>
  );
}
