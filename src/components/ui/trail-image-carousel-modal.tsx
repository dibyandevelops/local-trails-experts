'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';

type TrailImageCarouselModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailName: string;
  images: string[];
};

export default function TrailImageCarouselModal({
  open,
  onOpenChange,
  trailName,
  images,
}: TrailImageCarouselModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [trailName, images]);

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
          {images.length > 0 && (
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
