import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceId = (id || '').trim();
    if (!serviceId) {
      return NextResponse.json({ error: 'Trail service id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `
      DELETE FROM trail_services
      WHERE id = $1
      RETURNING id
      `,
      [serviceId]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Trail service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trail service:', error);
    return NextResponse.json({ error: 'Failed to delete trail service' }, { status: 500 });
  }
}

