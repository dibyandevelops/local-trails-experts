import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Trail } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await pool.query('SELECT * FROM trails WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Trail not found' },
        { status: 404 }
      );
    }

    const trailRow = result.rows[0];

    // Parse route_data if it exists
    if (trailRow.route_data && typeof trailRow.route_data === 'string') {
      try {
        trailRow.route_data = JSON.parse(trailRow.route_data);
      } catch (e) {
        // If parsing fails, keep as is
      }
    }

    const trail: Trail = trailRow;

    return NextResponse.json({ trail }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trail' },
      { status: 500 }
    );
  }
}

