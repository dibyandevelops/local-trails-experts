'use client';

import dynamic from 'next/dynamic';
import type { User } from '@/types';

const PushNotificationPrompt = dynamic(() => import('@/components/push-notification-prompt'), {
  ssr: false,
});
const ParticipantBookingsFab = dynamic(() => import('@/components/navigation/participant-bookings-fab'), {
  ssr: false,
});
const LocaleFloatingSwitcher = dynamic(() => import('@/components/i18n/locale-floating-switcher'), {
  ssr: false,
});

export default function AppShellExtras({ initialUser = null }: { initialUser?: User | null }) {
  return (
    <>
      <PushNotificationPrompt initialUser={initialUser} />
      <ParticipantBookingsFab />
      <LocaleFloatingSwitcher />
    </>
  );
}
