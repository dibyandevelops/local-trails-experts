export const ORGANIZATION_SUBSCRIPTION_PRICE_NPR = 5_000;
export const ORGANIZATION_SUBSCRIPTION_MIN_MONTHS = 1;
export const ORGANIZATION_SUBSCRIPTION_MAX_MONTHS = 12;
export const ORGANIZATION_SUBSCRIPTION_PROOF_MAX_BYTES = 2_500_000;

export function getOrganizationSubscriptionAmount(months: number) {
  return ORGANIZATION_SUBSCRIPTION_PRICE_NPR * months;
}

export function isValidOrganizationSubscriptionMonths(months: number) {
  return (
    Number.isInteger(months) &&
    months >= ORGANIZATION_SUBSCRIPTION_MIN_MONTHS &&
    months <= ORGANIZATION_SUBSCRIPTION_MAX_MONTHS
  );
}
