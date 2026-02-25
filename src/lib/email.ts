type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getEmailConfig() {
  const defaultMailbox = 'dibyan.softwaredev@gmail.com';
  const rawPass =
    process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
  return {
    from: (process.env.EMAIL_FROM || defaultMailbox).trim(),
    smtpHost: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    smtpPort: Number(process.env.SMTP_PORT || '465'),
    smtpSecure: (process.env.SMTP_SECURE || 'true') === 'true',
    smtpUser: (process.env.SMTP_USER || defaultMailbox).trim(),
    // Gmail app passwords are often copied with spaces; strip whitespace.
    smtpPass: rawPass.replace(/\s+/g, ''),
    // Temporary safety routing: all outgoing mail lands in one inbox.
    overrideTo: (process.env.EMAIL_OVERRIDE_TO || defaultMailbox).trim(),
  };
}

function parseFrom(from: string) {
  const match = from.match(/^(.*)<(.+)>$/);
  const name = match?.[1]?.trim().replace(/^"|"$/g, '') || 'Guided Trails';
  const email = match?.[2]?.trim() || from.trim();
  return { name, email };
}

export async function sendEmail(input: SendEmailInput) {
  const {
    from,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    overrideTo,
  } = getEmailConfig();
  if (!smtpPass) {
    console.warn('SMTP_PASS is not configured. Skipping email send.', {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false, skipped: true as const };
  }

  const fromSender = parseFrom(from);
  const targetTo = overrideTo || input.to;

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
  });

  return { sent: true as const };
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
