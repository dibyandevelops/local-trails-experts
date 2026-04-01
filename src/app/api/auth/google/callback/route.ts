import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest, setAuthCookie, signAuthToken } from '@/lib/auth';
import type { UserRole } from '@/types';
import bcrypt from 'bcryptjs';

const STATE_COOKIE = 'mtb_google_oauth_state';
const NEXT_COOKIE = 'mtb_google_oauth_next';
const MODE_COOKIE = 'mtb_google_oauth_mode';
const ROLE_COOKIE = 'mtb_google_oauth_role';

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

function withOnboardingParam(nextPath: string) {
  const url = new URL(nextPath, 'http://localhost');
  url.searchParams.set('onboarding', '1');
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?login=1&message=Google login is not configured', baseUrl)
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const next = request.cookies.get(NEXT_COOKIE)?.value || '/trails';
  const modeCookie = request.cookies.get(MODE_COOKIE)?.value;
  const mode =
    modeCookie === 'connect' || modeCookie === 'register' ? modeCookie : 'login';
  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
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
      new URL('/?login=1&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  // Fetch user profile.
  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Google login failed. Please try again.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const profile = (await userRes.json()) as GoogleUserInfo;
  const email = (profile.email || '').trim().toLowerCase();
  const name = (profile.name || '').trim();
  const sub = (profile.sub || '').trim();

  if (!email || !sub) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Google login failed. Missing email.', baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  if (mode === 'connect') {
    const auth = getAuthFromRequest(request);
    const resolvedRole = auth?.role;
    if (!auth || !resolvedRole) {
      const res = NextResponse.redirect(
        new URL(
          '/?login=1&message=Please sign in to connect Google.',
          baseUrl
        )
      );
      res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
      return res;
    }

    const me = await pool.query(
      'SELECT id, email, role, google_sub FROM users WHERE id = $1 LIMIT 1',
      [auth.sub]
    );
    const meRow = me.rows[0];
    if (!meRow || meRow.role !== resolvedRole) {
      const res = NextResponse.redirect(
        new URL(
          '/?login=1&message=Please sign in to connect Google.',
          baseUrl
        )
      );
      res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
      return res;
    }

    if (String(meRow.email || '').toLowerCase() !== email) {
      const res = NextResponse.redirect(
        new URL(
          `/?login=1&message=${encodeURIComponent(
            `Google email must match your ${resolvedRole} account email to connect.`
          )}`,
          baseUrl
        )
      );
      res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
      return res;
    }

    const existingSub = await pool.query(
      'SELECT id FROM users WHERE google_sub = $1 AND id <> $2 LIMIT 1',
      [sub, auth.sub]
    );
    if (existingSub.rows.length > 0) {
      const res = NextResponse.redirect(
        new URL(
          `/?login=1&message=${encodeURIComponent(
            'That Google account is already connected to another user.'
          )}`,
          baseUrl
        )
      );
      res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
      return res;
    }

    await pool.query(
      'UPDATE users SET google_sub = $1, updated_at = NOW() WHERE id = $2',
      [sub, auth.sub]
    );

    const successPath =
      resolvedRole === 'expert'
        ? '/experts/me'
        : resolvedRole === 'admin'
          ? '/admin'
          : '/participants/me';
    const res = NextResponse.redirect(
      new URL(`${successPath}?message=google_connected`, baseUrl)
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  if (mode === 'register') {
    const existingByEmail = await pool.query(
      'SELECT id, role, google_sub FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (existingByEmail.rows[0]) {
      const existingRole = existingByEmail.rows[0].role as UserRole;
      const existingSub = existingByEmail.rows[0].google_sub as string | null;
      if (existingRole !== 'participant') {
        const res = NextResponse.redirect(
          new URL(
            `/?login=1&message=${encodeURIComponent(
              'This email is already used by a non-participant account.'
            )}`,
            baseUrl
          )
        );
        res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
        res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
        res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
        res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
        return res;
      }

      const userId = existingByEmail.rows[0].id as string;
      if (!existingSub) {
        await pool.query('UPDATE users SET google_sub = $1 WHERE id = $2', [sub, userId]);
      } else if (existingSub !== sub) {
        const res = NextResponse.redirect(
          new URL(
            `/?login=1&message=${encodeURIComponent(
              'This Google account does not match your existing participant profile.'
            )}`,
            baseUrl
          )
        );
        res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
        res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
        res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
        res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
        return res;
      }

      const token = signAuthToken({ sub: userId, role: 'participant', email });
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
      const res = NextResponse.redirect(new URL(withOnboardingParam(next), baseUrl));
      setAuthCookie(res, token);
      res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
      res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
      return res;
    }

    const oauthPasswordHash = await bcrypt.hash(`oauth-google-${sub}`, 10);
    const createResult = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, google_sub)
      VALUES ($1, $2, $3, 'participant', $4)
      RETURNING id
      `,
      [name || email.split('@')[0] || 'Participant', email, oauthPasswordHash, sub]
    );

    const newUserId = createResult.rows[0].id as string;
    const token = signAuthToken({ sub: newUserId, role: 'participant', email });
    const res = NextResponse.redirect(new URL(withOnboardingParam(next), baseUrl));
    setAuthCookie(res, token);
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  // LOGIN mode: only allow if the account exists for the role and it's connected to Google.
  const existing = await pool.query(
    `SELECT id, role, email, google_sub
     FROM users
     WHERE email = $1
     ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'expert' THEN 2 ELSE 3 END
     LIMIT 1`,
    [email]
  );

  if (!existing.rows[0]) {
    const res = NextResponse.redirect(
      new URL(
        `/register?message=${encodeURIComponent(
          'No account found for this Google email. Please register first.'
        )}`,
        baseUrl
      )
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  if (!existing.rows[0].google_sub) {
    const res = NextResponse.redirect(
      new URL(
        `/?login=1&message=${encodeURIComponent(
          'Google login is not enabled for this account yet. Sign in with password and connect Google in your profile.'
        )}`,
        baseUrl
      )
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  if (existing.rows[0].google_sub !== sub) {
    const res = NextResponse.redirect(
      new URL(
        `/?login=1&message=${encodeURIComponent(
          'This Google account does not match the one connected to your profile.'
        )}`,
        baseUrl
      )
    );
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const userId = existing.rows[0].id as string;
  const roleValue = existing.rows[0].role as string;
  const resolvedRole: UserRole =
    roleValue === 'admin' || roleValue === 'expert' || roleValue === 'participant'
      ? roleValue
      : 'participant';

  const token = signAuthToken({ sub: userId, role: resolvedRole, email });
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);

  const res = NextResponse.redirect(new URL(next, baseUrl));
  setAuthCookie(res, token);
  res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
