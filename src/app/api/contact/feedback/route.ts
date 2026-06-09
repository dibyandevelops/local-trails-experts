import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmailSafe } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  page: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(12).max(5000),
});

function getAdminEmail() {
  const candidate =
    (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim();
  return candidate || 'admin@locoexperts.com';
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'feedback', 3, 60);
    if (limited) return limited;

    const raw = await request.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, page, message } = parsed.data;
    const adminEmail = getAdminEmail();
    const subject = `Platform feedback${page ? ` (${page})` : ''}`;

    const html = `
      <div style="background:#f3f4f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#16a34a);color:#ffffff;">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">LocoXperts</div>
              <div style="font-size:22px;font-weight:700;margin-top:6px;">New platform feedback</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <div style="font-size:14px;line-height:1.7;color:#374151;">
                <p style="margin:0 0 12px 0;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
                ${page ? `<p style="margin:0 0 12px 0;"><strong>Page/context:</strong> ${escapeHtml(page)}</p>` : ''}
                <p style="margin:0 0 8px 0;"><strong>Feedback:</strong></p>
                <pre style="white-space:pre-wrap;margin:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;font-size:13px;line-height:1.6;color:#111827;">${escapeHtml(
                  message
                )}</pre>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">
              Received via the LocoXperts feedback modal.
            </td>
          </tr>
        </table>
      </div>
    `;

    const text =
      `Platform feedback\n\n` +
      `From: ${name} <${email}>\n` +
      (page ? `Page/context: ${page}\n` : '') +
      `\n${message}\n`;

    const result = await sendEmailSafe({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: email,
      dedupeKey: `feedback:${email}:${page}:${message.slice(0, 120)}`,
    });

    return NextResponse.json({ ok: true, sent: result.sent }, { status: 200 });
  } catch (error) {
    console.error('feedback: failed', error);
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 });
  }
}
