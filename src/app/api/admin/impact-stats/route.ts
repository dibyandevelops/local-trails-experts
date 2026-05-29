import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getImpactStats } from '@/lib/impact-stats';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getImpactStats();
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin impact stats:', error);
    return NextResponse.json({ error: 'Failed to fetch impact stats' }, { status: 500 });
  }
}

