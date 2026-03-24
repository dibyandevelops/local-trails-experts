import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmailSafe } from '@/lib/email';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().default(''),
  groupSize: z.coerce.number().int().min(1).max(500).optional(),
  preferredDate: z.string().trim().optional().default(''),
  trailId: z.string().trim().optional().default(''),
  trailName: z.string().trim().optional().default(''),
  trailLocation: z.string().trim().optional().default(''),
  message: z.string().trim().min(10).max(5000),
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
    const raw = await request.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminEmail = getAdminEmail();
    const {
      name,
      email,
      phone,
      groupSize,
      preferredDate,
      trailId,
      trailName,
      trailLocation,
      message,
    } = parsed.data;

    const trailLine = trailName
      ? `${trailName}${trailLocation ? ` — ${trailLocation}` : ''}`
      : '';

    const subject = `Large group request${trailName ? `: ${trailName}` : ''}`;

    const html = `
      <div style="background:#f3f4f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#16a34a);color:#ffffff;">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">LocoXperts</div>
              <div style="font-size:22px;font-weight:700;margin-top:6px;">Large group request</div>
              <div style="font-size:14px;opacity:0.9;margin-top:6px;">${escapeHtml(trailLine || 'Trail to be confirmed')}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <div style="font-size:14px;line-height:1.7;color:#374151;">
                <p style="margin:0 0 12px 0;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
                ${phone ? `<p style="margin:0 0 12px 0;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
                ${typeof groupSize === 'number' ? `<p style="margin:0 0 12px 0;"><strong>Group size:</strong> ${groupSize}</p>` : ''}
                ${preferredDate ? `<p style="margin:0 0 12px 0;"><strong>Preferred date:</strong> ${escapeHtml(preferredDate)}</p>` : ''}
                ${trailId ? `<p style="margin:0 0 12px 0;"><strong>Trail ID:</strong> ${escapeHtml(trailId)}</p>` : ''}
                <p style="margin:0 0 8px 0;"><strong>Request details:</strong></p>
                <pre style="white-space:pre-wrap;margin:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;font-size:13px;line-height:1.6;color:#111827;">${escapeHtml(message)}</pre>
              </div>
              <div style="margin-top:18px;">
                <a href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      'Re: ' + subject
    )}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:10px 16px;border-radius:999px;">Reply via email</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">
              Received via the LocoXperts large group request form.
            </td>
          </tr>
        </table>
      </div>
    `;

    const text =
      `Large group request\n\n` +
      `From: ${name} <${email}>\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (typeof groupSize === 'number' ? `Group size: ${groupSize}\n` : '') +
      (preferredDate ? `Preferred date: ${preferredDate}\n` : '') +
      (trailName ? `Trail: ${trailName}\n` : '') +
      (trailLocation ? `Location: ${trailLocation}\n` : '') +
      (trailId ? `Trail ID: ${trailId}\n` : '') +
      `\n${message}\n`;

    await sendEmailSafe({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: email,
      dedupeKey: `group:${email}:${trailId || trailName}:${preferredDate}:${message.slice(0, 120)}`,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('group-request: failed', error);
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}

