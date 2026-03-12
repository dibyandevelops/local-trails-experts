import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { sendPushToUserIds } from '@/lib/push';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title =
      String(body?.title || '').trim() || 'Local Trails & Experts Notification';
    const message =
      String(body?.message || '').trim() ||
      'Push notifications are now enabled on this device.';

    const result = await sendPushToUserIds([auth.sub], {
      title,
      body: message,
      url: '/events',
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}

