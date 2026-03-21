import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 20% 30%, rgba(16,185,129,0.35), transparent 45%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.35), transparent 45%), linear-gradient(135deg, #020617, #0b1220)',
          color: 'white',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <div
          style={{
            width: 980,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            padding: '54px 60px',
            borderRadius: 28,
            border: '1px solid rgba(255,255,255,0.12)',
            background:
              'linear-gradient(135deg, rgba(15,118,110,0.16), rgba(22,163,74,0.10))',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #16a34a, #0f766e)',
              }}
            />
            <div style={{ fontSize: 26, letterSpacing: 0.5, opacity: 0.95 }}>
              {SITE_NAME}
            </div>
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05 }}>
            Trails. Experts. Events.
          </div>
          <div style={{ fontSize: 22, opacity: 0.85, lineHeight: 1.35 }}>
            Discover routes, connect with local guides, and organize outdoor
            adventures with confidence.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Browse trails
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Join events
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Host experiences
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

