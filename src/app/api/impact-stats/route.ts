import { NextRequest, NextResponse } from 'next/server';
import { getImpactStats } from '@/lib/impact-stats';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'impact-stats', 60, 60);
  if (limited) return limited;

  try {
    const stats = await getImpactStats();
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching impact stats:', error);
    return NextResponse.json({ error: 'Failed to fetch impact stats' }, { status: 500 });
  }
}
