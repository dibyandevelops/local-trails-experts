'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import CollaborateForm, { type SponsorTier } from '@/components/feature-components/collaborate-form';

export default function SponsorInquiryModal({
  triggerLabel = 'Start sponsorship inquiry',
  initialTier = 'custom',
}: {
  triggerLabel?: string;
  initialTier?: SponsorTier;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800"
        >
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Sponsor collaboration inquiry
              </Dialog.Title>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Choose a tier, share your scope, and we&apos;ll follow up with a proposal.
              </p>
            </div>
            <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
              Close
            </Dialog.Close>
          </div>

          <div className="mt-5">
            <CollaborateForm initialTier={initialTier} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

