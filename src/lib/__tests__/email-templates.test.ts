import { describe, expect, it } from 'vitest';
import { buildWelcomeEmail } from '@/lib/email-templates';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

describe('buildWelcomeEmail', () => {
  it('creates themed welcome copy with key CTAs', () => {
    const { subject, text, html } = buildWelcomeEmail({
      name: 'sonam',
      appUrl,
    });

    expect(subject).toBe('Welcome to LocoXperts');
    expect(text).toContain(`Join events: ${appUrl}/events`);
    expect(text).toContain(`Search trails: ${appUrl}/trails`);
    expect(text).toContain(`Manage your profile: ${appUrl}/participants/me`);
    expect(html).toContain(`Join events`);
    expect(html).toContain(`Search trails`);
    expect(html).toContain(`${appUrl}/events`);
    expect(html).toContain(`${appUrl}/trails`);
  });
});
