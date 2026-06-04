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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-950 dark:text-slate-50">
                Create your account
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Join rides, save trails, and manage your requests.
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
              ✕
            </Dialog.Close>
          </div>

          <div className="mt-4">
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
