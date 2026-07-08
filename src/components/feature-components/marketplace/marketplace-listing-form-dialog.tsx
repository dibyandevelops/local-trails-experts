'use client';

import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { resizeImageToDataUrl } from '@/lib/image';
import {
  MARKETPLACE_IMAGE_LIMIT,
  marketplaceCategories,
  marketplaceConditions,
  marketplaceContactMethods,
  marketplaceListingTypes,
  type MarketplaceContactMethod,
  type MarketplaceListing,
  type MarketplaceListingInput,
  type MarketplaceViewer,
} from '@/lib/marketplace';

const emptyInput: MarketplaceListingInput = {
  title: '',
  listingType: 'cycle',
  category: 'MTB',
  condition: 'good',
  priceNpr: 0,
  location: '',
  fitLabel: '',
  description: '',
  highlights: [],
  contactMethods: ['whatsapp'],
  contactValue: '',
  images: [],
};

function contactValueForMethod(method: MarketplaceContactMethod, viewer?: MarketplaceViewer | null) {
  return method === 'email' ? viewer?.email || '' : viewer?.phone || '';
}

function listingToInput(
  listing?: MarketplaceListing | null,
  viewer?: MarketplaceViewer | null
): MarketplaceListingInput {
  if (!listing) {
    return {
      ...emptyInput,
      contactValue: contactValueForMethod(emptyInput.contactMethods[0], viewer),
    };
  }
  return {
    title: listing.title,
    listingType: listing.listingType,
    category: listing.category,
    condition: listing.condition,
    priceNpr: listing.priceNpr,
    location: listing.location,
    fitLabel: listing.fitLabel || '',
    description: listing.description,
    highlights: listing.highlights,
    contactMethods: listing.contactMethods,
    contactValue: listing.contactValue,
    images: listing.images,
  };
}

export default function MarketplaceListingFormDialog({
  open,
  onOpenChange,
  listing,
  viewer,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing?: MarketplaceListing | null;
  viewer?: MarketplaceViewer | null;
  onSubmit: (input: MarketplaceListingInput) => Promise<void>;
}) {
  const [form, setForm] = useState<MarketplaceListingInput>(() => listingToInput(listing, viewer));
  const [highlights, setHighlights] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = listingToInput(listing, viewer);
    setForm(next);
    setHighlights(next.highlights.join(', '));
    setError('');
  }, [listing, open, viewer]);

  const update = <K extends keyof MarketplaceListingInput>(key: K, value: MarketplaceListingInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectContact = (method: MarketplaceContactMethod) => {
    setForm((current) => ({
      ...current,
      contactMethods: [method],
      contactValue: listing ? current.contactValue : contactValueForMethod(method, viewer),
    }));
  };

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessingImages(true);
    setError('');
    try {
      const available = MARKETPLACE_IMAGE_LIMIT - form.images.length;
      const selected = Array.from(files).slice(0, available);
      const images = await Promise.all(
        selected.map((file) => resizeImageToDataUrl(file, { maxDimension: 900, quality: 0.78 }))
      );
      setForm((current) => ({ ...current, images: [...current.images, ...images] }));
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Could not process the selected photos.');
    } finally {
      setIsProcessingImages(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await onSubmit({
        ...form,
        highlights: highlights.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the listing.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
  const selectedContactMethod = form.contactMethods[0] || 'whatsapp';
  const contactInputLabel = selectedContactMethod === 'email' ? 'Email address' : selectedContactMethod === 'phone' ? 'Phone number' : 'WhatsApp number';
  const contactInputType = selectedContactMethod === 'email' ? 'email' : 'tel';
  const contactInputPlaceholder = selectedContactMethod === 'email' ? 'you@example.com' : '98XXXXXXXX';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">
                {listing ? 'Edit listing' : 'List an item'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Add accurate details and clear photos so riders can inspect the item before contacting you.
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Close listing form">
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200 sm:col-span-2">
                Item title
                <input required minLength={4} maxLength={120} value={form.title} onChange={(event) => update('title', event.target.value)} className={inputClass} placeholder="e.g. Trek Marlin 7 hardtail" />
              </label>
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Item type
                <select value={form.listingType} onChange={(event) => update('listingType', event.target.value as MarketplaceListingInput['listingType'])} className={inputClass}>
                  {marketplaceListingTypes.filter((item) => item.value !== 'all').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Category
                <select value={form.category} onChange={(event) => update('category', event.target.value as MarketplaceListingInput['category'])} className={inputClass}>
                  {marketplaceCategories.filter((item) => item !== 'All').map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Condition
                <select value={form.condition} onChange={(event) => update('condition', event.target.value as MarketplaceListingInput['condition'])} className={inputClass}>
                  {marketplaceConditions.map((item) => <option key={item} value={item}>{item === 'needs_service' ? 'Needs service' : item[0].toUpperCase() + item.slice(1)}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Price (NPR)
                <input required min={0} max={100000000} type="number" value={form.priceNpr || ''} onChange={(event) => update('priceNpr', Number(event.target.value))} className={inputClass} />
              </label>
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Location
                <input required maxLength={120} value={form.location} onChange={(event) => update('location', event.target.value)} className={inputClass} placeholder="Kathmandu" />
              </label>
              <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Fit or size
                <input maxLength={120} value={form.fitLabel} onChange={(event) => update('fitLabel', event.target.value)} className={inputClass} placeholder="Frame M, 29 inch, size L..." />
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
              Description
              <textarea required minLength={20} maxLength={2000} rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} className={`${inputClass} h-auto py-3`} placeholder="Usage, service history, known issues, and what is included." />
            </label>
            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
              Highlights <span className="font-normal text-gray-500">(comma separated, up to 5)</span>
              <input value={highlights} onChange={(event) => setHighlights(event.target.value)} className={inputClass} placeholder="Tubeless setup, recent service, no crash history" />
            </label>

            <fieldset>
              <legend className="text-sm font-semibold text-gray-800 dark:text-slate-200">Seller contact preferences</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {marketplaceContactMethods.map((method) => (
                  <label key={method} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm capitalize text-gray-700 dark:border-slate-700 dark:text-slate-200">
                    <input type="radio" name="marketplace-contact-method" checked={selectedContactMethod === method} onChange={() => selectContact(method)} className="h-4 w-4 accent-emerald-700" />
                    {method}
                  </label>
                ))}
              </div>
              <label className="mt-3 block text-sm font-semibold text-gray-800 dark:text-slate-200">
                {contactInputLabel}
                <input
                  required
                  type={contactInputType}
                  maxLength={160}
                  value={form.contactValue}
                  onChange={(event) => update('contactValue', event.target.value)}
                  className={inputClass}
                  placeholder={contactInputPlaceholder}
                />
              </label>
            </fieldset>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Photos ({form.images.length}/{MARKETPLACE_IMAGE_LIMIT})</p>
                {form.images.length < MARKETPLACE_IMAGE_LIMIT ? (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">
                    {isProcessingImages ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                    Add photos
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void addImages(event.target.files)} className="sr-only" disabled={isProcessingImages} />
                  </label>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((image, index) => (
                  <div key={`${image.slice(0, 30)}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
                    <Image src={image} alt={`Listing photo ${index + 1}`} fill className="object-cover" sizes="160px" />
                    <button type="button" onClick={() => update('images', form.images.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black" aria-label={`Remove photo ${index + 1}`} title="Remove photo">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</p> : null}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <Dialog.Close className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">Cancel</Dialog.Close>
              <button type="submit" disabled={isSaving || isProcessingImages} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {listing ? 'Save changes' : 'Publish listing'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
