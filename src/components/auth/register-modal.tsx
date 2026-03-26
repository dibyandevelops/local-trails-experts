'use client';

import * as Dialog from '@radix-ui/react-dialog';
import RegisterForm from '@/components/auth/register-form';

export default function RegisterModal({
  open,
  onOpenChange,
  notice,
  next,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice?: string | null;
  next?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
          <div className="relative overflow-hidden rounded-2xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-hero-glow/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-hero-glow/30 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                    Register
                  </span>
                </div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create your account
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Join as a participant to request trails and join events.
                </p>
                <p className="mt-2 text-[11px] text-gray-600 dark:text-slate-300">
                  Save trails, join local rides, and manage bookings from one place.
                </p>
              </div>
              <Dialog.Close className="rounded-lg border border-hero-border/70 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-white dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>
          </div>

          <div className="mt-5">
            <RegisterForm
              embedded
              notice={notice || null}
              next={next || '/'}
              onRegistered={() => onOpenChange(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
