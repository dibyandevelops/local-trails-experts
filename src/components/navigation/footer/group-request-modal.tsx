'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { User } from '@/types';
import GroupRequestForm from '@/components/feature-components/group-request-form';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser?: User | null;
};

export default function GroupRequestModal({
  open,
  onOpenChange,
  initialUser = null,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Organize a large group
              </Dialog.Title>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Send your group details and preferred date — we’ll follow up to help you organize.
              </p>
            </div>
            <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
              Close
            </Dialog.Close>
          </div>

          <div className="mt-5">
            <GroupRequestForm
              initialUser={initialUser}
              initialTrail={null}
              onSent={() => onOpenChange(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

