import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { isAllowedImageUrl } from '@/lib/image-url';

function normalizeHttpUrl(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || auth.role !== 'expert') {
    return NextResponse.json({ error: 'Verified expert access required.' }, { status: 403 });
  }

  try {
    const limited = await rateLimit(request, 'organization-create', 3, 60 * 10);
    if (limited) return limited;

    const expertResult = await pool.query(
      `SELECT id, email
       FROM users
       WHERE id = $1
         AND role = 'expert'
         AND is_verified_expert = TRUE
         AND COALESCE(is_hidden, FALSE) = FALSE
       LIMIT 1`,
      [auth.sub]
    );
    const expert = expertResult.rows[0];
    if (!expert) {
      return NextResponse.json(
        { error: 'Your expert profile must be approved by an admin before creating an organization.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const organizationName = String(body?.name || '').trim();
    const slug = String(body?.slug || '').trim().toLowerCase();
    const description = String(body?.description || '').trim();
    const logoUrl = String(body?.logo_url || '').trim() || null;
    const websiteRaw = String(body?.website_url || '').trim();
    const websiteUrl = normalizeHttpUrl(websiteRaw);
    const contactEmail = String(expert.email || '').trim().toLowerCase();

    if (!organizationName || !slug || !description) {
      return NextResponse.json(
        { error: 'Organization name, slug, and description are required.' },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return NextResponse.json(
        { error: 'Use lowercase letters, numbers, and hyphens for the slug.' },
        { status: 400 }
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'Enter a valid contact email.' }, { status: 400 });
    }
    if (logoUrl && !isAllowedImageUrl(logoUrl, 650_000)) {
      return NextResponse.json(
        { error: 'Logo must be a valid HTTPS image or supported upload.' },
        { status: 400 }
      );
    }
    if (websiteRaw && !websiteUrl) {
      return NextResponse.json(
        { error: 'Website must be a valid HTTP or HTTPS URL.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existingOwner = await client.query(
        'SELECT id FROM organizations WHERE owner_user_id = $1 LIMIT 1 FOR UPDATE',
        [auth.sub]
      );
      if (existingOwner.rows.length) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You already own an organization.' },
          { status: 409 }
        );
      }

      const organizationResult = await client.query(
        `INSERT INTO organizations (
           slug, name, tagline, description, logo_url, website_url,
           contact_email, contact_phone, city, country,
           is_verified, is_active, created_by_user_id, owner_user_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, TRUE, $11, $11)
         RETURNING *`,
        [
          slug,
          organizationName,
          String(body?.tagline || '').trim() || null,
          description,
          logoUrl,
          websiteUrl,
          contactEmail,
          String(body?.contact_phone || '').trim() || null,
          String(body?.city || '').trim() || null,
          String(body?.country || '').trim() || 'Nepal',
          auth.sub,
        ]
      );
      const organization = organizationResult.rows[0];
      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role, status)
         VALUES ($1, $2, 'org_owner', 'active')`,
        [organization.id, auth.sub]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, organization }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'This organization URL is already in use, or you already own an organization.' },
        { status: 409 }
      );
    }
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization.' }, { status: 500 });
  }
}
