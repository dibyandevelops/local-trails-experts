import { NextResponse } from 'next/server';
import { getImpactStats } from '@/lib/impact-stats';

export async function GET() {
  try {
    const stats = await getImpactStats();
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching impact stats:', error);
    return NextResponse.json({ error: 'Failed to fetch impact stats' }, { status: 500 });
  }
}

