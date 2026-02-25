import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { parseGPX } from '@/lib/gpx-parser';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if file is GPX or other supported format
    const fileName = file.name.toLowerCase();
    const isGPX = fileName.endsWith('.gpx');

    if (!isGPX) {
      return NextResponse.json(
        { error: 'Only GPX files are currently supported' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse GPX file
    const routeData = await parseGPX(fileContent);

    // Update trail with route data
    const updateQuery = `
      UPDATE trails
      SET route_data = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(routeData),
      id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Trail not found' },
        { status: 404 }
      );
    }

    const trailRow = result.rows[0];
    // Parse route_data for response
    if (trailRow.route_data && typeof trailRow.route_data === 'string') {
      try {
        trailRow.route_data = JSON.parse(trailRow.route_data);
      } catch (e) {
        // If parsing fails, keep as is
      }
    }

    return NextResponse.json(
      {
        trail: trailRow,
        message: 'Route uploaded successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading route:', error);
    return NextResponse.json(
      { error: 'Failed to upload route: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
