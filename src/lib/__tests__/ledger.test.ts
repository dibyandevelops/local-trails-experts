import { describe, expect, it } from 'vitest';
import { validateLedgerEntries, type LedgerEntryInput } from '../ledger';

describe('Double-Entry Financial Ledger Engine', () => {
  it('validates a strictly balanced journal transaction', () => {
    const balancedEntries: LedgerEntryInput[] = [
      {
        accountCode: 'platform:escrow',
        accountType: 'asset',
        entryType: 'debit',
        amountCents: 500000, // NPR 5,000.00
      },
      {
        accountCode: 'expert:payable:user_123',
        accountType: 'liability',
        entryType: 'credit',
        amountCents: 450000, // NPR 4,500.00
      },
      {
        accountCode: 'platform:revenue:booking_fee',
        accountType: 'revenue',
        entryType: 'credit',
        amountCents: 50000, // NPR 500.00
      },
    ];

    const result = validateLedgerEntries(balancedEntries);
    expect(result.isValid).toBe(true);
    expect(result.totalDebits).toBe(500000);
    expect(result.totalCredits).toBe(500000);
    expect(result.error).toBeUndefined();
  });

  it('rejects unbalanced journal transactions where Debits != Credits', () => {
    const unbalancedEntries: LedgerEntryInput[] = [
      {
        accountCode: 'platform:escrow',
        accountType: 'asset',
        entryType: 'debit',
        amountCents: 500000,
      },
      {
        accountCode: 'expert:payable:user_123',
        accountType: 'liability',
        entryType: 'credit',
        amountCents: 400000, // NPR 4,000.00 (short by 100,000)
      },
    ];

    const result = validateLedgerEntries(unbalancedEntries);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unbalanced transaction');
  });

  it('rejects transactions with non-positive or non-integer amounts', () => {
    const invalidAmountEntries: LedgerEntryInput[] = [
      {
        accountCode: 'platform:escrow',
        accountType: 'asset',
        entryType: 'debit',
        amountCents: -100,
      },
      {
        accountCode: 'platform:revenue:fee',
        accountType: 'revenue',
        entryType: 'credit',
        amountCents: -100,
      },
    ];

    const result = validateLedgerEntries(invalidAmountEntries);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid amount');
  });

  it('rejects single-entry transactions', () => {
    const singleEntry: LedgerEntryInput[] = [
      {
        accountCode: 'platform:escrow',
        accountType: 'asset',
        entryType: 'debit',
        amountCents: 1000,
      },
    ];

    const result = validateLedgerEntries(singleEntry);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least two entries');
  });
});
