'use client';

import * as Dialog from '@radix-ui/react-dialog';

type ShuttleContact = {
  name: string;
  phone: string;
  area: string;
  service: string;
};

const MOCK_SHUTTLE_CONTACTS: ShuttleContact[] = [
  {
    name: 'Ridge Shuttle Crew',
    phone: '+977-9810011223',
    area: 'Kathmandu Valley',
    service: 'Downhill MTB day shuttles',
  },
  {
    name: 'Enduro Transfer Nepal',
    phone: '+977-9801122334',
    area: 'Kathmandu to hill trails',
    service: 'Enduro drop-offs and bike transport',
  },
  {
    name: 'Pokhara Gravity Shuttle',
    phone: '+977-9845566778',
    area: 'Pokhara outskirts',
    service: 'Weekend downhill shuttle support',
  },
];

export default function ShuttleFacilitiesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Paid Shuttle Facilities
          </Dialog.Title>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Contact local shuttle operators for downhill and enduro trail transfers.
          </p>

          <div className="mt-4 space-y-3">
            {MOCK_SHUTTLE_CONTACTS.map((contact) => (
              <div
                key={contact.phone}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/80"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {contact.name}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{contact.service}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{contact.area}</p>
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  {contact.phone}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
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

