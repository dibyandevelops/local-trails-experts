import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(body, 'body')
    const { name, email, city, sports, credentials } = body;

    if (!name || !email || !credentials) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, credentials' },
        { status: 400 }
      );
    }

    // Fix: Ensure sports is passed as a proper JSON string for the JSON column in Postgres
    let sportsJson: string | null = null;
    if (Array.isArray(sports) && sports.length > 0) {
      sportsJson = JSON.stringify(sports);
    }

    const query = `
      INSERT INTO expert_applications (name, email, city, sports, credentials)
      VALUES ($1, $2, $3, $4::json, $5)
      RETURNING id, status, created_at
    `;

    const result = await pool.query(query, [
      name,
      email,
      city || null,
      sportsJson,
      credentials,
    ]);

    const application = result.rows[0];

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
