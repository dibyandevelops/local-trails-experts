type Cta = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

type BrandedEmailInput = {
  subject: string;
  appUrl: string;
  headline: string;
  subhead?: string;
  greetingName?: string;
  bodyHtml?: string;
  bodyText?: string;
  ctas?: Cta[];
  profilePath?: string;
};

type WelcomeEmailInput = {
  name: string;
  appUrl: string;
  role?: 'participant' | 'expert';
};

type BookingEmailInput = {
  appUrl: string;
  title: string;
  participantName?: string | null;
  amountNpr?: number | null;
  eventId?: string | null;
};

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '');
}

export function buildBrandedEmail({
  subject,
  appUrl,
  headline,
  subhead,
  greetingName,
  bodyHtml,
  bodyText,
  ctas,
  profilePath = '/participants/me',
}: BrandedEmailInput) {
  const baseUrl = appUrl.trim().replace(/\/$/, '');
  const eventsUrl = `${baseUrl}/events`;
  const trailsUrl = `${baseUrl}/trails`;
  const profileUrl = `${baseUrl}${profilePath.startsWith('/') ? profilePath : `/${profilePath}`}`;
  const defaultCtas: Cta[] = [
    { label: 'Join events', href: eventsUrl, variant: 'primary' },
    { label: 'Search trails', href: trailsUrl, variant: 'secondary' },
  ];
  const resolvedCtas = ctas && ctas.length > 0 ? ctas : defaultCtas;
  const greetingLine = greetingName ? `Hi ${greetingName},` : 'Hello,';

  const text = [
    greetingLine,
    '',
    bodyText || subhead || '',
    '',
    ...resolvedCtas.map((cta) => `${cta.label}: ${cta.href}`),
    '',
    `Manage your profile: ${profileUrl}`,
    '',
    'See you on the trails,',
    'LocoXperts',
  ]
    .filter((line) => line !== '')
    .join('\n');

  const ctaHtml = resolvedCtas
    .map((cta, index) => {
      const isPrimary = cta.variant !== 'secondary';
      const background = isPrimary ? '#16a34a' : '#0f766e';
      const spacing = index === 0 ? 'padding-right:12px;' : '';
      return `
        <td style="${spacing}">
          <a href="${cta.href}" style="display:inline-block;background:${background};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:999px;">${cta.label}</a>
        </td>
      `;
    })
    .join('');

  const html = `
    <div style="background:#f3f4f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#16a34a);color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">LocoXperts</div>
            <div style="font-size:24px;font-weight:700;margin-top:6px;">${headline}</div>
            ${
              subhead
                ? `<div style="font-size:14px;opacity:0.9;margin-top:6px;">${subhead}</div>`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <div style="font-size:14px;line-height:1.6;color:#374151;margin-bottom:16px;">
              ${greetingName ? `<p style="margin:0 0 12px;">Hi ${greetingName},</p>` : ''}
              ${bodyHtml || ''}
            </div>
            <div style="font-size:16px;font-weight:600;margin-bottom:10px;">Quick actions</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                ${ctaHtml}
              </tr>
            </table>
            <div style="font-size:13px;color:#6b7280;">
              Update your profile anytime here:
              <a href="${profileUrl}" style="color:#0f766e;text-decoration:none;font-weight:600;">Manage profile</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">
            If you didn’t create this account, you can ignore this email.
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return { subject, text, html };
}

export function buildWelcomeEmail({ name, appUrl, role }: WelcomeEmailInput) {
  const baseUrl = appUrl.trim().replace(/\/$/, '');
  const isExpert = role === 'expert';
  const ctas: Cta[] = isExpert
    ? [
        { label: 'View expert profile', href: `${baseUrl}/experts/me`, variant: 'primary' },
        { label: 'Create an event', href: `${baseUrl}/events/create`, variant: 'secondary' },
        { label: 'Explore trails', href: `${baseUrl}/trails`, variant: 'secondary' },
      ]
    : [
        { label: 'Join events', href: `${baseUrl}/events`, variant: 'primary' },
        { label: 'Search trails', href: `${baseUrl}/trails`, variant: 'secondary' },
        { label: 'Find experts', href: `${baseUrl}/experts`, variant: 'secondary' },
      ];

  return buildBrandedEmail({
    subject: 'Welcome to LocoXperts',
    appUrl,
    headline: `Welcome, ${name}.`,
    subhead: 'Your account is ready. Let’s plan your next ride.',
    greetingName: name,
    bodyHtml:
      'Discover curated trails, join local events, and ride with trusted guides in your area.',
    bodyText: 'Welcome to LocoXperts. Your account is ready!',
    ctas,
    profilePath: isExpert ? '/experts/me' : '/participants/me',
  });
}

export function buildBookingConfirmedEmail({
  appUrl,
  title,
  participantName,
  amountNpr,
  eventId,
}: BookingEmailInput) {
  const eventsUrl = `${appUrl.replace(/\/$/, '')}${eventId ? `/events/${eventId}` : '/events'}`;
  const amountLine =
    typeof amountNpr === 'number' ? `<br/><strong>Amount:</strong> NPR ${amountNpr}` : '';
  return buildBrandedEmail({
    subject: `Booking confirmed: ${title}`,
    appUrl,
    headline: 'Booking confirmed',
    subhead: title,
    greetingName: participantName || undefined,
    bodyHtml: `Your payment was verified successfully.<br/><strong>Booking:</strong> ${title}${amountLine}`,
    bodyText:
      typeof amountNpr === 'number'
        ? `Your booking is confirmed for ${title}. Amount: NPR ${amountNpr}.`
        : `Your booking is confirmed for ${title}.`,
    ctas: [
      { label: 'View booking', href: eventsUrl, variant: 'primary' },
      { label: 'Search trails', href: `${appUrl.replace(/\/$/, '')}/trails`, variant: 'secondary' },
    ],
  });
}

export function buildBookingCancelledEmail({
  appUrl,
  title,
  participantName,
  amountNpr,
  eventId,
}: BookingEmailInput) {
  const eventsUrl = `${appUrl.replace(/\/$/, '')}${eventId ? `/events/${eventId}` : '/events'}`;
  const refundLine =
    typeof amountNpr === 'number'
      ? `Your booking was cancelled with a full refund of NPR ${amountNpr}.`
      : 'Your booking was cancelled with a full refund.';
  return buildBrandedEmail({
    subject: `Booking cancelled: ${title}`,
    appUrl,
    headline: 'Booking cancelled',
    subhead: title,
    greetingName: participantName || undefined,
    bodyHtml: `Your booking for <strong>${title}</strong> was cancelled.<br/><strong>Refund:</strong> NPR ${amountNpr ?? 0} (full refund).`,
    bodyText: refundLine,
    ctas: [
      { label: 'Browse events', href: eventsUrl, variant: 'primary' },
      { label: 'Search trails', href: `${appUrl.replace(/\/$/, '')}/trails`, variant: 'secondary' },
    ],
  });
}
