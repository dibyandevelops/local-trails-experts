import { describe, expect, it } from 'vitest';
import { buildWelcomeEmail } from '@/lib/email-templates';

describe('buildWelcomeEmail', () => {
  it('creates themed welcome copy with key CTAs', () => {
    const { subject, text, html } = buildWelcomeEmail({
      name: 'Dibyan',
      appUrl: 'https://localguides.app',
    });

    expect(subject).toBe('Welcome to Local Trails & Experts');
    expect(text).toContain('Join events: https://localguides.app/events');
    expect(text).toContain('Search trails: https://localguides.app/trails');
    expect(text).toContain('Manage your profile: https://localguides.app/participants/me');
    expect(html).toContain('Join events');
    expect(html).toContain('Search trails');
    expect(html).toContain('https://localguides.app/events');
    expect(html).toContain('https://localguides.app/trails');
  });
});
