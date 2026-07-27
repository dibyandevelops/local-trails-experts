# Marketplace Implementation

The marketplace lets riders sell cycles, cycle parts, and accessories through the web platform.
It is implemented as a database-backed feature with separate UI, hook, service, API, and data
access layers.

## User Flows

- Public visitors can browse active marketplace listings at `/marketplace`.
- Logged-in, phone-verified users can create listings.
- Sellers can edit listings, hide or show them, mark them as sold, and delete them.
- Other logged-in users can report suspicious or incorrect listings.
- Admins can review reports, edit listings, hide or restore listings, mark listings sold, and
  delete listings from the admin console.

Deleted listings are soft-deleted. The row remains in the database with `status = 'deleted'` and
`deleted_at` set, but it is excluded from public and seller views.

## Permissions

Listing creation:

- Requires login.
- Requires a verified organization with an active subscription.
- Each seller is limited to 5 live listings. Live means `active` or `hidden`.

Listing management:

- Sellers can update and manage their own listings.
- Admins can update and manage any listing.
- Reports cannot be created for a user's own listing.

Contact preferences:

- Each listing has exactly one contact method: `whatsapp`, `phone`, or `email`.
- The listing stores one editable `contact_value`.
- New listing forms prefill phone or email from the user's profile when available.
- Sellers can change the visible contact value per listing before publishing.

## Architecture

The feature follows the project layer map:

```text
Route composition  src/app/marketplace/page.tsx
Presentation       src/components/feature-components/marketplace/
Admin UI           src/components/admin/marketplace-moderation-panel.tsx
Application state  src/hooks/marketplace/use-marketplace.ts
HTTP services      src/services/marketplace/marketplace.service.ts
Domain utilities   src/lib/marketplace.ts
Server data access src/lib/data/marketplace-listings.ts
API boundary       src/app/api/marketplace/** and src/app/api/admin/marketplace/**
```

SQL is only in `src/lib/data/marketplace-listings.ts`. UI components, hooks, and services do not
query the database directly.

## Database

Marketplace schema lives in:

- `database/migrations/065_create_marketplace_listings.sql`
- `database/migrations/066_marketplace_single_contact_value.sql`
- `database/migrations/067_add_organization_subscriptions.sql`

Main tables:

- `marketplace_listings`: item details, owner, price, category, status, contact method/value.
- `marketplace_listing_images`: ordered listing photos.
- `marketplace_listing_reports`: user reports and admin review state.

Listing statuses:

- `active`: visible publicly.
- `hidden`: visible to owner/admin, hidden from public browse.
- `sold`: visible as seller/admin state, not public browse.
- `deleted`: soft-deleted and hidden from normal marketplace views.

Listing types:

- `cycle`
- `part`
- `accessory`

## API Routes

Public and seller APIs:

```text
GET    /api/marketplace/listings
POST   /api/marketplace/listings
PATCH  /api/marketplace/listings/[id]
DELETE /api/marketplace/listings/[id]
POST   /api/marketplace/listings/[id]/report
```

Admin APIs:

```text
GET   /api/admin/marketplace
PATCH /api/admin/marketplace
```

The normal listing `PATCH` endpoint handles full listing edits and status changes for sellers and
admins. The admin endpoint is used for moderation actions and report review.

## Images

Listing images currently follow the app's existing compressed-data-URL pattern. The client resizes
uploaded images before sending them to the API, and the server validates allowed image payloads.

This is simple and useful for the current stage. For larger marketplace traffic, move listing
images to object storage such as Vercel Blob, S3, or Supabase Storage and store only URLs in
`marketplace_listing_images`.

## Seed Data

Marketplace demo listings can be seeded independently:

```bash
pnpm db:seed:marketplace
```

The seed script is `scripts/seed-marketplace-listings.js`.

It uses available users from the database, prefers phone-verified users, respects the 5 live-listing
limit, and updates matching seeded listings instead of duplicating them.

## Testing Checklist

After applying marketplace migrations:

1. Visit `/marketplace` as a guest and confirm active listings load.
2. Log in as a verified organization owner with an active subscription and create a listing with photos.
3. Edit the listing and change price, description, photos, and contact method/value.
4. Hide, restore, mark sold, and delete the listing from the seller panel.
5. Log in as another user and report a listing.
6. Log in as admin and edit, hide, restore, sell, delete, and review reports from `/admin`.
7. Confirm a user without active organization revenue access cannot publish or reactivate listings.

## Current Tradeoffs

- Marketplace delete is soft-delete only.
- There is no standalone listing detail page yet; listings are card-based.
- Images are stored as validated data URLs rather than external object-storage URLs.
- Payments and escrow are intentionally not implemented. Buyers and sellers contact each other
  directly.
