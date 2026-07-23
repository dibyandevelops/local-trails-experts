export const MARKETPLACE_LISTING_LIMIT = 5;
export const MARKETPLACE_IMAGE_LIMIT = 4;
export const MARKETPLACE_IMAGE_MAX_LENGTH = 550_000;

export const marketplaceListingTypes = [
  { value: 'all', label: 'All items' },
  { value: 'cycle', label: 'Cycles' },
  { value: 'part', label: 'Parts' },
  { value: 'accessory', label: 'Accessories' },
] as const;

export const marketplaceCategories = [
  'All',
  'MTB',
  'Gravel',
  'City',
  'Kids',
  'Drivetrain',
  'Suspension',
  'Wheels',
  'Cockpit',
  'Protection',
  'Bags',
  'Lights',
  'Other',
] as const;

export const marketplaceConditions = ['excellent', 'good', 'needs_service'] as const;
export const marketplaceContactMethods = ['whatsapp', 'phone', 'email'] as const;
export const marketplaceReportReasons = [
  'suspected_scam',
  'prohibited_item',
  'incorrect_details',
  'already_sold',
  'other',
] as const;

export type MarketplaceListingType = Exclude<
  (typeof marketplaceListingTypes)[number]['value'],
  'all'
>;
export type MarketplaceListingCategory = Exclude<(typeof marketplaceCategories)[number], 'All'>;
export type MarketplaceListingCondition = (typeof marketplaceConditions)[number];
export type MarketplaceContactMethod = (typeof marketplaceContactMethods)[number];
export type MarketplaceListingStatus = 'active' | 'hidden' | 'sold' | 'deleted';
export type MarketplaceReportReason = (typeof marketplaceReportReasons)[number];
export type MarketplaceReportStatus = 'open' | 'reviewed' | 'dismissed';

export type MarketplaceSeller = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
};

export type MarketplaceListing = {
  id: string;
  ownerUserId: string;
  title: string;
  listingType: MarketplaceListingType;
  category: MarketplaceListingCategory;
  condition: MarketplaceListingCondition;
  priceNpr: number;
  location: string;
  fitLabel: string | null;
  description: string;
  highlights: string[];
  contactMethods: MarketplaceContactMethod[];
  contactValue: string;
  status: MarketplaceListingStatus;
  images: string[];
  seller: MarketplaceSeller;
  reportCount?: number;
  openReportCount?: number;
  createdAt: string;
  updatedAt: string;
  soldAt: string | null;
};

export type MarketplaceListingInput = {
  title: string;
  listingType: MarketplaceListingType;
  category: MarketplaceListingCategory;
  condition: MarketplaceListingCondition;
  priceNpr: number;
  location: string;
  fitLabel: string;
  description: string;
  highlights: string[];
  contactMethods: MarketplaceContactMethod[];
  contactValue: string;
  images: string[];
};

export type MarketplaceReport = {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterName: string;
  reporterEmail: string;
  reason: MarketplaceReportReason;
  details: string | null;
  status: MarketplaceReportStatus;
  createdAt: string;
};

export type MarketplaceViewer = {
  id: string;
  role: 'participant' | 'expert' | 'admin';
  isPhoneVerified: boolean;
  phone: string | null;
  email: string | null;
  revenueOrganization: {
    id: string;
    slug: string;
    name: string;
    isVerified: boolean;
    subscriptionStatus: string;
    subscriptionPlan: string;
    subscriptionExpiresAt: string | null;
    canCreateRevenueFeatures: boolean;
  } | null;
};

export type MarketplacePageData = {
  listings: MarketplaceListing[];
  myListings: MarketplaceListing[];
  viewer: MarketplaceViewer | null;
  listingLimit: number;
};

export function formatMarketplacePrice(priceNpr: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(priceNpr);
}

export function validateMarketplaceListingInput(value: unknown) {
  const input = (value || {}) as Partial<MarketplaceListingInput>;
  const title = String(input.title || '').trim();
  const location = String(input.location || '').trim();
  const fitLabel = String(input.fitLabel || '').trim();
  const description = String(input.description || '').trim();
  const contactValue = String(input.contactValue || '').trim();
  const priceNpr = Number(input.priceNpr);
  const listingType = input.listingType;
  const category = input.category;
  const condition = input.condition;
  const highlights = Array.isArray(input.highlights)
    ? input.highlights.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
    : [];
  const contactMethods = Array.isArray(input.contactMethods)
    ? Array.from(new Set(input.contactMethods)).filter((item): item is MarketplaceContactMethod =>
        marketplaceContactMethods.includes(item as MarketplaceContactMethod)
      )
    : [];
  const images = Array.isArray(input.images)
    ? input.images.map((item) => String(item).trim()).filter(Boolean).slice(0, MARKETPLACE_IMAGE_LIMIT)
    : [];

  if (title.length < 4 || title.length > 120) return { error: 'Title must be 4 to 120 characters.' };
  if (!['cycle', 'part', 'accessory'].includes(String(listingType))) {
    return { error: 'Choose a valid item type.' };
  }
  if (!marketplaceCategories.slice(1).includes(category as MarketplaceListingCategory)) {
    return { error: 'Choose a valid category.' };
  }
  if (!marketplaceConditions.includes(condition as MarketplaceListingCondition)) {
    return { error: 'Choose a valid condition.' };
  }
  if (!Number.isInteger(priceNpr) || priceNpr < 0 || priceNpr > 100_000_000) {
    return { error: 'Enter a valid price in NPR.' };
  }
  if (location.length < 2 || location.length > 120) return { error: 'Enter a valid location.' };
  if (fitLabel.length > 120) return { error: 'Fit or size must be 120 characters or less.' };
  if (description.length < 20 || description.length > 2_000) {
    return { error: 'Description must be 20 to 2,000 characters.' };
  }
  if (contactMethods.length !== 1) return { error: 'Choose one contact method.' };
  if (contactValue.length < 3 || contactValue.length > 160) {
    return { error: 'Enter a valid contact value.' };
  }
  const selectedContactMethod = contactMethods[0];
  if (selectedContactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
    return { error: 'Enter a valid email address.' };
  }
  if (
    (selectedContactMethod === 'phone' || selectedContactMethod === 'whatsapp') &&
    (contactValue.replace(/\D/g, '').length < 7 || contactValue.replace(/\D/g, '').length > 15)
  ) {
    return { error: 'Enter a valid phone number.' };
  }
  if (images.length === 0) return { error: 'Add at least one photo.' };

  return {
    data: {
      title,
      listingType: listingType as MarketplaceListingType,
      category: category as MarketplaceListingCategory,
      condition: condition as MarketplaceListingCondition,
      priceNpr,
      location,
      fitLabel,
      description,
      highlights,
      contactMethods,
      contactValue,
      images,
    } satisfies MarketplaceListingInput,
  };
}
