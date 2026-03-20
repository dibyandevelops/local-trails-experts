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

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }
    if (userId === auth.sub) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      'SELECT id, role, email FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin users cannot be deleted.' },
        { status: 403 }
      );
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error:
          'Failed to delete user. Remove dependent records first if this user is referenced elsewhere.',
      },
      { status: 500 }
    );
  }
}
