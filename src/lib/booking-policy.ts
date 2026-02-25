export type CancellationPolicy = {
  refundPercent: number;
  note: string;
};

export function getCancellationPolicy(eventDateIso: string): CancellationPolicy {
  const eventTime = new Date(eventDateIso).getTime();
  const now = Date.now();
  const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);

  if (hoursUntilEvent >= 48) {
    return {
      refundPercent: 100,
      note: 'Full refund for cancellation 48+ hours before event.',
    };
  }

  if (hoursUntilEvent >= 24) {
    return {
      refundPercent: 50,
      note: '50% refund for cancellation 24-48 hours before event.',
    };
  }

  return {
    refundPercent: 0,
    note: 'No refund for cancellations within 24 hours of event start.',
  };
}

export function calculateRefund(totalPriceNpr: number, refundPercent: number) {
  return Math.max(0, Math.round((totalPriceNpr * refundPercent) / 100));
}
