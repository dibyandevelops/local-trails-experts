'use client';

import * as Dialog from '@radix-ui/react-dialog';

export default function CollaboratorsModal({
  open,
  onOpenChange,
  contactEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactEmail?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Looking for collaborators
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            We are looking for people who can contribute to LocoXperts—digital marketing,
            partnerships, content, community support, and trail-related operations.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            If you want to help, reach out and share how you can contribute.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent('LocoXperts collaboration')}&body=${encodeURIComponent('Hi LocoXperts team,\n\nI would like to collaborate and can help with:\n- \n\n')}`}
                className="inline-flex items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Contact team
              </a>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

