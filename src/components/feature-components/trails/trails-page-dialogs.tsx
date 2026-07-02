'use client';

import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import type { SportType, Trail, User } from '@/types';
import type { MapStyleMode } from '@/lib/map-styles';
import EventForm from '@/components/feature-components/event-form/event-form';

const TrailsMapPreview = dynamic(() => import('./trails-map-preview'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[calc(82vh-52px)] place-items-center px-4 text-center text-sm text-gray-300">
      Loading map...
    </div>
  ),
});

type TrailMapDialogProps = {
  open: boolean;
  trail: Trail | null;
  detail: Trail | undefined;
  loading: boolean;
  error: Error | null;
  mapStyle: string;
  mapStyleMode: MapStyleMode;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onMapStyleModeChange: (mode: MapStyleMode) => void;
};

export function TrailMapDialog({
  open,
  trail,
  detail,
  loading,
  error,
  mapStyle,
  mapStyleMode,
  onOpenChange,
  onRetry,
  onMapStyleModeChange,
}: TrailMapDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[82vh] w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <Dialog.Title className="truncate pr-2 text-sm font-semibold text-white">
              {trail?.name || 'Trail map'}
            </Dialog.Title>
            <Dialog.Close className="rounded border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/10">Close</Dialog.Close>
          </div>
          {loading ? (
            <MapMessage>Loading trail route...</MapMessage>
          ) : error ? (
            <MapMessage>
              <div className="space-y-3">
                <p>{error.message || 'Failed to load trail map.'}</p>
                <button type="button" onClick={onRetry} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">Retry map</button>
              </div>
            </MapMessage>
          ) : detail?.route_data?.coordinates?.length ? (
            <TrailsMapPreview trail={detail} mapStyle={mapStyle} mapStyleMode={mapStyleMode} onMapStyleModeChange={onMapStyleModeChange} />
          ) : (
            <MapMessage>No GPX route data available for this trail.</MapMessage>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MapMessage({ children }: { children: React.ReactNode }) {
  return <div className="grid h-[calc(82vh-52px)] place-items-center px-4 text-center text-sm text-gray-300">{children}</div>;
}

type CreateTrailEventDialogProps = {
  open: boolean;
  trailId: string;
  sport: string;
  trail: Trail | null;
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
};

export function CreateTrailEventDialog({
  open,
  trailId,
  sport,
  trail,
  user,
  onOpenChange,
  onCompleted,
}: CreateTrailEventDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <Dialog.Title className="truncate pr-2 text-sm font-semibold text-gray-900">Create event for selected trail</Dialog.Title>
            <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">Close</Dialog.Close>
          </div>
          {trailId ? (
            <div className="h-[calc(88vh-52px)] overflow-y-auto p-4">
              <EventForm
                mode="create"
                lockTrailAndSport
                embedded
                initialUser={user}
                prefillTrailId={trailId}
                prefillTrail={trail}
                prefillSport={(sport || 'mtb') as SportType}
                onCompleted={onCompleted}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          ) : (
            <div className="grid h-[calc(88vh-52px)] place-items-center text-sm text-gray-600">Select a trail to create an event.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TrailsToast({
  open,
  title,
  description,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root open={open} onOpenChange={onOpenChange} className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
        <Toast.Title className="text-sm font-semibold text-gray-900">{title}</Toast.Title>
        <Toast.Description className="mt-1 text-xs text-gray-600">{description}</Toast.Description>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-4 right-4 z-50" />
    </Toast.Provider>
  );
}
