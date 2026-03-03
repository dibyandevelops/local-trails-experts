import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        tir.id,
        tir.trail_id,
        t.name AS trail_name,
        t.location AS trail_location,
        t.sport_type AS trail_sport_type,
        tir.requester_user_id,
        tir.requester_name,
        tir.requester_email,
        tir.preferred_date,
        tir.assigned_expert_user_id,
        ex.name AS assigned_expert_name,
        ex.email AS assigned_expert_email,
        tir.description,
        tir.created_at
      FROM trail_interest_requests tir
      JOIN trails t ON t.id = tir.trail_id
      LEFT JOIN users ex ON ex.id = tir.assigned_expert_user_id
      ORDER BY tir.created_at DESC
      `
    );

    return NextResponse.json({ requests: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trail requests' },
      { status: 500 }
    );
  }
}
