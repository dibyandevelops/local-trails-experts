import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getAuthFromRequest } from '@/lib/auth';

type TrailDescriptionInput = {
  name?: string;
  location?: string;
  sport_type?: string;
  difficulty?: string;
  distance_km?: string | number;
  elevation_gain_m?: string | number;
  estimated_time_hours?: string | number;
};

function buildPrompt(data: TrailDescriptionInput) {
  const parts = [
    data.name ? `Trail name: ${data.name}` : null,
    data.location ? `Location: ${data.location}` : null,
    data.sport_type ? `Sport: ${data.sport_type}` : null,
    data.difficulty ? `Difficulty: ${data.difficulty}` : null,
    data.distance_km ? `Distance: ${data.distance_km} km` : null,
    data.elevation_gain_m ? `Elevation gain: ${data.elevation_gain_m} m` : null,
    data.estimated_time_hours
      ? `Estimated time: ${data.estimated_time_hours} hours`
      : null,
  ].filter(Boolean);

  return [
    'Write a short, inviting trail description for an outdoor activity listing.',
    'Keep it 2-3 sentences, avoid marketing fluff, and be specific where possible.',
    'Do not invent details that are not provided.',
    '',
    parts.join('\n'),
  ].join('\n');
}

function formatDistance(distance?: string | number) {
  if (distance == null || distance === '') return null;
  const numeric = Number(distance);
  if (Number.isFinite(numeric)) return `${numeric.toFixed(numeric >= 10 ? 0 : 1)} km`;
  return `${distance} km`;
}

function buildLocalTrailDescription(data: TrailDescriptionInput) {
  const name = String(data.name || '').trim() || 'This trail';
  const location = String(data.location || '').trim();
  const sport = String(data.sport_type || '').trim().replace(/_/g, ' ');
  const difficulty = String(data.difficulty || '').trim().replace(/_/g, ' ');
  const distance = formatDistance(data.distance_km);
  const elevationValue = Number(data.elevation_gain_m);
  const elevation = data.elevation_gain_m && Number.isFinite(elevationValue)
    ? `${Math.round(elevationValue)} m of climbing`
    : null;
  const time = data.estimated_time_hours ? `about ${data.estimated_time_hours} hours` : null;
  const details = [difficulty, distance, elevation, time].filter(Boolean);

  const firstSentence = location
    ? `${name} is a ${sport || 'trail'} route around ${location}.`
    : `${name} is a ${sport || 'trail'} route worth reviewing before you ride.`;
  const secondSentence = details.length
    ? `Expect ${details.join(', ')}, and check local trail conditions before heading out.`
    : 'Check the route, local conditions, and your ride plan before heading out.';

  return `${firstSentence} ${secondSentence}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await rateLimit(request, 'ai-trail-description', 5, 60);
    if (limited) return limited;

    const body = (await request.json()) as TrailDescriptionInput;
    if (
      String(body.name || '').length > 160 ||
      String(body.location || '').length > 240 ||
      String(body.sport_type || '').length > 80 ||
      String(body.difficulty || '').length > 80
    ) {
      return NextResponse.json({ error: 'Prompt fields are too long.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { description: buildLocalTrailDescription(body), source: 'local-fallback' },
        { status: 200 }
      );
    }

    const prompt = buildPrompt(body);
    const result = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.85,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You write vivid but trustworthy trail copy for LocoXperts, a Nepal-focused cycling platform. Be creative with phrasing, but never invent terrain, views, facilities, hazards, or landmarks that were not provided. Keep safety claims cautious.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const resultBody = (await result.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };
    if (!result.ok) {
      const errorMessage = resultBody.error?.message || `OpenAI request failed (${result.status})`;
      if (result.status === 429 || /quota|billing/i.test(errorMessage)) {
        return NextResponse.json(
          { description: buildLocalTrailDescription(body), source: 'local-fallback', warning: errorMessage },
          { status: 200 }
        );
      }
      throw new Error(errorMessage);
    }
    const outputText = resultBody.choices?.[0]?.message?.content || '';

    return NextResponse.json(
      { description: outputText.trim(), source: 'openai' },
      { status: 200 }
    );
  } catch (error) {
    console.error(error, `error`);

    const message = error instanceof Error ? error.message : 'Failed to generate description.';
    const res = NextResponse.json(
      { error: message },
      { status: message.includes('429') ? 429 : 500 }
    );
    if (message.includes('429')) {
      res.headers.set('x-rate-limit-source', 'openai');
    }
    return res;
  }
}
