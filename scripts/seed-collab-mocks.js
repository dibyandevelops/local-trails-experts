const { runSeedScript, withPool } = require('./db-utils');

const MOCK_USER = {
  name: 'Nirav Shrestha',
  email: 'nirav.shrestha.mock@mtbtrailfinder.app',
  password_hash: 'mock-hash-not-for-auth',
  role: 'expert',
  city: 'Kathmandu',
  bio: 'Elite MTB rider and mentor focused on trail progression in Nepal.',
  sports: ['mtb'],
};

const MOCK_ORG = {
  slug: 'nirav-racing-collective',
  name: 'Nirav Racing Collective',
  tagline: 'Elite rider-led trail progression and rider mentorship',
  description:
    'A rider-first collective helping validate trail safety, host progression sessions, and grow Nepal MTB culture.',
  website_url: 'https://example.com/nirav-racing-collective',
  instagram_url: 'https://instagram.com/nirav.rides',
  facebook_url: 'https://facebook.com/nirav.rides',
  whatsapp_url: 'https://wa.me/9779800000000',
  contact_email: 'collab@mtbtrailfinder.app',
  contact_phone: '+977-9800000000',
  city: 'Kathmandu',
  country: 'Nepal',
};

async function ensureMockUser(client) {
  const result = await client.query(
    `
    INSERT INTO users (name, email, password_hash, role, city, bio, sports, is_verified_expert)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      city = EXCLUDED.city,
      bio = EXCLUDED.bio,
      sports = EXCLUDED.sports,
      is_verified_expert = TRUE,
      updated_at = NOW()
    RETURNING id
    `,
    [
      MOCK_USER.name,
      MOCK_USER.email,
      MOCK_USER.password_hash,
      MOCK_USER.role,
      MOCK_USER.city,
      MOCK_USER.bio,
      JSON.stringify(MOCK_USER.sports),
    ]
  );

  return result.rows[0].id;
}

async function ensureMockOrg(client, userId) {
  const result = await client.query(
    `
    INSERT INTO organizations (
      slug, name, tagline, description, website_url, instagram_url, facebook_url, whatsapp_url,
      contact_email, contact_phone, city, country, is_verified, is_active, created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, TRUE, $13)
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      website_url = EXCLUDED.website_url,
      instagram_url = EXCLUDED.instagram_url,
      facebook_url = EXCLUDED.facebook_url,
      whatsapp_url = EXCLUDED.whatsapp_url,
      contact_email = EXCLUDED.contact_email,
      contact_phone = EXCLUDED.contact_phone,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      is_verified = TRUE,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING id
    `,
    [
      MOCK_ORG.slug,
      MOCK_ORG.name,
      MOCK_ORG.tagline,
      MOCK_ORG.description,
      MOCK_ORG.website_url,
      MOCK_ORG.instagram_url,
      MOCK_ORG.facebook_url,
      MOCK_ORG.whatsapp_url,
      MOCK_ORG.contact_email,
      MOCK_ORG.contact_phone,
      MOCK_ORG.city,
      MOCK_ORG.country,
      userId,
    ]
  );

  return result.rows[0].id;
}

async function ensureCampaign(client, campaign) {
  const existing = await client.query(
    `
    SELECT id
    FROM fundraising_campaigns
    WHERE organization_id = $1
      AND title = $2
    LIMIT 1
    `,
    [campaign.organization_id, campaign.title]
  );

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE fundraising_campaigns
      SET
        trail_id = $2,
        description = $3,
        target_amount_npr = $4,
        raised_amount_npr = $5,
        qr_image_url = $6,
        payment_note = $7,
        status = $8,
        starts_at = $9,
        ends_at = $10,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        campaign.trail_id,
        campaign.description,
        campaign.target_amount_npr,
        campaign.raised_amount_npr,
        campaign.qr_image_url,
        campaign.payment_note,
        campaign.status,
        campaign.starts_at,
        campaign.ends_at,
      ]
    );
    return false;
  }

  await client.query(
    `
    INSERT INTO fundraising_campaigns (
      organization_id, trail_id, title, description, target_amount_npr, raised_amount_npr,
      qr_image_url, payment_note, status, starts_at, ends_at, created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      campaign.organization_id,
      campaign.trail_id,
      campaign.title,
      campaign.description,
      campaign.target_amount_npr,
      campaign.raised_amount_npr,
      campaign.qr_image_url,
      campaign.payment_note,
      campaign.status,
      campaign.starts_at,
      campaign.ends_at,
      campaign.created_by_user_id,
    ]
  );
  return true;
}

async function run() {
  return withPool(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

    const userId = await ensureMockUser(client);
    const orgId = await ensureMockOrg(client, userId);

    await client.query(
      `
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES ($1, $2, 'org_admin', 'active')
      ON CONFLICT (organization_id, user_id)
      DO UPDATE SET role = 'org_admin', status = 'active', updated_at = NOW()
      `,
      [orgId, userId]
    );

    const trails = await client.query(
      `
      SELECT id, name
      FROM trails
      ORDER BY created_at ASC
      LIMIT 2
      `
    );

    if (!trails.rows.length) {
      throw new Error('No trails found. Seed trail data before running the collaboration seed.');
    }

    const primaryTrail = trails.rows[0];
    const secondaryTrail = trails.rows.length > 1 ? trails.rows[1] : trails.rows[0];

    await client.query(
      `
      INSERT INTO trail_organizations (trail_id, organization_id, relation_type, is_primary)
      VALUES
        ($1, $3, 'verified_by', TRUE),
        ($2, $3, 'maintained_by', FALSE)
      ON CONFLICT (trail_id, organization_id, relation_type)
      DO UPDATE SET is_primary = EXCLUDED.is_primary
      `,
      [primaryTrail.id, secondaryTrail.id, orgId]
    );

    const insertedFirstCampaign = await ensureCampaign(client, {
      organization_id: orgId,
      trail_id: primaryTrail.id,
      title: 'Nirav x MTB Trail Finder: Safety Signage Sprint',
      description:
        `Install and refresh safety signage across ${primaryTrail.name} with rider-tested descent warnings and emergency waypoints.`,
      target_amount_npr: 450000,
      raised_amount_npr: 175000,
      qr_image_url: '/donate/esewa-qr.svg',
      payment_note: 'Use reference: NIRAV-SAFETY-2026',
      status: 'active',
      starts_at: '2026-06-01T00:00:00.000Z',
      ends_at: '2026-07-31T23:59:59.000Z',
      created_by_user_id: userId,
    });

    const insertedSecondCampaign = await ensureCampaign(client, {
      organization_id: orgId,
      trail_id: secondaryTrail.id,
      title: 'Mentor the Climb: Youth Progression Clinics',
      description:
        `Monthly mentoring sessions led by Nirav and local experts to help intermediate riders level up on ${secondaryTrail.name}.`,
      target_amount_npr: 320000,
      raised_amount_npr: 82000,
      qr_image_url: '/donate/esewa-qr.svg',
      payment_note: 'Use reference: NIRAV-CLINIC-2026',
      status: 'paused',
      starts_at: '2026-08-01T00:00:00.000Z',
      ends_at: '2026-09-30T23:59:59.000Z',
      created_by_user_id: userId,
    });

    await client.query(
      `
      INSERT INTO trail_services (
        trail_id, organization_id, service_type, title, description, contact_phone,
        contact_whatsapp, contact_email, price_note, schedule_note, is_active, created_by_user_id
      )
      SELECT
        $1, $2, 'shuttle', 'Nirav Collab Shuttle Window',
        'Weekend shuttle support for collaboration events and trail maintenance days.',
        '+977-9800000000', 'https://wa.me/9779800000000', 'collab@mtbtrailfinder.app',
        'From NPR 1200 per rider (group dependent)', 'Sat-Sun, 6:30 AM - 2:00 PM', TRUE, $3
      WHERE NOT EXISTS (
        SELECT 1 FROM trail_services
        WHERE trail_id = $1 AND organization_id = $2 AND title = 'Nirav Collab Shuttle Window'
      )
      `,
      [primaryTrail.id, orgId, userId]
    );

    await client.query(
      `
      INSERT INTO trail_update_logs (
        trail_id, organization_id, actor_user_id, update_type, title, details, media_urls
      )
      SELECT
        $1, $2, $3, 'condition_update',
        'Pre-campaign recon complete',
        'Rock garden and off-camber segments mapped for signage placement. Temporary caution markers installed.',
        '["https://images.unsplash.com/photo-1544191696-15693ddad33b"]'::jsonb
      WHERE NOT EXISTS (
        SELECT 1
        FROM trail_update_logs
        WHERE trail_id = $1
          AND organization_id = $2
          AND title = 'Pre-campaign recon complete'
      )
      `,
      [primaryTrail.id, orgId, userId]
    );

    await client.query(
      `
      INSERT INTO organization_gallery_items (organization_id, image_url, caption, sort_order, created_by_user_id)
      SELECT
        $1,
        'https://images.unsplash.com/photo-1517940310602-26535839fe84',
        'Pilot collab ride recon before campaign kickoff.',
        1,
        $2
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_gallery_items
        WHERE organization_id = $1
          AND caption = 'Pilot collab ride recon before campaign kickoff.'
      )
      `,
      [orgId, userId]
    );

    await client.query('COMMIT');

    console.log('Collaboration mocks seeded successfully.');
    console.log(`- User: ${MOCK_USER.email}`);
    console.log(`- Organization: ${MOCK_ORG.slug}`);
    console.log(`- Campaign inserted: ${insertedFirstCampaign ? 'yes' : 'updated existing'}`);
    console.log(`- Campaign inserted: ${insertedSecondCampaign ? 'yes' : 'updated existing'}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

module.exports = run;

if (require.main === module) {
  runSeedScript(run, 'collaboration mocks');
}
