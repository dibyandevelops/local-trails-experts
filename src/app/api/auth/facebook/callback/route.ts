import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest, setAuthCookie, signAuthToken } from '@/lib/auth';
import type { UserRole } from '@/types';
import bcrypt from 'bcryptjs';

const STATE_COOKIE = 'mtb_facebook_oauth_state';
const NEXT_COOKIE = 'mtb_facebook_oauth_next';
const MODE_COOKIE = 'mtb_facebook_oauth_mode';

type FacebookUserInfo = {
  id?: string;
  email?: string;
  name?: string;
};

function withOnboardingParam(nextPath: string) {
  const url = new URL(nextPath, 'http://localhost');
  url.searchParams.set('onboarding', '1');
  return `${url.pathname}${url.search}${url.hash}`;
}

function clearCookies(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(MODE_COOKIE, '', { maxAge: 0, path: '/' });
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?login=1&message=Facebook login is not configured', baseUrl)
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

  if (!code || !state || !expectedState || state !== expectedState) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Facebook login failed. Please try again.', baseUrl)
    );
    clearCookies(res);
    return res;
  }

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Facebook login failed. Please try again.', baseUrl)
    );
    clearCookies(res);
    return res;
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Facebook login failed. Please try again.', baseUrl)
    );
    clearCookies(res);
    return res;
  }

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', accessToken);
  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Facebook login failed. Please try again.', baseUrl)
    );
    clearCookies(res);
    return res;
  }

  const profile = (await profileRes.json()) as FacebookUserInfo;
  const email = (profile.email || '').trim().toLowerCase();
  const name = (profile.name || '').trim();
  const sub = (profile.id || '').trim();

  if (!email || !sub) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=Facebook account must include email.', baseUrl)
    );
    clearCookies(res);
    return res;
  }

  if (mode === 'connect') {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      const res = NextResponse.redirect(
        new URL('/?login=1&message=Please sign in to connect Facebook.', baseUrl)
      );
      clearCookies(res);
      return res;
    }

    const me = await pool.query('SELECT id, email, facebook_sub FROM users WHERE id = $1 LIMIT 1', [
      auth.sub,
    ]);
    const meRow = me.rows[0];
    if (!meRow || String(meRow.email || '').toLowerCase() !== email) {
      const res = NextResponse.redirect(
        new URL('/?login=1&message=Facebook email must match your account email.', baseUrl)
      );
      clearCookies(res);
      return res;
    }

    const existingSub = await pool.query(
      'SELECT id FROM users WHERE facebook_sub = $1 AND id <> $2 LIMIT 1',
      [sub, auth.sub]
    );
    if (existingSub.rows.length > 0) {
      const res = NextResponse.redirect(
        new URL('/?login=1&message=Facebook account already connected elsewhere.', baseUrl)
      );
      clearCookies(res);
      return res;
    }

    await pool.query('UPDATE users SET facebook_sub = $1, updated_at = NOW() WHERE id = $2', [
      sub,
      auth.sub,
    ]);

    const successPath =
      auth.role === 'expert' ? '/experts/me' : auth.role === 'admin' ? '/admin' : '/participants/me';
    const res = NextResponse.redirect(new URL(`${successPath}?message=facebook_connected`, baseUrl));
    clearCookies(res);
    return res;
  }

  if (mode === 'register') {
    const existingByEmail = await pool.query(
      'SELECT id, role, facebook_sub FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (existingByEmail.rows[0]) {
      const existingRole = existingByEmail.rows[0].role as UserRole;
      const existingSub = existingByEmail.rows[0].facebook_sub as string | null;
      if (existingRole !== 'participant') {
        const res = NextResponse.redirect(
          new URL('/?login=1&message=This email is already used by another account type.', baseUrl)
        );
        clearCookies(res);
        return res;
      }
      const userId = existingByEmail.rows[0].id as string;
      if (!existingSub) {
        await pool.query('UPDATE users SET facebook_sub = $1 WHERE id = $2', [sub, userId]);
      } else if (existingSub !== sub) {
        const res = NextResponse.redirect(
          new URL('/?login=1&message=This Facebook account does not match your existing profile.', baseUrl)
        );
        clearCookies(res);
        return res;
      }
      const token = signAuthToken({ sub: userId, role: 'participant', email });
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
      const res = NextResponse.redirect(new URL(withOnboardingParam(next), baseUrl));
      setAuthCookie(res, token);
      clearCookies(res);
      return res;
    }

    const oauthPasswordHash = await bcrypt.hash(`oauth-facebook-${sub}`, 10);
    const createResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, facebook_sub)
       VALUES ($1, $2, $3, 'participant', $4)
       RETURNING id`,
      [name || email.split('@')[0] || 'Participant', email, oauthPasswordHash, sub]
    );
    const userId = createResult.rows[0].id as string;
    const token = signAuthToken({ sub: userId, role: 'participant', email });
    const res = NextResponse.redirect(new URL(withOnboardingParam(next), baseUrl));
    setAuthCookie(res, token);
    clearCookies(res);
    return res;
  }

  const existing = await pool.query(
    `SELECT id, role, email, facebook_sub
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
          'No account found for this Facebook email. Please register first.'
        )}`,
        baseUrl
      )
    );
    clearCookies(res);
    return res;
  }

  if (!existing.rows[0].facebook_sub) {
    const res = NextResponse.redirect(
      new URL(
        '/?login=1&message=Facebook login is not enabled for this account yet. Sign in with password first.',
        baseUrl
      )
    );
    clearCookies(res);
    return res;
  }

  if (existing.rows[0].facebook_sub !== sub) {
    const res = NextResponse.redirect(
      new URL('/?login=1&message=This Facebook account does not match your profile.', baseUrl)
    );
    clearCookies(res);
    return res;
  }

  const userId = existing.rows[0].id as string;
  const roleValue = existing.rows[0].role as string;
  const role: UserRole =
    roleValue === 'admin' || roleValue === 'expert' || roleValue === 'participant'
      ? roleValue
      : 'participant';
  const token = signAuthToken({ sub: userId, role, email });
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
  const res = NextResponse.redirect(new URL(next, baseUrl));
  setAuthCookie(res, token);
  clearCookies(res);
  return res;
}
