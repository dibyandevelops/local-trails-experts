import crypto from 'crypto';

type EsewaEnv = 'test' | 'prod';

function getEsewaEnv(): EsewaEnv {
  const raw = (process.env.ESEWA_ENV || 'test').toLowerCase();
  return raw === 'prod' || raw === 'production' ? 'prod' : 'test';
}

export function getEsewaConfig() {
  const env = getEsewaEnv();
  const productCode =
    process.env.ESEWA_PRODUCT_CODE || (env === 'prod' ? '' : 'EPAYTEST');
  const secretKey = process.env.ESEWA_SECRET_KEY || '';
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';

  const checkoutUrl =
    env === 'prod'
      ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
      : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

  const statusUrlBase =
    env === 'prod'
      ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
      : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';

  return {
    env,
    productCode,
    secretKey,
    baseUrl,
    checkoutUrl,
    statusUrlBase,
    isConfigured: Boolean(productCode && secretKey),
  };
}

export function getEsewaRefundConfig() {
  const base = getEsewaConfig();
  const refundUrl = (process.env.ESEWA_REFUND_URL || '').trim();
  const refundApiKey = (process.env.ESEWA_REFUND_API_KEY || '').trim();
  const refundSecret =
    (process.env.ESEWA_REFUND_SECRET_KEY || '').trim() || base.secretKey;
  const merchantId = (process.env.ESEWA_MERCHANT_ID || '').trim();

  return {
    ...base,
    refundUrl,
    refundApiKey,
    refundSecret,
    merchantId,
    isRefundConfigured: Boolean(refundUrl),
  };
}

export function signEsewaPayload(input: {
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  secretKey: string;
}) {
  const message = `total_amount=${input.total_amount},transaction_uuid=${input.transaction_uuid},product_code=${input.product_code}`;
  return crypto
    .createHmac('sha256', input.secretKey)
    .update(message)
    .digest('base64');
}

export function buildEsewaInitiatePayload(input: {
  amountNpr: number;
  taxAmountNpr?: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}) {
  const config = getEsewaConfig();
  const taxAmount = Number.isFinite(input.taxAmountNpr || 0)
    ? Number(input.taxAmountNpr || 0)
    : 0;
  const amount = Math.max(0, Math.round(input.amountNpr));
  const total = amount + taxAmount;
  const totalAmountText = String(total);
  const signature = signEsewaPayload({
    total_amount: totalAmountText,
    transaction_uuid: input.transactionUuid,
    product_code: config.productCode,
    secretKey: config.secretKey,
  });

  return {
    amount: String(amount),
    tax_amount: String(taxAmount),
    total_amount: totalAmountText,
    transaction_uuid: input.transactionUuid,
    product_code: config.productCode,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: input.successUrl,
    failure_url: input.failureUrl,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature,
  };
}

export function parseEsewaCallbackData(encodedData: string) {
  try {
    const decoded = Buffer.from(encodedData, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
}

export async function verifyEsewaTransaction(input: {
  productCode: string;
  totalAmount: string;
  transactionUuid: string;
}) {
  const config = getEsewaConfig();
  const url = new URL(config.statusUrlBase);
  url.searchParams.set('product_code', input.productCode);
  url.searchParams.set('total_amount', input.totalAmount);
  url.searchParams.set('transaction_uuid', input.transactionUuid);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const raw = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw };
  }

  const status = String(data?.status || '').toUpperCase();
  const refId = String(
    data?.ref_id || data?.transaction_code || data?.transaction_id || ''
  );
  return {
    ok: response.ok && status === 'COMPLETE',
    status,
    refId,
    data,
    statusCode: response.status,
  };
}

export async function requestEsewaRefund(input: {
  transactionUuid: string;
  totalAmount: string;
  reason?: string;
  paymentReference?: string | null;
}) {
  const config = getEsewaRefundConfig();
  if (!config.isRefundConfigured) {
    return {
      ok: false,
      status: 'NOT_CONFIGURED',
      refundReference: null,
      data: null,
      statusCode: 0,
    };
  }

  const payload = {
    product_code: config.productCode,
    merchant_id: config.merchantId || undefined,
    transaction_uuid: input.transactionUuid,
    total_amount: input.totalAmount,
    reason: input.reason || 'BOOKING_CANCELLED',
    payment_reference: input.paymentReference || undefined,
  };
  const signatureText = `${payload.transaction_uuid}|${payload.total_amount}|${payload.product_code}`;
  const signature = crypto
    .createHmac('sha256', config.refundSecret)
    .update(signatureText)
    .digest('hex');

  const response = await fetch(config.refundUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(config.refundApiKey ? { authorization: `Bearer ${config.refundApiKey}` } : {}),
      'x-signature': signature,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw };
  }

  const status = String(data?.status || data?.state || '').toUpperCase();
  const refundReference = String(
    data?.refund_reference || data?.refund_id || data?.reference || ''
  ).trim();
  const okStatuses = new Set(['COMPLETE', 'COMPLETED', 'SUCCESS', 'OK', 'REFUNDED']);

  return {
    ok: response.ok && okStatuses.has(status),
    status: status || (response.ok ? 'SUCCESS' : 'FAILED'),
    refundReference: refundReference || null,
    data,
    statusCode: response.status,
  };
}
