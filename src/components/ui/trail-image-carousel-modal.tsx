'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';

type TrailImageCarouselModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailName: string;
  images: string[];
  initialIndex?: number;
};

export default function TrailImageCarouselModal({
  open,
  onOpenChange,
  trailName,
  images,
  initialIndex = 0,
}: TrailImageCarouselModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const safeIndex =
      initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0;
    setActiveImageIndex(safeIndex);
  }, [trailName, images, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!images.length) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, images.length, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-slate-950 p-3 sm:p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-white">
              {trailName} Gallery
            </Dialog.Title>
            <Dialog.Close className="rounded border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10">
              Close
            </Dialog.Close>
          </div>
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 rounded-full bg-slate-800 p-4 text-slate-400">
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current stroke-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">No photos available yet</p>
              <p className="mt-1 text-xs text-slate-400">Upload photos to view them in this gallery.</p>
            </div>
          ) : (
            <>
              <div className="relative h-[60vh] w-full">
                <Image
                  src={images[activeImageIndex]}
                  alt={`${trailName} photo ${activeImageIndex + 1}`}
                  fill
                  unoptimized
                  sizes="95vw"
                  className="rounded-lg object-contain"
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((imageUrl, index) => (
                    <button
                      key={`thumb-${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded border ${
                        index === activeImageIndex ? 'border-green-500' : 'border-white/20'
                      }`}
                    >
                      <Image
                        src={imageUrl}
                        alt={`${trailName} thumbnail ${index + 1}`}
                        width={96}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
