import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { createTempPassword, setAuthCookie, signAuthToken } from '@/lib/auth';

const STATE_COOKIE = 'mtb_google_oauth_state';
const NEXT_COOKIE = 'mtb_google_oauth_next';

type GoogleUserInfo = {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login is not configured', baseUrl)
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const next = request.cookies.get(NEXT_COOKIE)?.value || '/trails';

  if (!code || !state || !expectedState || state !== expectedState) {
    const res = NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  // Exchange code for tokens.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const res = NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    const res = NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  // Fetch user profile.
  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    const res = NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const profile = (await userRes.json()) as GoogleUserInfo;
  const email = (profile.email || '').trim().toLowerCase();
  const name = (profile.name || '').trim();

  if (!email) {
    const res = NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login failed. Missing email.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  // Ensure the account is a participant (create it if missing).
  const existing = await pool.query(
    'SELECT id, role, email FROM users WHERE email = $1 LIMIT 1',
    [email]
  );

  if (existing.rows[0] && existing.rows[0].role !== 'participant') {
    const res = NextResponse.redirect(
      new URL(
        `/?login=1&message=${encodeURIComponent(
          `This email is already registered as a ${existing.rows[0].role} account.`
        )}`,
        baseUrl
      )
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  let userId = existing.rows[0]?.id as string | undefined;
  if (!userId) {
    const tempPassword = createTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const inserted = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role, bio, city, sports, is_verified_expert, created_at, updated_at)
        VALUES ($1, $2, $3, 'participant', NULL, NULL, NULL, FALSE, NOW(), NOW())
        RETURNING id
      `,
      [name || null, email, passwordHash]
    );
    userId = inserted.rows[0]?.id as string | undefined;
  }

  if (!userId) {
    const res = NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const token = signAuthToken({ sub: userId, role: 'participant', email });
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);

  const res = NextResponse.redirect(new URL(next, baseUrl));
  setAuthCookie(res, token);
  res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
