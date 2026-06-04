'use client';

import * as Dialog from '@radix-ui/react-dialog';
import LoginComponent from '@/components/feature-components/login';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string | null;
  next?: string | null;
  onOpenRegister?: () => void;
};

export default function LoginModal({
  open,
  onOpenChange,
  message,
  next = null,
  onOpenRegister,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-950 dark:text-slate-50">
                Sign in
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                {message || 'Use your email or phone number to continue.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close login dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          <LoginComponent
            embedded
            next={next}
            onLoggedIn={() => onOpenChange(false)}
            onOpenRegister={onOpenRegister}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
