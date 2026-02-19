import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';

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

    await sendEmailSafe({
      to: application.email,
      subject: 'Additional verification requested',
      text: `Hi ${application.name},\n\nOur admin team needs additional verification details for your expert application:\n\n${message.trim()}\n\nPlease reply with the requested information.`,
      html: `<p>Hi ${application.name},</p><p>Our admin team needs additional verification details for your expert application:</p><p>${message
        .trim()
        .replace(/\n/g, '<br/>')}</p><p>Please reply with the requested information.</p>`,
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
