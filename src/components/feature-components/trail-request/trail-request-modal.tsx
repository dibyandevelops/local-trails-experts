'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { isShuttleEligibleSport } from '@/lib/shuttle';

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
  experts: TrailRequestExpertOption[];
  expertsBetaEnabled: boolean;
  isSubmitting?: boolean;
  message?: string;
  onMessageChange?: (message: string) => void;
  onSubmit: (payload: TrailRequestSubmitPayload) => void;
};

export default function TrailRequestModal({
  open,
  onOpenChange,
  trailOptions,
  lockedTrailId,
  experts,
  expertsBetaEnabled,
  isSubmitting = false,
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

  const resetForm = () => {
    setSelectedTrailId(lockedTrailId || trailOptions[0]?.id || '');
    setSelectedExpertId('');
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
      onMessageChange?.('Please select an expert.');
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

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-gray-900">
            Request Trail Activity
          </Dialog.Title>
          <p className="mt-1 text-sm text-gray-600">
            {selectedTrailName
              ? `Trail: ${selectedTrailName}`
              : expertsBetaEnabled
                ? 'Pick your preferred date. Requests are handled by admin while experts are in beta.'
                : 'Pick expert and date for your request.'}
          </p>

          <div className="mt-4 space-y-3">
            {message && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                {message}
              </div>
            )}

            {!lockedTrailId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select Trail</label>
                <select
                  value={selectedTrailId}
                  onChange={(event) => setSelectedTrailId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose trail</option>
                  {trailOptions.map((trail) => (
                    <option key={trail.id} value={trail.id}>
                      {trail.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!expertsBetaEnabled && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select Expert</label>
                <select
                  value={selectedExpertId}
                  onChange={(event) => setSelectedExpertId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose expert</option>
                  {experts.map((expert) => (
                    <option key={expert.id} value={expert.id}>
                      {expert.name || expert.email || 'Expert'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Date</label>
              <input
                type="date"
                value={preferredDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setPreferredDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred Time
                </label>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(event) => setPreferredTime(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Offered Price (NPR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={offeredPriceNpr}
                  onChange={(event) => setOfferedPriceNpr(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nearest Point</label>
              <input
                type="text"
                value={nearestPoint}
                onChange={(event) => setNearestPoint(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Chobhar gate, near bus stop"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={4}
                value={requestDescription}
                onChange={(event) => setRequestDescription(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Share key expectations: fitness level, pace, route preferences, safety needs, and any special requests."
              />
            </div>

            {shuttleEligible && (
              <label className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
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

            <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <input
                type="checkbox"
                checked={acceptRisk}
                onChange={(event) => setAcceptRisk(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span>
                I acknowledge outdoor activities involve risk and I agree to follow the
                expert’s safety instructions.
              </span>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={validateAndSubmit}
              disabled={isSubmitting || !acceptRisk}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
