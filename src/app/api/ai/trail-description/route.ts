import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from '@/lib/rate-limit';

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

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'ai-trail-description', 5, 60);
    if (limited) return limited;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as TrailDescriptionInput;
    const prompt = buildPrompt(body);
    console.log(prompt, 'prompt')
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
      config: {
        temperature: 0.6,
        maxOutputTokens: 180,
      },
    });

    const outputText = (result.text ?? '').toString();

    return NextResponse.json(
      { description: String(outputText).trim() },
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
      res.headers.set('x-rate-limit-source', 'gemini');
    }
    return res;
  }
}
