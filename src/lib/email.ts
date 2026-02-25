const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getEmailConfig() {
  return {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || 'Guided Trails <no-reply@localguides.vercel.app>',
  };
}

function parseFrom(from: string) {
  const match = from.match(/^(.*)<(.+)>$/);
  const name = match?.[1]?.trim().replace(/^"|"$/g, '') || 'Guided Trails';
  const email = match?.[2]?.trim() || from.trim();
  return { name, email };
}

export async function sendEmail(input: SendEmailInput) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY is not configured. Skipping email send.', {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false, skipped: true as const };
  }

  const fromSender = parseFrom(from);

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: fromSender,
      subject: input.subject,
      content: [
        { type: 'text/plain', value: input.text },
        { type: 'text/html', value: input.html },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email send failed (${response.status}): ${body}`);
  }

  return { sent: true as const };
}

export async function sendEmailSafe(input: SendEmailInput) {
  try {
    return await sendEmail(input);
  } catch (error) {
    console.error('Email send error:', error);
    return { sent: false as const, skipped: false as const, error: true as const };
  }
}
