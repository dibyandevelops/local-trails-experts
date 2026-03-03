import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'expert-apply', 5, 60);
    if (limited) return limited;

    const body = await request.json();
    const { name, email, city, sports, credentials, phone } = body;
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!name || !email || !credentials || !normalizedPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, credentials, phone' },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email is already registered. Please log in instead.' },
        { status: 409 }
      );
    }

    const existingPhoneUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1 LIMIT 1',
      [normalizedPhone]
    );
    if (existingPhoneUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Phone number is already registered. Please use another number.' },
        { status: 409 }
      );
    }

    const existingApplication = await pool.query(
      'SELECT id, status FROM expert_applications WHERE email = $1 LIMIT 1',
      [email]
    );
    if (existingApplication.rows.length > 0) {
      return NextResponse.json(
        { error: 'An application already exists for this email.' },
        { status: 409 }
      );
    }

    // Fix: Ensure sports is passed as a proper JSON string for the JSON column in Postgres
    let sportsJson: string | null = null;
    if (Array.isArray(sports) && sports.length > 0) {
      sportsJson = JSON.stringify(sports);
    }

    const query = `
      INSERT INTO expert_applications (name, email, city, sports, credentials, phone)
      VALUES ($1, $2, $3, $4::json, $5, $6)
      RETURNING id, status, created_at
    `;

    const result = await pool.query(query, [
      name,
      email,
      city || null,
      sportsJson,
      credentials,
      normalizedPhone,
    ]);

    const application = result.rows[0];

    await sendEmailSafe({
      to: email,
      subject: 'Expert Application Received',
      text: `Hi ${name}, we received your expert application and will review it shortly.`,
      html: `<p>Hi ${name},</p><p>We received your expert application and will review it shortly.</p>`,
    });

    return NextResponse.json(
      {
        application,
        message:
          'Application submitted. We will review your credentials and mark you as verified.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting expert application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
