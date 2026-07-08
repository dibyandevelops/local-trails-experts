'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  marketplaceReportReasons,
  type MarketplaceListing,
  type MarketplaceReportReason,
} from '@/lib/marketplace';

const reasonLabels: Record<MarketplaceReportReason, string> = {
  suspected_scam: 'Suspected scam',
  prohibited_item: 'Prohibited or unsafe item',
  incorrect_details: 'Incorrect details',
  already_sold: 'Already sold',
  other: 'Other',
};

export default function MarketplaceReportDialog({
  listing,
  onOpenChange,
  onSubmit,
}: {
  listing: MarketplaceListing | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: MarketplaceReportReason, details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<MarketplaceReportReason>('suspected_scam');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (listing) {
      setReason('suspected_scam');
      setDetails('');
      setError('');
    }
  }, [listing]);

  return (
    <Dialog.Root open={Boolean(listing)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-bold text-gray-950 dark:text-white">Report listing</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Report {listing?.title}. An admin will review it.
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700" aria-label="Close report form">
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              setIsSubmitting(true);
              try {
                await onSubmit(reason, details);
                onOpenChange(false);
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Could not submit the report.');
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value as MarketplaceReportReason)} className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                {marketplaceReportReasons.map((item) => <option key={item} value={item}>{reasonLabels[item]}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
              Details <span className="font-normal text-gray-500">(optional)</span>
              <textarea rows={4} maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            {error ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
            <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} Submit report
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
