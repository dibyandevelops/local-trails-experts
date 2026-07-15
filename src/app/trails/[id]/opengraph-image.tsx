import { ImageResponse } from 'next/og';
import { getTrailSeo } from '@/lib/data/public-trails';
import { SITE_NAME } from '@/lib/seo';
import {
  getTrailShareDescription,
  getTrailShareStats,
  getTrailShareTitle,
  getTrailSportLabel,
} from '@/lib/trail-share';

export const runtime = 'nodejs';
export const alt = 'Trail preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

type Params = {
  id: string;
};

function compactLocation(location?: string | null) {
  return String(location || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
}

export default async function TrailOpenGraphImage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const trail = await getTrailSeo(id);

  const title = trail ? getTrailShareTitle(trail) : 'Nepal Trail Guide';
  const description = trail
    ? getTrailShareDescription(trail)
    : 'Discover mapped trails, local route context, and ride support on LocoXperts.';
  const stats = trail ? getTrailShareStats(trail).slice(0, 3) : [];
  const location = compactLocation(trail?.location) || 'Nepal';
  const sport = getTrailSportLabel(trail?.sport_type);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#062f24',
          color: '#ecfdf5',
          fontFamily: 'Arial, Helvetica, sans-serif',
          padding: 48,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(16,185,129,0.24), rgba(6,47,36,0.92) 38%, rgba(2,6,23,0.98))',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: '100%',
            height: '100%',
            gap: 36,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1.05, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid rgba(167,243,208,0.55)',
                    borderRadius: 999,
                    padding: '10px 16px',
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: '#a7f3d0',
                  }}
                >
                  {SITE_NAME}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    background: '#d9f99d',
                    color: '#064e3b',
                    padding: '10px 16px',
                    fontSize: 18,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  {sport}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    fontSize: title.length > 42 ? 54 : 66,
                    lineHeight: 1.02,
                    fontWeight: 900,
                    letterSpacing: -1,
                    maxWidth: 690,
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 28, lineHeight: 1.35, color: '#cbd5e1', maxWidth: 680 }}>
                  {description}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 150,
                    border: '1px solid rgba(148,163,184,0.28)',
                    borderRadius: 18,
                    background: 'rgba(15,23,42,0.56)',
                    padding: '16px 18px',
                  }}
                >
                  <div style={{ fontSize: 18, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                    {stat.label}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 30, color: '#ffffff', fontWeight: 900 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              width: 395,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 30,
              border: '1px solid rgba(167,243,208,0.45)',
              background: '#d9f99d',
              boxShadow: '0 24px 80px rgba(2,6,23,0.45)',
            }}
          >
            <div
              style={{
                height: 412,
                display: 'flex',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #bae6fd 0%, #d9f99d 46%, #064e3b 100%)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(circle at 75% 18%, rgba(254,249,195,0.95) 0 34px, rgba(254,249,195,0) 35px), linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0) 38%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: -80,
                  bottom: 145,
                  width: 290,
                  height: 170,
                  borderRadius: '58% 42% 0 0',
                  background: '#0f766e',
                  transform: 'rotate(7deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: -42,
                  bottom: 136,
                  width: 320,
                  height: 205,
                  borderRadius: '54% 46% 0 0',
                  background: '#047857',
                  transform: 'rotate(-8deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 42,
                  bottom: 112,
                  width: 330,
                  height: 175,
                  borderRadius: '50% 50% 0 0',
                  background: '#166534',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 162,
                  background: 'linear-gradient(180deg, #16a34a, #052e16)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 42,
                  bottom: 44,
                  width: 310,
                  height: 138,
                  border: '12px solid rgba(236,253,245,0.96)',
                  borderTopColor: 'transparent',
                  borderRightColor: '#bbf7d0',
                  borderRadius: '55% 45% 50% 50%',
                  transform: 'rotate(-9deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 53,
                  bottom: 55,
                  width: 288,
                  height: 114,
                  border: '6px solid #10b981',
                  borderTopColor: 'transparent',
                  borderRightColor: '#34d399',
                  borderRadius: '55% 45% 50% 50%',
                  transform: 'rotate(-9deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 153,
                  bottom: 119,
                  width: 66,
                  height: 66,
                  borderRadius: 999,
                  background: '#f97316',
                  border: '7px solid #fff7ed',
                  boxShadow: '0 16px 35px rgba(2,6,23,0.24)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 171,
                  bottom: 139,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: '5px solid #022c22',
                  background: 'transparent',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 195,
                  bottom: 139,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: '5px solid #022c22',
                  background: 'transparent',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 195,
                  bottom: 174,
                  width: 38,
                  height: 5,
                  borderRadius: 999,
                  background: '#022c22',
                  transform: 'rotate(26deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 177,
                  bottom: 170,
                  width: 34,
                  height: 5,
                  borderRadius: 999,
                  background: '#022c22',
                  transform: 'rotate(-35deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 148,
                  top: 28,
                  display: 'flex',
                  background: 'rgba(6,47,36,0.9)',
                  color: '#ecfdf5',
                  borderRadius: 16,
                  padding: '10px 14px',
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Trail preview
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 26,
                  bottom: 26,
                  display: 'flex',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#064e3b',
                  borderRadius: 16,
                  padding: '10px 14px',
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Nepal ride route
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: '#022c22',
                padding: 24,
              }}
            >
              <div style={{ fontSize: 20, color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>
                Trail location
              </div>
              <div style={{ fontSize: 32, color: '#ffffff', fontWeight: 900, lineHeight: 1.1 }}>{location}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
