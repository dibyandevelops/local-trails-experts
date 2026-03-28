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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative mb-4 overflow-hidden rounded-2xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-hero-glow/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-hero-glow/30 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                    Login
                  </span>
                </div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Sign in
                </Dialog.Title>
                {message ? (
                  <Dialog.Description className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {message}
                  </Dialog.Description>
                ) : (
                  <Dialog.Description className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Sign in to access your account.
                  </Dialog.Description>
                )}
                <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                  Quick access to trails, events, and your profile.
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close login dialog"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hero-border/70 bg-white/80 text-gray-700 transition hover:bg-white dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </Dialog.Close>
            </div>
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
