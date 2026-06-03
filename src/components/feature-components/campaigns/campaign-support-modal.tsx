'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppDialog from '@/components/ui/app-dialog';

type CampaignSupportModalProps = {
  campaignTitle: string;
  organizationName: string;
  organizationSlug: string;
  targetAmount: number;
  raisedAmount: number;
  progress: number;
  qrImageUrl?: string | null;
  paymentNote?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappUrl?: string | null;
};

export default function CampaignSupportModal({
  campaignTitle,
  organizationName,
  organizationSlug,
  targetAmount,
  raisedAmount,
  progress,
  qrImageUrl,
  paymentNote,
  contactEmail,
  contactPhone,
  whatsappUrl,
}: CampaignSupportModalProps) {
  const [open, setOpen] = useState(false);
  const hasContact = Boolean(contactEmail || contactPhone || whatsappUrl);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 dark:bg-green-500 dark:text-slate-950 dark:hover:bg-green-400"
      >
        Sponsor this mission
      </button>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="Sponsor this mission"
        description={`Support ${campaignTitle} with ${organizationName}.`}
        maxWidthClassName="max-w-2xl"
      >
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            {qrImageUrl ? (
              <a href={qrImageUrl} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt={`${campaignTitle} payment QR`}
                  className="aspect-square w-full rounded-lg bg-white object-contain p-2"
                />
              </a>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-emerald-300 bg-white p-4 text-center text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-200">
                Payment QR not added yet
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {campaignTitle}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                NPR {raisedAmount.toLocaleString()} raised of NPR {targetAmount.toLocaleString()} ({progress}%)
              </p>
            </div>
            {paymentNote && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                {paymentNote}
              </div>
            )}
            {!qrImageUrl && hasContact && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <p className="font-semibold">Contact {organizationName} to support this campaign.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      WhatsApp
                    </a>
                  )}
                  {contactEmail && (
                    <a
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(campaignTitle)}`}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      Email
                    </a>
                  )}
                  {contactPhone && (
                    <a
                      href={`tel:${contactPhone}`}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {qrImageUrl && (
                <a
                  href={qrImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  Open QR
                </a>
              )}
              <Link
                href={`/organizations/${organizationSlug}`}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View trail builder
              </Link>
            </div>
          </div>
        </div>
      </AppDialog>
    </>
  );
}
