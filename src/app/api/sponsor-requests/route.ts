import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company_name: z.string().trim().min(2),
  tier: z.enum(['bronze', 'silver', 'gold', 'custom']),
  company_logo_url: z.string().trim().optional().nullable(),
  agenda: z.string().trim().min(10).max(3000),
  note: z.string().trim().max(3000).optional().nullable(),
});

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

    const payload = parsed.data;
    const result = await pool.query(
      `
      INSERT INTO sponsor_requests (
        name, email, company_name, tier, company_logo_url, agenda, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        payload.name,
        payload.email,
        payload.company_name,
        payload.tier,
        payload.company_logo_url || null,
        payload.agenda,
        payload.note || null,
      ]
    );

    return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    console.error('Error creating sponsor request:', error);
    return NextResponse.json({ error: 'Failed to create sponsor request' }, { status: 500 });
  }
}

