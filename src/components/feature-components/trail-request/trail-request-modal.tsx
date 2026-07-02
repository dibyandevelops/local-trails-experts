'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { isShuttleEligibleSport } from '@/lib/shuttle';
import ListSelectDropdown from '@/components/ui/list-select-dropdown';

export type TrailRequestTrailOption = {
  id: string;
  name: string;
  sport_type?: string | null;
};

export type TrailRequestExpertOption = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type TrailRequestSubmitPayload = {
  trailId: string;
  description: string;
  preferred_date: string;
  preferred_time?: string;
  offered_price_npr?: number | null;
  nearest_point?: string;
  expert_user_id?: string;
  needs_paid_shuttle?: boolean;
};

type TrailRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailOptions: TrailRequestTrailOption[];
  lockedTrailId?: string | null;
  preselectedExpertId?: string | null;
  experts: TrailRequestExpertOption[];
  expertsBetaEnabled: boolean;
  isSubmitting?: boolean;
  submitDisabledReason?: string;
  message?: string;
  onMessageChange?: (message: string) => void;
  onSubmit: (payload: TrailRequestSubmitPayload) => void;
};

export default function TrailRequestModal({
  open,
  onOpenChange,
  trailOptions,
  lockedTrailId,
  preselectedExpertId,
  experts,
  expertsBetaEnabled,
  isSubmitting = false,
  submitDisabledReason,
  message = '',
  onMessageChange,
  onSubmit,
}: TrailRequestModalProps) {
  const [selectedTrailId, setSelectedTrailId] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [offeredPriceNpr, setOfferedPriceNpr] = useState('');
  const [nearestPoint, setNearestPoint] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [needsPaidShuttle, setNeedsPaidShuttle] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isFirefoxBrowser, setIsFirefoxBrowser] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsFirefoxBrowser(ua.includes('firefox') || ua.includes('fxios'));
  }, []);

  const todayYmd = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return local.toISOString().slice(0, 10);
  }, []);

  const normalizedTrailId = useMemo(() => {
    if (lockedTrailId) return lockedTrailId;
    if (!selectedTrailId && trailOptions.length > 0) return trailOptions[0].id;
    return selectedTrailId;
  }, [lockedTrailId, selectedTrailId, trailOptions]);

  const selectedTrailName =
    trailOptions.find((trail) => trail.id === normalizedTrailId)?.name || '';
  const selectedTrailSportType =
    trailOptions.find((trail) => trail.id === normalizedTrailId)?.sport_type || null;
  const shuttleEligible = isShuttleEligibleSport(selectedTrailSportType);

  useEffect(() => {
    if (!open) return;
    if (lockedTrailId) {
      setSelectedTrailId(lockedTrailId);
    } else if (trailOptions.length > 0 && !selectedTrailId) {
      setSelectedTrailId(trailOptions[0].id);
    }
  }, [open, lockedTrailId, trailOptions, selectedTrailId]);

  useEffect(() => {
    if (!open) return;
    if (expertsBetaEnabled) return;
    if (preselectedExpertId) {
      setSelectedExpertId(preselectedExpertId);
    }
  }, [open, preselectedExpertId, expertsBetaEnabled]);

  const resetForm = () => {
    setSelectedTrailId(lockedTrailId || trailOptions[0]?.id || '');
    setSelectedExpertId(preselectedExpertId || '');
    setPreferredDate('');
    setPreferredTime('');
    setOfferedPriceNpr('');
    setNearestPoint('');
    setRequestDescription('');
    setNeedsPaidShuttle(false);
    setAcceptRisk(false);
    onMessageChange?.('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const validateAndSubmit = () => {
    if (!normalizedTrailId) {
      onMessageChange?.('Please select a trail.');
      return;
    }
    if (!expertsBetaEnabled && !selectedExpertId) {
      onMessageChange?.('Please select a local guide.');
      return;
    }
    if (!preferredDate) {
      onMessageChange?.('Please select a preferred date.');
      return;
    }
    if (!acceptRisk) {
      onMessageChange?.('Please accept the risk acknowledgment.');
      return;
    }

    onMessageChange?.('');
    onSubmit({
      trailId: normalizedTrailId,
      description: requestDescription.trim(),
      expert_user_id: expertsBetaEnabled ? undefined : selectedExpertId,
      preferred_date: preferredDate,
      preferred_time: preferredTime || undefined,
      offered_price_npr: offeredPriceNpr.trim() === '' ? null : Number(offeredPriceNpr),
      nearest_point: nearestPoint.trim() || undefined,
      needs_paid_shuttle: shuttleEligible ? needsPaidShuttle : false,
    });
  };

  const modalBody = (
    <>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request Trail Activity</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
        {selectedTrailName
          ? `Trail: ${selectedTrailName}`
          : expertsBetaEnabled
            ? 'Pick your preferred date. Requests are routed to the team for planning.'
            : 'Pick a local guide and date for your request.'}
      </p>

      <div className="mt-4 space-y-3">
      {message && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {message}
        </div>
      )}

      {!lockedTrailId && (
        <ListSelectDropdown
          label="Select Trail"
          value={selectedTrailId}
          placeholder="Choose trail"
          options={trailOptions.map((trail) => ({
            value: trail.id,
            label: trail.name,
          }))}
          emptyLabel="No trails found."
          onChange={setSelectedTrailId}
        />
      )}

      {!expertsBetaEnabled && (
        <ListSelectDropdown
          label="Select local guide"
          value={selectedExpertId}
          placeholder="Choose a guide"
          options={experts.map((expert) => ({
            value: expert.id,
            label: expert.name || expert.email || 'Local guide',
          }))}
          emptyLabel="No local guides available."
          onChange={setSelectedExpertId}
        />
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Preferred Date</label>
        <input
          type="date"
          value={preferredDate}
          min={todayYmd}
          onChange={(event) => setPreferredDate(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
            Preferred Time
          </label>
          <input
            type="time"
            value={preferredTime}
            onChange={(event) => setPreferredTime(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
            Offered Price (NPR)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={offeredPriceNpr}
            onChange={(event) => setOfferedPriceNpr(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Nearest Meeting Point</label>
        <input
          type="text"
          value={nearestPoint}
          onChange={(event) => setNearestPoint(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="e.g., Chobhar gate, near bus stop"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Notes</label>
        <textarea
          rows={4}
          value={requestDescription}
          onChange={(event) => setRequestDescription(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="Share key expectations: fitness level, pace, route preferences, safety needs, and any special requests."
        />
      </div>

      {shuttleEligible && (
        <label className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
          <input
            type="checkbox"
            checked={needsPaidShuttle}
            onChange={(event) => setNeedsPaidShuttle(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-sky-300 text-sky-700 focus:ring-sky-500"
          />
          <span>
            I want to request a paid shuttle facility for this ride.
          </span>
        </label>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        <input
          type="checkbox"
          checked={acceptRisk}
          onChange={(event) => setAcceptRisk(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
        />
        <span>
          I acknowledge outdoor activities involve risk and I agree to follow the
          guide’s safety instructions.
        </span>
      </label>
    </div>

      <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onClick={() => handleOpenChange(false)}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={validateAndSubmit}
        disabled={Boolean(submitDisabledReason) || isSubmitting || !acceptRisk}
        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        title={submitDisabledReason || undefined}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </div>
      {submitDisabledReason && (
        <p className="mt-2 text-right text-xs text-amber-700 dark:text-amber-300">{submitDisabledReason}</p>
      )}
    </>
  );

  if (isFirefoxBrowser && open) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 grid place-items-center p-4">
          <section className="w-[92vw] max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-slate-950">{modalBody}</section>
        </div>
      </div>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal={!isMobileViewport}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <Dialog.Content className="w-[92vw] max-w-lg rounded-xl bg-white p-5 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-950">
            {modalBody}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
