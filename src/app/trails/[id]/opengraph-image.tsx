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

function getCoordinateLabel(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return 'Nepal trail map preview';
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Nepal trail map preview';
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
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
  const coordinateLabel = getCoordinateLabel(trail?.latitude, trail?.longitude);

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
                background:
                  'linear-gradient(135deg, rgba(187,247,208,1), rgba(134,239,172,0.85) 40%, rgba(191,219,254,0.8))',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(rgba(6,78,59,0.14) 2px, transparent 2px), linear-gradient(90deg, rgba(6,78,59,0.12) 2px, transparent 2px)',
                  backgroundSize: '58px 58px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 60,
                  top: 58,
                  width: 250,
                  height: 288,
                  border: '12px solid rgba(4,120,87,0.88)',
                  borderLeftColor: 'transparent',
                  borderBottomColor: '#10b981',
                  borderRadius: '48% 42% 52% 44%',
                  transform: 'rotate(-18deg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 173,
                  top: 178,
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  background: '#0ea5e9',
                  border: '8px solid #ecfeff',
                  boxShadow: '0 0 0 10px rgba(14,165,233,0.24)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 34,
                  top: 32,
                  display: 'flex',
                  background: 'rgba(6,47,36,0.9)',
                  color: '#ecfdf5',
                  borderRadius: 16,
                  padding: '10px 14px',
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Map preview
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: 28,
                  bottom: 28,
                  display: 'flex',
                  background: 'rgba(255,255,255,0.92)',
                  color: '#064e3b',
                  borderRadius: 16,
                  padding: '10px 14px',
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {coordinateLabel}
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
