# Organization Subscriptions

Organization subscriptions unlock revenue features for verified organizations. The current plan is
NPR 5,000 per month and uses manual QR payment review.

## Admin Flow

Admins manage subscription payment setup from the Admin Operations panel.

- Upload or replace the payment QR.
- Edit the payment note shown to organizations.
- Enable or pause subscription payment submissions.
- Review submitted payment proofs.
- Approve payments to activate or extend the organization subscription.
- Reject payments with a required admin note so the organization knows what to fix.

Payment settings are stored in `platform_subscription_settings` and served by
`/api/organization-subscription-settings`. The public `GET` response lets the organization payment
page show the current QR, note, and payment availability. The admin-only `PATCH` route updates the
QR, note, enabled state, and updater.

## Organization Flow

Organization owners and admins visit `/organizations/me/subscription`.

- If payments are paused or the QR is missing, the payment form is disabled.
- If a payment proof is already pending, another proof cannot be submitted.
- If the last payment was rejected, the admin note is shown and the organization can submit again.
- If approved, the subscription becomes active and the expiry date is extended by the submitted
  number of months.

## Access Rules

An organization can use revenue features only when all of these are true:

- The organization is active.
- The organization is verified.
- The subscription status is `trialing` or `active`.
- The subscription expiry is empty or in the future.

The shared entitlement helper is `src/lib/organization-access.ts`.

Server-side gates currently protect:

- Marketplace listing creation and activation.
- Organization cycling service creation and activation.
- Fundraising campaign creation and public activation.
- Monthly organization promotions.
- Organization ride-program creation and activation.

These checks live in the API/data layer. UI controls may hide unavailable actions for convenience,
but the API remains the source of truth.

## Database

Subscription schema lives in:

- `database/migrations/067_add_organization_subscriptions.sql`
- `database/migrations/068_create_organization_subscription_payments.sql`
- `database/migrations/069_create_organization_promotions.sql`
- `database/migrations/070_create_platform_subscription_settings.sql`

Relevant tables and columns:

- `organizations.subscription_status`
- `organizations.subscription_plan`
- `organizations.subscription_expires_at`
- `organization_subscription_payments`
- `organization_promotions`
- `platform_subscription_settings`

## Testing Checklist

1. As admin, upload a QR, edit the note, enable payments, and reload the admin page.
2. As an organization owner, open `/organizations/me/subscription` and confirm the QR and note
   appear.
3. Submit payment proof and confirm a pending row appears in the admin panel.
4. Try submitting another proof while one is pending and confirm it is blocked.
5. Reject a payment without a note and confirm the API/UI requires a reason.
6. Reject with a note and confirm the organization sees the note.
7. Approve a new payment and confirm the organization becomes verified, active, and has an updated
   expiry date.
8. Confirm marketplace listings, services, campaigns, promotions, and ride programs cannot be
   published by organizations without active revenue access.
