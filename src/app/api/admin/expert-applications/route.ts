import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { createTempPassword, getAuthFromRequest } from '@/lib/auth';
import type { UserRole } from '@/types';

type ExpertApplicationStatus = 'pending' | 'approved' | 'rejected';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as ExpertApplicationStatus | null;

    const params: any[] = [];
    let whereClause = '';

    if (status) {
      whereClause = 'WHERE status = $1';
      params.push(status);
    }

    const query = `
      SELECT
        id,
        name,
        email,
        city,
        sports,
        credentials,
        status,
        created_at,
        reviewed_at
      FROM expert_applications
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, params);
    return NextResponse.json({ applications: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert applications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body as {
      id?: string;
      status?: ExpertApplicationStatus;
    };

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let tempPassword: string | null = null;

    try {
      await client.query('BEGIN');

      const updatedApp = await client.query(
        `
        UPDATE expert_applications
        SET status = $1,
            reviewed_at = NOW(),
            reviewed_by_admin_id = $3
        WHERE id = $2
        RETURNING id, name, email, city, sports, credentials, status, reviewed_at, phone, phone_verified_at
      `,
        [status, id, auth.sub]
      );

      const application = updatedApp.rows[0];
      if (!application) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        );
      }

      if (status === 'approved') {
        const existingUser = await client.query(
          'SELECT id, role FROM users WHERE email = $1 LIMIT 1',
          [application.email]
        );

        if (existingUser.rows.length === 0) {
          tempPassword = createTempPassword();
          const passwordHash = await bcrypt.hash(tempPassword, 10);
          const sportsJson = Array.isArray(application.sports)
            ? JSON.stringify(application.sports)
            : null;

          await client.query(
            `
            INSERT INTO users (name, email, password_hash, role, bio, city, sports, is_verified_expert, phone, phone_verified_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE, $8, $9)
          `,
            [
              application.name,
              application.email,
              passwordHash,
              'expert' as UserRole,
              application.credentials,
              application.city,
              sportsJson,
              application.phone || null,
              application.phone_verified_at || null,
            ]
          );
        } else {
          await client.query(
            `
            UPDATE users
            SET role = 'expert',
                is_verified_expert = TRUE,
                city = COALESCE($2, city),
                sports = COALESCE($3::jsonb, sports),
                phone = COALESCE($4, phone),
                phone_verified_at = COALESCE($5, phone_verified_at)
            WHERE id = $1
          `,
            [
              existingUser.rows[0].id,
              application.city,
              Array.isArray(application.sports)
                ? JSON.stringify(application.sports)
                : null,
              application.phone || null,
              application.phone_verified_at || null,
            ]
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json(
        {
          application: {
            id: application.id,
            name: application.name,
            email: application.email,
            status: application.status,
            reviewed_at: application.reviewed_at,
          },
          tempPassword,
        },
        { status: 200 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating expert application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
