'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import AppDialog from '@/components/ui/app-dialog';

type CampaignSupportModalProps = {
  campaignId: string;
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

type DonationFormValues = {
  amount: string;
  paidAmount: string;
  supporterName: string;
  supporterEmail: string;
  message: string;
  wantsProgressUpdates: boolean;
  transactionReference: string;
};

export default function CampaignSupportModal({
  campaignId,
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
  const [step, setStep] = useState<'intent' | 'payment' | 'thanks'>('intent');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const hasContact = Boolean(contactEmail || contactPhone || whatsappUrl);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DonationFormValues>({
    defaultValues: {
      amount: '',
      paidAmount: '',
      supporterName: '',
      supporterEmail: '',
      message: '',
      wantsProgressUpdates: true,
      transactionReference: '',
    },
  });
  const amount = watch('amount');
  const paidAmount = watch('paidAmount');
  const supporterEmail = watch('supporterEmail');
  const wantsProgressUpdates = watch('wantsProgressUpdates');
  const amountValue = Number(amount);
  const paidAmountValue = Number(paidAmount || amount);

  const resetFlow = () => {
    setStep('intent');
    reset();
    setProofImage(null);
    setStatusMessage(null);
  };

  const handleIntentSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleSubmit((values) => {
      setValue('paidAmount', values.amount, { shouldDirty: true });
      setStatusMessage(null);
      setStep('payment');
    })(event);
  };

  const handleProofUpload = async (file: File | null) => {
    if (!file) {
      setProofImage(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setStatusMessage('Upload a valid payment screenshot image.');
      return;
    }
    if (file.size > 2_500_000) {
      setStatusMessage('Upload a screenshot under 2.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(typeof reader.result === 'string' ? reader.result : null);
      setStatusMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const submitCommitment = handleSubmit(async (values) => {
    if (!proofImage) {
      setStatusMessage('Upload your payment screenshot after paying with the QR.');
      return;
    }
    if (!Number.isFinite(paidAmountValue) || paidAmountValue <= 0) {
      setStatusMessage('Enter the amount you paid.');
      return;
    }
    try {
      setStatusMessage(null);
      const response = await fetch(`/api/campaigns/${campaignId}/donation-commitments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount_npr: amountValue,
          paid_amount_npr: paidAmountValue,
          supporter_name: values.supporterName.trim() || null,
          supporter_email: values.supporterEmail.trim() || null,
          message: values.message.trim() || null,
          wants_progress_updates: values.wantsProgressUpdates,
          transaction_reference: values.transactionReference.trim() || null,
          proof_image_url: proofImage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit donation proof.');
      }
      setStep('thanks');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to submit donation proof.');
    }
  });

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
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetFlow();
        }}
        title={step === 'thanks' ? 'Thank you for supporting this campaign' : 'Sponsor this mission'}
        description={
          step === 'intent'
            ? `Tell ${organizationName} how much you want to support before payment.`
            : step === 'payment'
              ? 'Scan the QR, complete payment, and upload a screenshot for manual review.'
              : 'Your payment proof has been submitted for review.'
        }
        maxWidthClassName="max-w-2xl"
      >
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-semibold">{campaignTitle}</p>
            <p className="mt-1">
              NPR {raisedAmount.toLocaleString()} raised of NPR {targetAmount.toLocaleString()} ({progress}%)
            </p>
          </div>

          {statusMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {statusMessage}
            </div>
          )}

          {step === 'intent' && (
            <form onSubmit={handleIntentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                  Amount you want to donate (NPR)
                </label>
                <input
                  type="number"
                  min="1"
                  {...register('amount', {
                    required: 'Enter the amount you want to donate.',
                    validate: (value) =>
                      Number.isFinite(Number(value)) && Number(value) > 0
                        ? true
                        : 'Enter the amount you want to donate.',
                  })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="5000"
                />
                {errors.amount?.message && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Name (optional)
                  </label>
                  <input
                    {...register('supporterName')}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Email for progress updates
                  </label>
                  <input
                    type="email"
                    {...register('supporterEmail', {
                      validate: (value, values) => {
                        const email = value.trim();
                        if (values.wantsProgressUpdates && !email) {
                          return 'Add your email to receive campaign progress updates, or uncheck updates.';
                        }
                        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                          return 'Enter a valid email address.';
                        }
                        return true;
                      },
                    })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="you@example.com"
                  />
                  {errors.supporterEmail?.message && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                      {errors.supporterEmail.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                  Message to the organization (optional)
                </label>
                <textarea
                  {...register('message')}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="What would you like this support to help with?"
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  {...register('wantsProgressUpdates')}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Send me progress updates about how this campaign is used.</span>
              </label>
              {qrImageUrl ? (
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Continue to payment QR
                </button>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  Payment QR is not available yet. Please contact the organization before paying.
                </p>
              )}
            </form>
          )}

          {step === 'payment' && (
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
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
                {paymentNote && (
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-slate-900/70 dark:text-emerald-100">
                    {paymentNote}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  You committed NPR {amountValue.toLocaleString()}. After payment, upload your screenshot so the team can verify it.
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Paid amount (NPR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register('paidAmount', {
                      validate: (value) =>
                        Number.isFinite(Number(value || amount)) && Number(value || amount) > 0
                          ? true
                          : 'Enter the amount you paid.',
                    })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  {errors.paidAmount?.message && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                      {errors.paidAmount.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Transaction reference (optional)
                  </label>
                  <input
                    {...register('transactionReference')}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Reference / remarks / transaction id"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Payment screenshot
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      await handleProofUpload(event.target.files?.[0] || null);
                      if (event.target) event.target.value = '';
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                {proofImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proofImage}
                    alt="Payment proof preview"
                    className="h-28 w-28 rounded-lg border border-gray-200 bg-white object-contain dark:border-slate-700"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('intent')}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Back
                  </button>
                  {qrImageUrl && (
                    <a
                      href={qrImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                      Open QR
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={submitCommitment}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit payment proof'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'thanks' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                <p className="font-semibold">Thank you for supporting {campaignTitle}.</p>
                <p className="mt-2">
                  Your contribution will be carefully spent on the campaign goals, and the payment proof is now waiting for review.
                </p>
                {wantsProgressUpdates && supporterEmail.trim() && (
                  <p className="mt-2">
                    We saved {supporterEmail.trim()} for progress updates so you can follow what changed on the trail.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetFlow();
                    setOpen(false);
                  }}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Close
                </button>
                <Link
                  href={`/organizations/${organizationSlug}`}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  View organization
                </Link>
              </div>
            </div>
          )}

          {step !== 'thanks' && !qrImageUrl && hasContact && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <p className="font-semibold">Payment QR is not available yet. Contact {organizationName} directly.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                    WhatsApp
                  </a>
                )}
                {contactEmail && (
                  <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(campaignTitle)}`} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                    Email
                  </a>
                )}
                {contactPhone && (
                  <a href={`tel:${contactPhone}`} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                    Call
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </AppDialog>
    </>
  );
}
