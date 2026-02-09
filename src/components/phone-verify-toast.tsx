'use client';

import * as Toast from '@radix-ui/react-toast';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PhoneVerifyToast() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.user && !data.user.phone_verified_at) {
          setHasUser(true);
          setRole(data.user.role);
          setOpen(true);
        }
      } catch (error) {
        console.error('Error loading user for toast', error);
      }
    };

    fetchUser();
  }, []);

  if (!hasUser) {
    return null;
  }

  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root
        open={open}
        onOpenChange={setOpen}
        className="fixed bottom-4 right-4 w-[90vw] max-w-sm rounded-2xl bg-white border border-gray-200 shadow-lg p-4"
      >
        <Toast.Title className="text-sm font-semibold text-gray-900">
          Verify your phone number
        </Toast.Title>
        <Toast.Description className="text-xs text-gray-600 mt-1">
          Add OTP verification to unlock bookings and expert features.
        </Toast.Description>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(role === 'expert' ? '/experts/me' : '/participants/me')
            }
            className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
          >
            Verify now
          </button>
          <Toast.Close asChild>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Later
            </button>
          </Toast.Close>
        </div>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-4 right-4 z-50" />
    </Toast.Provider>
  );
}
