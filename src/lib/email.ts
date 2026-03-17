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
  const defaultMailbox = 'admin@locoexperts.com';
  const rawPass =
    process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
  return {
    from: (process.env.EMAIL_FROM || defaultMailbox).trim(),
    resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
    resendFrom: (process.env.RESEND_FROM || defaultMailbox).trim(),
    smtpHost: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    smtpPort: Number(process.env.SMTP_PORT || '465'),
    smtpSecure: (process.env.SMTP_SECURE || 'true') === 'true',
    smtpUser: (process.env.SMTP_USER || defaultMailbox).trim(),
    // Gmail app passwords are often copied with spaces; strip whitespace.
    smtpPass: rawPass.replace(/\s+/g, ''),
    // Optional safety routing: if set, all outgoing mail lands in one inbox.
    overrideTo: (process.env.EMAIL_OVERRIDE_TO || '').trim(),
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

function parseFrom(from: string) {
  const match = from.match(/^(.*)<(.+)>$/);
  const name = match?.[1]?.trim().replace(/^"|"$/g, '') || 'LocoXperts';
  const email = match?.[2]?.trim() || from.trim();
  return { name, email };
}

export async function sendEmail(input: SendEmailInput) {
  const {
    from,
    resendApiKey,
    resendFrom,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    overrideTo,
  } = getEmailConfig();

  const effectiveFrom = (input.from || from).trim();
  const fromSender = parseFrom(effectiveFrom);
  const targetTo = overrideTo || input.to;

  if (overrideTo) {
    const dedupeKey =
      input.dedupeKey ||
      `${overrideTo}|${input.subject}|${(input.text || '').slice(0, 200)}`;
    if (shouldDedupeSend(dedupeKey)) {
      return { sent: false as const, skipped: true as const, deduped: true as const };
    }
  }

  // Prefer Resend when configured (more reliable than consumer SMTP).
  if (resendApiKey) {
    const baseFrom = input.from || resendFrom || effectiveFrom;
    const fromValue =
      baseFrom ||
      (effectiveFrom.includes('<')
        ? effectiveFrom
        : `${fromSender.name} <${fromSender.email}>`) ||
      'LocoXperts <onboarding@resend.dev>';

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
          : 'Failed to send email';
      throw new Error(message);
    }
    return { sent: true as const, provider: 'resend' as const };
  }

  if (!smtpPass) {
    console.warn('Email provider is not configured. Skipping email send.', {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false, skipped: true as const };
  }

  // Lazy-load to avoid hard compile-time dependency coupling.
  const nodeRequire = eval('require');
  const nodemailer = nodeRequire('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: `${fromSender.name} <${fromSender.email}>`,
    to: targetTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });

  return { sent: true as const, provider: 'smtp' as const };
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
    const isAuthError =
      err?.code === 'EAUTH' ||
      err?.responseCode === 535 ||
      (err?.response || '').includes('5.7.8');
    if (isAuthError) {
      console.error(
        'Email auth failed (SMTP). Use Gmail app password (16 chars), not your account password. Ensure 2FA is enabled and SMTP_USER matches the Gmail account.'
      );
    } else {
      console.error('Email send error:', error);
    }
    return { sent: false as const, skipped: false as const, error: true as const };
  }
}
