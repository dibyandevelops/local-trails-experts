import type { PoolClient } from 'pg';

export type EntryType = 'debit' | 'credit';

export type LedgerEntryInput = {
  accountCode: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  entryType: EntryType;
  amountCents: number;
  holderId?: string | null;
};

export type LedgerTransactionInput = {
  transactionRef: string;
  description: string;
  entries: LedgerEntryInput[];
  metadata?: Record<string, any>;
};

/**
 * Validates that double-entry journal postings strictly balance:
 * Sum(debit) === Sum(credit) and all amounts are positive.
 */
export function validateLedgerEntries(entries: LedgerEntryInput[]): {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  error?: string;
} {
  if (!entries || entries.length < 2) {
    return {
      isValid: false,
      totalDebits: 0,
      totalCredits: 0,
      error: 'A ledger transaction must contain at least two entries.',
    };
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    if (!Number.isInteger(entry.amountCents) || entry.amountCents <= 0) {
      return {
        isValid: false,
        totalDebits,
        totalCredits,
        error: `Invalid amount ${entry.amountCents} for account ${entry.accountCode}. Amounts must be positive integers in cents.`,
      };
    }

    if (entry.entryType === 'debit') {
      totalDebits += entry.amountCents;
    } else if (entry.entryType === 'credit') {
      totalCredits += entry.amountCents;
    } else {
      return {
        isValid: false,
        totalDebits,
        totalCredits,
        error: `Invalid entry type ${(entry as any).entryType}. Must be 'debit' or 'credit'.`,
      };
    }
  }

  if (totalDebits !== totalCredits) {
    return {
      isValid: false,
      totalDebits,
      totalCredits,
      error: `Unbalanced transaction: debits (${totalDebits}) do not equal credits (${totalCredits}).`,
    };
  }

  return { isValid: true, totalDebits, totalCredits };
}

/**
 * Ensures a ledger account exists or creates it on demand.
 */
export async function getOrCreateLedgerAccount(
  client: PoolClient,
  accountCode: string,
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
  holderId?: string | null
): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM ledger_accounts WHERE account_code = $1`,
    [accountCode]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO ledger_accounts (account_code, account_type, holder_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_code) DO UPDATE SET account_code = EXCLUDED.account_code
     RETURNING id`,
    [accountCode, accountType, holderId || null]
  );
  return inserted.rows[0].id;
}

/**
 * Commits a balanced double-entry transaction to the ledger within an existing client transaction.
 */
export async function recordLedgerTransaction(
  client: PoolClient,
  input: LedgerTransactionInput
): Promise<string> {
  const validation = validateLedgerEntries(input.entries);
  if (!validation.isValid) {
    throw new Error(`Ledger posting rejected: ${validation.error}`);
  }

  const txRes = await client.query(
    `INSERT INTO ledger_transactions (transaction_ref, description, metadata)
     VALUES ($1, $2, $3)
     ON CONFLICT (transaction_ref) DO UPDATE SET description = EXCLUDED.description
     RETURNING id`,
    [input.transactionRef, input.description, JSON.stringify(input.metadata || {})]
  );
  const transactionId = txRes.rows[0].id;

  for (const entry of input.entries) {
    const accountId = await getOrCreateLedgerAccount(
      client,
      entry.accountCode,
      entry.accountType,
      entry.holderId
    );

    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount_cents)
       VALUES ($1, $2, $3, $4)`,
      [transactionId, accountId, entry.entryType, entry.amountCents]
    );
  }

  return transactionId;
}

/**
 * Helper to record a confirmed booking payment with platform fee breakdown.
 */
export async function recordBookingPaymentLedger(
  client: PoolClient,
  params: {
    bookingId: string;
    transactionRef: string;
    amountNpr: number;
    expertUserId?: string | null;
    platformFeePercent?: number;
  }
): Promise<string> {
  const totalCents = Math.round(params.amountNpr * 100);
  const feePercent = params.platformFeePercent ?? 0.10; // Default 10% platform fee
  const platformFeeCents = params.expertUserId ? Math.round(totalCents * feePercent) : totalCents;
  const expertPayableCents = totalCents - platformFeeCents;

  const entries: LedgerEntryInput[] = [
    // Gross payment enters platform escrow asset
    {
      accountCode: 'platform:escrow',
      accountType: 'asset',
      entryType: 'debit',
      amountCents: totalCents,
    },
  ];

  if (params.expertUserId && expertPayableCents > 0) {
    entries.push({
      accountCode: `expert:payable:${params.expertUserId}`,
      accountType: 'liability',
      entryType: 'credit',
      amountCents: expertPayableCents,
      holderId: params.expertUserId,
    });
  }

  if (platformFeeCents > 0) {
    entries.push({
      accountCode: 'platform:revenue:booking_fee',
      accountType: 'revenue',
      entryType: 'credit',
      amountCents: platformFeeCents,
    });
  }

  return recordLedgerTransaction(client, {
    transactionRef: params.transactionRef,
    description: `Booking payment for booking #${params.bookingId}`,
    entries,
    metadata: {
      booking_id: params.bookingId,
      amount_npr: params.amountNpr,
    },
  });
}
