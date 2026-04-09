import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

type CoverSuggestInput = {
  trailName?: string;
  location?: string;
  sportType?: string;
  mode?: 'illustration' | 'photo';
};

function toKeywordSeed(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildFallbackKeywords(input: CoverSuggestInput) {
  return [input.sportType, input.location, input.trailName, 'trail']
    .filter((item): item is string => Boolean(item && item.trim()))
    .join(' ')
    .trim();
}

function buildUnsplashSourceUrl(query: string) {
  const normalized = query.trim() || 'mountain bike trail illustration';
  return `https://source.unsplash.com/featured/1600x900/?${encodeURIComponent(normalized)}`;
}

function getSportIllustrationQuery(sportType?: string) {
  const map: Record<string, string> = {
    mtb: 'mountain bike trail illustration',
    downhill_mtb: 'downhill mountain bike illustration',
    enduro_mtb: 'enduro mountain bike illustration',
    devotion_trail_rides: 'cycling temple ride illustration',
    hiking: 'mountain hiking trail illustration',
    trail_running: 'trail running mountain illustration',
    training: 'cycling training illustration',
    local_tour: 'cycling local tour illustration',
    road_cycling: 'road cycling illustration',
    xc_trails: 'cross country mountain biking illustration',
    gravel_rides: 'gravel cycling illustration',
  };
  return map[sportType || ''] || 'mountain bike trail illustration';
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await rateLimit(request, 'ai-trail-cover-suggest', 8, 60);
    if (limited) return limited;

    const body = (await request.json()) as CoverSuggestInput;
    const fallbackKeywords = buildFallbackKeywords(body);
    const apiKey = process.env.GEMINI_API_KEY;

    const shouldIllustrate = body.mode !== 'photo';

    if (!apiKey) {
      if (shouldIllustrate) {
        const query = getSportIllustrationQuery(body.sportType);
        const seed = toKeywordSeed(`${query}-${Date.now()}`);
        const sourceUrl = buildUnsplashSourceUrl(`${query} digital art`);
        return NextResponse.json(
          {
            imageUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`,
            fallbackImageUrl: sourceUrl,
            keywords: query,
          },
          { status: 200 }
        );
      }
      const seed = toKeywordSeed(`${fallbackKeywords || 'mountain-bike-trail'}-${Date.now()}`);
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`;
      return NextResponse.json(
        { imageUrl: fallbackUrl, keywords: fallbackKeywords || 'mountain bike trail' },
        { status: 200 }
      );
    }

    const prompt = [
      'You generate one short photo-search phrase for an outdoor trail illustration cover image.',
      'Return plain text only (no markdown, no quotes).',
      'Keep it under 7 words.',
      'Avoid brand names and unsafe terms.',
      '',
      `Trail name: ${body.trailName || 'N/A'}`,
      `Location: ${body.location || 'N/A'}`,
      `Sport: ${body.sportType || 'N/A'}`,
    ].join('\n');

    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 32,
      },
    });
    const aiText = (result.text ?? '').trim();
    const keywords = aiText || fallbackKeywords || 'mountain bike trail illustration';
    const cleanedKeywords = keywords.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();

    if (shouldIllustrate) {
      const query = getSportIllustrationQuery(body.sportType);
      const seed = toKeywordSeed(`${query}-${Date.now()}`);
      const sourceUrl = buildUnsplashSourceUrl(`${query} digital art`);
      return NextResponse.json(
        {
          imageUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`,
          fallbackImageUrl: sourceUrl,
          keywords: query,
        },
        { status: 200 }
      );
    }

    const seed = toKeywordSeed(`${cleanedKeywords}-${Date.now()}`);
    const seededUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`;
    const sourceUrl = buildUnsplashSourceUrl(cleanedKeywords);

    return NextResponse.json(
      {
        imageUrl: seededUrl,
        fallbackImageUrl: sourceUrl,
        keywords: cleanedKeywords,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to suggest cover image.';
    const status = message.includes('429') ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
