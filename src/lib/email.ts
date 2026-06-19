import { EMAIL_NOTIFICATIONS_ENABLED } from '@/lib/feature-flags';
import { getCommunityWhatsappLink } from '@/lib/whatsapp';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  dedupeKey?: string;
};

function getEmailConfig() {
  const defaultFrom = 'LocoXperts <onboarding@resend.dev>';
  return {
    resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
    resendFrom: (process.env.RESEND_FROM || process.env.EMAIL_FROM || defaultFrom).trim(),
  };
}

const dedupeWindowMs = 2 * 60 * 1000;
const recentEmailSends = new Map<string, number>();

function shouldDedupeSend(key: string): boolean {
  const now = Date.now();
  const last = recentEmailSends.get(key);
  if (typeof last === 'number' && now - last < dedupeWindowMs) {
    return true;
  }
  recentEmailSends.set(key, now);
  recentEmailSends.forEach((timestamp, storedKey) => {
    if (now - timestamp > dedupeWindowMs) {
      recentEmailSends.delete(storedKey);
    }
  });
  return false;
}

function maskEmail(value: string) {
  return value.replace(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi, '***@$1');
}

export async function sendEmail(input: SendEmailInput) {
  if (!EMAIL_NOTIFICATIONS_ENABLED) {
    const whatsappLink = getCommunityWhatsappLink(
      `Hi LocoXperts team, I need help regarding: ${input.subject}`
    );
    return {
      sent: false as const,
      skipped: true as const,
      reason: 'email_notifications_disabled' as const,
      fallbackChannel: whatsappLink ? ('whatsapp' as const) : null,
      whatsappLink,
    };
  }

  const { resendApiKey, resendFrom } = getEmailConfig();
  const targetTo = input.to;

  if (input.dedupeKey && shouldDedupeSend(input.dedupeKey)) {
    return { sent: false as const, skipped: true as const, deduped: true as const };
  }

  if (!resendApiKey) {
    console.warn('Resend is not configured. Skipping email send.', {
      to: maskEmail(input.to),
      subject: input.subject,
    });
    return { sent: false as const, skipped: true as const, reason: 'resend_not_configured' as const };
  }

  const fromValue = input.from || resendFrom;
  const { Resend } = await import('resend');
  const resend = new Resend(resendApiKey);
  const result = await resend.emails.send({
    from: fromValue,
    to: targetTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  if ((result as any)?.error) {
    const message =
      typeof (result as any).error?.message === 'string'
        ? (result as any).error.message
        : 'Failed to send email with Resend';
    throw new Error(message);
  }

  return { sent: true as const, provider: 'resend' as const };
}

export async function sendEmailSafe(input: SendEmailInput) {
  try {
    return await sendEmail(input);
  } catch (error) {
    const err = error as {
      code?: string;
      responseCode?: number;
      response?: string;
      message?: string;
    };
    console.error('Resend email send error:', {
      message: err?.message || 'Unknown Resend error',
      code: err?.code,
      responseCode: err?.responseCode,
    });
    return { sent: false as const, skipped: false as const, error: true as const };
  }
}
