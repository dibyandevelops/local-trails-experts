import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, message } = body as {
      applicationId?: string;
      message?: string;
    };

    if (!applicationId || !message?.trim()) {
      return NextResponse.json(
        { error: 'applicationId and message are required' },
        { status: 400 }
      );
    }

    const appResult = await pool.query(
      'SELECT id, name, email, status FROM expert_applications WHERE id = $1 LIMIT 1',
      [applicationId]
    );

    const application = appResult.rows[0];
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const verificationEmail = buildBrandedEmail({
      subject: 'Additional verification requested',
      appUrl: getAppUrl(),
      headline: 'Verification needed',
      subhead: 'Expert application follow-up',
      greetingName: application.name,
      bodyHtml: `Our admin team needs additional verification details for your expert application:<br/><br/>${message
        .trim()
        .replace(/\n/g, '<br/>')}<br/><br/>Please reply with the requested information.`,
      bodyText: `Our admin team needs additional verification details for your expert application:\n\n${message.trim()}\n\nPlease reply with the requested information.`,
    });
    await sendEmailSafe({
      to: application.email,
      ...verificationEmail,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error sending verification request email:', error);
    return NextResponse.json(
      { error: 'Failed to send verification request email' },
      { status: 500 }
    );
  }
}
