'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { UserRole } from '@/types';
import LoginComponent from '@/components/feature-components/login';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: UserRole;
  message?: string | null;
  next?: string | null;
};

export default function LoginModal({ open, onOpenChange, initialRole, message, next = null }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Sign in
              </Dialog.Title>
              {message ? (
                <Dialog.Description className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {message}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Choose your role and continue.
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close login dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          <LoginComponent
            embedded
            initialRole={initialRole}
            next={next}
            onLoggedIn={() => onOpenChange(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
