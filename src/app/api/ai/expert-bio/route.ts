import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from '@/lib/rate-limit';
import { getAuthFromRequest } from '@/lib/auth';

type ExpertBioInput = {
  name?: string;
  city?: string;
  sports?: string[];
  language?: string;
};

function buildPrompt(data: ExpertBioInput) {
  const lines = [
    data.name ? `Name: ${data.name}` : null,
    data.city ? `City: ${data.city}` : null,
    Array.isArray(data.sports) && data.sports.length > 0
      ? `Sports: ${data.sports.join(', ')}`
      : null,
    data.language ? `Preferred language: ${data.language}` : null,
  ].filter(Boolean);

  return [
    'Write a short expert profile bio for a local outdoor guide.',
    'Keep it to exactly 3 sentences.',
    'Tone: friendly, trustworthy, local, safety-aware, and welcoming.',
    'Do not invent certifications, achievements, or years of experience.',
    'Write in the user preferred language when provided.',
    'If language is not provided, infer from user inputs; default to English.',
    'Output style should follow this structure:',
    '"I am [Name], your friendly local guide for exploring trails around [City/Region]."',
    '"I am passionate about sharing the beauty of the area through safe and enjoyable [Sports] adventures."',
    '"Let me lead you on an unforgettable journey, tailored to your experience and comfort."',
    'Use first-person voice and keep words simple.',
    '',
    lines.join('\n'),
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await rateLimit(request, 'ai-expert-bio', 5, 60);
    if (limited) return limited;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ExpertBioInput;
    if (
      String(body.name || '').length > 160 ||
      String(body.city || '').length > 160 ||
      String(body.language || '').length > 80 ||
      (Array.isArray(body.sports) && body.sports.join(',').length > 500)
    ) {
      return NextResponse.json({ error: 'Prompt fields are too long.' }, { status: 400 });
    }
    const prompt = buildPrompt(body);

    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.6,
        maxOutputTokens: 180,
      },
    });

    const outputText = (result.text ?? '').toString().trim();
    return NextResponse.json({ bio: outputText }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate expert bio.';
    const response = NextResponse.json(
      { error: message },
      { status: message.includes('429') ? 429 : 500 }
    );
    if (message.includes('429')) {
      response.headers.set('x-rate-limit-source', 'gemini');
    }
    return response;
  }
}
