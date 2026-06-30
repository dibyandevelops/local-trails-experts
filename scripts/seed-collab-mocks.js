const { runSeedScript, withPool } = require('./db-utils');
const bcrypt = require('bcryptjs');

const TRAIL_BUILDERS_NEPAL = {
  slug: 'trail-builders-nepal',
  name: 'Trail Builders Nepal',
  tagline: 'Building and maintaining sustainable mountain trails',
  description:
    'Community-led trail building and maintenance with a focus on safe, sustainable riding in Nepal.',
  city: 'Kathmandu',
  country: 'Nepal',
};

const TBN_USERS = [
  {
    name: 'Sujan Karki',
    email: 'sujan.karki.tbn@mtbtrailfinder.app',
    password_hash: 'mock-hash-not-for-auth',
    role: 'expert',
    city: 'Kathmandu',
    bio: 'Trail builder and organization admin focused on enduro line maintenance.',
    sports: ['mtb'],
    memberRole: 'org_admin',
  },
  {
    name: 'Anita Shrestha',
    email: 'anita.shrestha.tbn@mtbtrailfinder.app',
    password_hash: 'mock-hash-not-for-auth',
    role: 'expert',
    city: 'Lalitpur',
    bio: 'Trail builder editor coordinating route notes, services, and campaign updates.',
    sports: ['mtb'],
    memberRole: 'org_editor',
  },
  {
    name: 'Nirav Shrestha',
    email: 'nirav.shrestha@locoxperts.app',
    password_hash: 'mock-hash-not-for-auth',
    role: 'expert',
    city: 'Kathmandu',
    bio: 'MTB skills coach focused on enduro progression, race preparation, and safe technical riding.',
    sports: ['mtb', 'enduro_mtb', 'downhill_mtb'],
    memberRole: 'org_editor',
  },
  {
    name: 'TBN Organization Manager',
    email: 'organization.admin@locoxperts.app',
    password: process.env.MOCK_ORGANIZATION_PASSWORD || 'LocoXpertsOrg2026!',
    role: 'expert',
    city: 'Kathmandu',
    bio: 'Organization account used to manage Trail Builders Nepal operations.',
    sports: ['mtb'],
    memberRole: 'org_owner',
  },
];

// TBN_TRAILS removed - we'll use existing trails associated with TBN organization

const TBN_CAMPAIGNS = [
  {
    trailIndex: 0, // Will map to first associated trail
    title: 'Chituwa Trail Drainage Refresh',
    description:
      'Refresh drainage, re-cut berms, and improve safety markers on the Chituwa trail.',
    target_amount_npr: 480000,
    raised_amount_npr: 210000,
    payment_note: 'Use reference: TBN-CHITUWA-2026',
    status: 'active',
    starts_at: '2026-06-01T00:00:00.000Z',
    ends_at: '2026-07-31T23:59:59.000Z',
  },
  {
    trailIndex: 1, // Will map to second associated trail
    title: 'Bindhyabasini Rescue Marker Upgrade',
    description:
      'Add route markers, emergency waypoints, and service support signage along the Bindhyabasini trail.',
    target_amount_npr: 360000,
    raised_amount_npr: 96000,
    payment_note: 'Use reference: TBN-BINDHYABASINI-2026',
    status: 'paused',
    starts_at: '2026-08-01T00:00:00.000Z',
    ends_at: '2026-09-30T23:59:59.000Z',
  },
  {
    trailIndex: 2, // Will map to third associated trail
    title: 'Hattiban Community Dig Day',
    description:
      'Community dig sessions to improve flow, clear drainage, and stabilize technical sections.',
    target_amount_npr: 240000,
    raised_amount_npr: 45000,
    payment_note: 'Use reference: TBN-HATTIBAN-2026',
    status: 'draft',
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-11-30T23:59:59.000Z',
  },
];

const TBN_SERVICES = [
  {
    trailIndex: 0, // Will map to first associated trail
    service_type: 'shuttle',
    title: 'Chituwa Shuttle Window',
    description: 'Weekend shuttle runs for the Chituwa trail.',
    contact_phone: '+977 9801112233',
    contact_whatsapp: 'https://wa.me/9779801112233',
    contact_email: 'shuttle@trailbuildersnepal.app',
    price_note: 'From NPR 1200 per rider',
    schedule_note: 'Sat-Sun, 6:30 AM - 1:30 PM',
  },
  {
    trailIndex: 1, // Will map to second associated trail
    service_type: 'lift',
    title: 'Bindhyabasini Lift Support',
    description: 'Vehicle support for uphill laps and shuttle-assisted descents.',
    contact_phone: '+977 9801112244',
    contact_whatsapp: 'https://wa.me/9779801112244',
    contact_email: 'lift@trailbuildersnepal.app',
    price_note: 'Group dependent',
    schedule_note: 'Daily, pre-book only',
  },
  {
    trailIndex: 2, // Will map to third associated trail
    service_type: 'support_vehicle',
    title: 'Hattiban Support Vehicle',
    description: 'Support vehicle and recovery assistance for long maintenance days.',
    contact_phone: '+977 9801112255',
    contact_whatsapp: 'https://wa.me/9779801112255',
    contact_email: 'support@trailbuildersnepal.app',
    price_note: 'By arrangement',
    schedule_note: 'Weekends and event days',
  },
];

const TBN_ORGANIZATION_SERVICES = [
  {
    category: 'ride_photography',
    title: 'MTB Ride Photography',
    description: 'Trail-side action photography and a curated digital album for private rides, teams, and events.',
    price_npr: 6500,
    price_note: 'Starting price for a half-day session',
    location: 'Kathmandu Valley, Nepal',
    contact_email: 'media@trailbuildersnepal.app',
  },
  {
    category: 'shuttle_transport',
    title: 'Group MTB Shuttle',
    description: 'Pre-booked rider and bike transport for trail days around Kathmandu and Lalitpur.',
    price_npr: 1200,
    price_note: 'Starting price per rider; route dependent',
    location: 'Kathmandu and Lalitpur, Nepal',
    contact_email: 'shuttle@trailbuildersnepal.app',
  },
  {
    category: 'creative_design',
    title: 'Ride Posters and Cool Graphics',
    description: 'Social posters, route graphics, event identity, and shareable artwork for MTB rides and campaigns.',
    price_npr: 3500,
    price_note: 'Starting price per design package',
    location: 'Remote across Nepal',
    contact_email: 'creative@trailbuildersnepal.app',
  },
];

const TBN_TRAIL_UPDATES = [
  {
    trailIndex: 0,
    update_type: 'condition_update',
    title: 'Post-monsoon drainage assessment complete',
    details: 'Checked all drainage points along the Chituwa trail. Main flow channels are clear but some side drains need clearing before peak season.',
    media_urls: ['https://images.unsplash.com/photo-1544191696-15693ddad33b'],
  },
  {
    trailIndex: 0,
    update_type: 'maintenance_done',
    title: 'Rock garden armored and smoothed',
    details: 'Added armoring to the technical rock garden section. Smoothed out the entry line for better flow while maintaining technical challenge.',
    media_urls: ['https://images.unsplash.com/photo-1517940310602-26535839fe84'],
  },
  {
    trailIndex: 1,
    update_type: 'hazard_reported',
    title: 'Fallen tree section near viewpoint',
    details: 'Large fallen tree blocking the line near the main viewpoint. Temporary bypass created, removal scheduled for weekend maintenance crew.',
    media_urls: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'],
  },
  {
    trailIndex: 1,
    update_type: 'hazard_cleared',
    title: 'Fallen tree removed and trail restored',
    details: 'Weekend crew successfully removed the fallen tree. Original line restored, minor erosion control added to prevent future issues.',
    media_urls: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb'],
  },
  {
    trailIndex: 2,
    update_type: 'maintenance_done',
    title: 'Berm reconstruction on lower flow section',
    details: 'Rebuilt three major berms on the lower section. Improved drainage and added compacting for durability through rainy season.',
    media_urls: ['https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99'],
  },
  {
    trailIndex: 2,
    update_type: 'condition_update',
    title: 'Trail condition rating: Good',
    details: 'Overall trail condition excellent after recent maintenance work. All technical sections riding well, vegetation trimmed back from riding line.',
    media_urls: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'],
  },
];

const RIDE_WITH_EXPERT_PROGRAMS = [
  {
    expertIndex: 0,
    trailIndex: 0,
    program_type: 'guided_ride',
    description:
      'A focused enduro ride with line choice, braking points, and safe sessioning through the main technical sections.',
    price_npr: 3500,
    max_group_size: 4,
    duration_note: '2.5-3 hours',
    meeting_point_note: 'Meet at the closest trailhead after confirmation.',
    availability_weekdays: ['Saturday', 'Sunday'],
    available_time_note: 'Morning starts preferred',
    skill_level: 'intermediate',
  },
  {
    expertIndex: 0,
    trailIndex: 1,
    program_type: 'guided_ride',
    description:
      'Trail builder-led ride focused on sustainable line use, flow sections, and current trail condition notes.',
    price_npr: 3000,
    max_group_size: 5,
    duration_note: 'Half day',
    meeting_point_note: 'Exact meet-up point shared after request approval.',
    availability_weekdays: ['Friday', 'Saturday'],
    available_time_note: 'Before noon',
    skill_level: 'intermediate',
  },
  {
    expertIndex: 1,
    trailIndex: 0,
    program_type: 'guided_ride',
    description:
      'A friendly technical skills ride for riders who want local route context and safer progression on enduro terrain.',
    price_npr: 2500,
    max_group_size: 3,
    duration_note: '2 hours',
    meeting_point_note: 'Meet near the main access road.',
    availability_weekdays: ['Wednesday', 'Saturday'],
    available_time_note: 'Early morning or late afternoon',
    skill_level: 'beginner',
  },
  {
    expertIndex: 1,
    trailIndex: 1,
    program_type: 'guided_ride',
    description:
      'Guided route session with local trail notes, bypass options, and support planning for first-time riders.',
    price_npr: 3200,
    max_group_size: 4,
    duration_note: '3 hours',
    meeting_point_note: 'Meet-up finalized after request.',
    availability_weekdays: ['Sunday'],
    available_time_note: 'Morning only',
    skill_level: 'intermediate',
  },
  {
    expertIndex: 0,
    trailIndex: 2,
    program_type: 'guided_ride',
    description:
      'Advanced terrain session for confident riders looking to understand line choice and trail maintenance context.',
    price_npr: 4500,
    max_group_size: 3,
    duration_note: 'Half day',
    meeting_point_note: 'Trailhead meet-up shared after confirmation.',
    availability_weekdays: ['Saturday'],
    available_time_note: '6:30 AM start',
    skill_level: 'advanced',
  },
  {
    expertIndex: 2,
    trailIndex: 0,
    program_type: 'training',
    description:
      'A structured 15-day MTB training block covering body position, braking, climbing, cornering, technical descents, ride fitness, and trail decision-making.',
    price_npr: 28000,
    max_group_size: 6,
    duration_note: '15 days',
    meeting_point_note: 'First session meetup and weekly route plan shared after request approval.',
    availability_weekdays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    available_time_note: '6:30-8:00 AM on weekdays, longer Saturday session',
    skill_level: 'intermediate',
  },
  {
    expertIndex: 2,
    trailIndex: 1,
    program_type: 'skills_clinic',
    description:
      'Focused one-day clinic for riders who want cleaner cornering, safer braking, line choice, and confidence on technical trail features.',
    price_npr: 4500,
    max_group_size: 5,
    duration_note: '1 day',
    meeting_point_note: 'Meet near the trail access point after confirmation.',
    availability_weekdays: ['Saturday', 'Sunday'],
    available_time_note: 'Morning session preferred',
    skill_level: 'beginner',
  },
  {
    expertIndex: 2,
    trailIndex: 2,
    program_type: 'tour',
    description:
      'A local trail tour for riders who want a slower, scenic day with route context, food stop suggestions, and support planning.',
    price_npr: 6500,
    max_group_size: 4,
    duration_note: 'Full day',
    meeting_point_note: 'Meet-up point selected based on rider location and trail access.',
    availability_weekdays: ['Friday', 'Saturday'],
    available_time_note: 'Flexible daytime start',
    skill_level: 'beginner',
  },
];

const CYCLE_HUBS = [
  {
    name: 'Epic Mountain Bike',
    city: 'Lalitpur',
    location: 'Sanepa / Jhamsikhel, Lalitpur, Nepal',
    latitude: 27.690299937452846,
    longitude: 85.30528399125546,
    services:
      'Mountain bike sales, workshop repairs, rentals, tours, parts, accessories, bike servicing pick-up and drop-off',
    hours: 'Open daily, 8:00 AM - 7:00 PM',
    phone: '+977 1-5455021',
    website: 'https://epicmountainbike.com',
  },
];

async function ensureUser(client, user) {
  const passwordHash = user.password
    ? await bcrypt.hash(user.password, 10)
    : user.password_hash;
  const isVerifiedExpert = user.role === 'expert';
  const result = await client.query(
    `
    INSERT INTO users (name, email, password_hash, role, city, bio, sports, is_verified_expert)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = CASE WHEN $9 THEN EXCLUDED.password_hash ELSE users.password_hash END,
      role = EXCLUDED.role,
      city = EXCLUDED.city,
      bio = EXCLUDED.bio,
      sports = EXCLUDED.sports,
      is_verified_expert = EXCLUDED.is_verified_expert,
      updated_at = NOW()
    RETURNING id
    `,
    [
      user.name,
      user.email,
      passwordHash,
      user.role,
      user.city,
      user.bio,
      JSON.stringify(user.sports),
      isVerifiedExpert,
      Boolean(user.password),
    ]
  );

  return result.rows[0].id;
}

async function ensureOrganization(client, adminUserId) {
  const result = await client.query(
    `
    INSERT INTO organizations (
      slug,
      name,
      tagline,
      description,
      city,
      country,
      is_verified,
      is_active,
      created_by_user_id,
      owner_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, $7)
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      is_verified = TRUE,
      is_active = TRUE,
      owner_user_id = EXCLUDED.owner_user_id,
      updated_at = NOW()
    RETURNING id
    `,
    [
      TRAIL_BUILDERS_NEPAL.slug,
      TRAIL_BUILDERS_NEPAL.name,
      TRAIL_BUILDERS_NEPAL.tagline,
      TRAIL_BUILDERS_NEPAL.description,
      TRAIL_BUILDERS_NEPAL.city,
      TRAIL_BUILDERS_NEPAL.country,
      adminUserId,
    ]
  );

  return result.rows[0].id;
}

async function ensureMember(client, organizationId, userId, role) {
  await client.query(
    `
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES ($1, $2, $3, 'active')
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
    `,
    [organizationId, userId, role]
  );
}

// ensureTrail and ensureTrailAssociation removed - we use existing trail associations

async function ensureCycleHub(client, store) {
  const existing = await client.query(
    `
    SELECT id
    FROM stores
    WHERE lower(name) = lower($1)
      AND lower(city) = lower($2)
    LIMIT 1
    `,
    [store.name, store.city]
  );

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE stores
      SET
        location = $2,
        latitude = $3,
        longitude = $4,
        services = $5,
        hours = $6,
        phone = $7,
        website = $8,
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        store.location,
        store.latitude,
        store.longitude,
        store.services,
        store.hours,
        store.phone,
        store.website,
      ]
    );
    return false;
  }

  await client.query(
    `
    INSERT INTO stores (
      name,
      city,
      location,
      latitude,
      longitude,
      services,
      hours,
      phone,
      website,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
    `,
    [
      store.name,
      store.city,
      store.location,
      store.latitude,
      store.longitude,
      store.services,
      store.hours,
      store.phone,
      store.website,
    ]
  );
  return true;
}

async function ensureCampaign(client, organizationId, trailId, userId, campaign) {
  const existing = await client.query(
    `
    SELECT id
    FROM fundraising_campaigns
    WHERE organization_id = $1
      AND title = $2
    LIMIT 1
    `,
    [organizationId, campaign.title]
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
        trailId,
        campaign.description,
        campaign.target_amount_npr,
        campaign.raised_amount_npr,
        '/donate/esewa-qr.svg',
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
      organization_id,
      trail_id,
      title,
      description,
      target_amount_npr,
      raised_amount_npr,
      qr_image_url,
      payment_note,
      status,
      starts_at,
      ends_at,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      organizationId,
      trailId,
      campaign.title,
      campaign.description,
      campaign.target_amount_npr,
      campaign.raised_amount_npr,
      '/donate/esewa-qr.svg',
      campaign.payment_note,
      campaign.status,
      campaign.starts_at,
      campaign.ends_at,
      userId,
    ]
  );
  return true;
}

async function ensureService(client, organizationId, trailId, userId, service) {
  const existing = await client.query(
    `
    SELECT id
    FROM trail_services
    WHERE trail_id = $1
      AND organization_id = $2
      AND title = $3
    LIMIT 1
    `,
    [trailId, organizationId, service.title]
  );

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE trail_services
      SET
        service_type = $2,
        description = $3,
        contact_phone = $4,
        contact_whatsapp = $5,
        contact_email = $6,
        price_note = $7,
        schedule_note = $8,
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        service.service_type,
        service.description,
        service.contact_phone,
        service.contact_whatsapp,
        service.contact_email,
        service.price_note,
        service.schedule_note,
      ]
    );
    return false;
  }

  await client.query(
    `
    INSERT INTO trail_services (
      trail_id,
      organization_id,
      service_type,
      title,
      description,
      contact_phone,
      contact_whatsapp,
      contact_email,
      price_note,
      schedule_note,
      is_active,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11)
    `,
    [
      trailId,
      organizationId,
      service.service_type,
      service.title,
      service.description,
      service.contact_phone,
      service.contact_whatsapp,
      service.contact_email,
      service.price_note,
      service.schedule_note,
      userId,
    ]
  );
  return true;
}

async function ensureOrganizationService(client, organizationId, userId, service) {
  const result = await client.query(
    `
    INSERT INTO organization_services (
      organization_id, created_by_user_id, category, title, description,
      price_npr, price_note, location, contact_email, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
    ON CONFLICT (organization_id, title)
    DO UPDATE SET
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      price_npr = EXCLUDED.price_npr,
      price_note = EXCLUDED.price_note,
      location = EXCLUDED.location,
      contact_email = EXCLUDED.contact_email,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
    `,
    [
      organizationId,
      userId,
      service.category,
      service.title,
      service.description,
      service.price_npr,
      service.price_note,
      service.location,
      service.contact_email,
    ]
  );
  return Boolean(result.rows[0]?.inserted);
}

async function ensureTrailUpdate(client, trailId, organizationId, userId, update) {
  const existing = await client.query(
    `
    SELECT id
    FROM trail_update_logs
    WHERE trail_id = $1
      AND organization_id = $2
      AND title = $3
    LIMIT 1
    `,
    [trailId, organizationId, update.title]
  );

  if (existing.rows.length) {
    return false;
  }

  await client.query(
    `
    INSERT INTO trail_update_logs (
      trail_id,
      organization_id,
      actor_user_id,
      update_type,
      title,
      details,
      media_urls
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      trailId,
      organizationId,
      userId,
      update.update_type,
      update.title,
      update.details,
      JSON.stringify(update.media_urls),
    ]
  );
  return true;
}

async function getExpertAssociatedTrails(client, expertUserId) {
  const result = await client.query(
    `
    SELECT t.id, t.slug, t.name
    FROM expert_trails et
    JOIN trails t ON t.id = et.trail_id
    WHERE et.expert_user_id = $1
      AND t.status = 'approved'
      AND COALESCE(t.is_hidden, FALSE) = FALSE
    ORDER BY et.sort_order ASC NULLS LAST, et.created_at ASC
    `,
    [expertUserId]
  );
  return result.rows;
}

async function ensureExpertTrailAssociations(client, expertUserIds, trails) {
  let inserted = 0;
  for (const [expertIndex, expertUserId] of expertUserIds.entries()) {
    const selectedTrails = trails.slice(0, 3);
    for (const [trailIndex, trail] of selectedTrails.entries()) {
      const result = await client.query(
        `
        INSERT INTO expert_trails (expert_user_id, trail_id, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (expert_user_id, trail_id)
        DO UPDATE SET sort_order = EXCLUDED.sort_order
        RETURNING (xmax = 0) AS inserted
        `,
        [expertUserId, trail.id, expertIndex * 10 + trailIndex]
      );
      if (result.rows[0]?.inserted) inserted++;
    }
  }
  return inserted;
}

function getProgramTypeLabel(programType) {
  switch (programType) {
    case 'training':
      return 'MTB training';
    case 'skills_clinic':
      return 'skills clinic';
    case 'tour':
      return 'local tour';
    default:
      return 'ride';
  }
}

function buildRideProgramTitle(expertName, trailName, program) {
  const programType = program.program_type || 'guided_ride';
  if (programType === 'guided_ride') {
    return `Ride with ${expertName} to ${trailName}`;
  }

  const durationPrefix = program.duration_note ? `${program.duration_note} ` : '';
  return `${durationPrefix}${getProgramTypeLabel(programType)} with ${expertName} to ${trailName}`;
}

async function ensureRideProgram(
  client,
  expertUserId,
  expertName,
  trail,
  program,
  organizationId,
  createdByUserId
) {
  const programType = program.program_type || 'guided_ride';
  const title = buildRideProgramTitle(expertName, trail.name, program);
  const existing = await client.query(
    `
    SELECT id
    FROM expert_ride_programs
    WHERE expert_user_id = $1
      AND trail_id = $2
      AND title = $3
    LIMIT 1
    `,
    [expertUserId, trail.id, title]
  );

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE expert_ride_programs
      SET
        program_type = $2,
        description = $3,
        price_npr = $4,
        max_group_size = $5,
        duration_note = $6,
        meeting_point_note = $7,
        availability_weekdays = $8::jsonb,
        available_time_note = $9,
        skill_level = $10,
        organization_id = $11,
        created_by_user_id = $12,
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        programType,
        program.description,
        program.price_npr,
        program.max_group_size,
        program.duration_note,
        program.meeting_point_note,
        JSON.stringify(program.availability_weekdays),
        program.available_time_note,
        program.skill_level,
        organizationId,
        createdByUserId,
      ]
    );
    return false;
  }

  await client.query(
    `
    INSERT INTO expert_ride_programs (
      expert_user_id,
      trail_id,
      organization_id,
      created_by_user_id,
      title,
      program_type,
      description,
      price_npr,
      max_group_size,
      duration_note,
      meeting_point_note,
      availability_weekdays,
      available_time_note,
      skill_level,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, TRUE)
    `,
    [
      expertUserId,
      trail.id,
      organizationId,
      createdByUserId,
      title,
      programType,
      program.description,
      program.price_npr,
      program.max_group_size,
      program.duration_note,
      program.meeting_point_note,
      JSON.stringify(program.availability_weekdays),
      program.available_time_note,
      program.skill_level,
    ]
  );
  return true;
}

async function seedTrailBuildersNepal() {
  return withPool(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tbnUserIds = [];
      for (const user of TBN_USERS) {
        tbnUserIds.push(await ensureUser(client, user));
      }

      const adminUserId = tbnUserIds[0];
      const ownerUserId = tbnUserIds.find(
        (_userId, index) => TBN_USERS[index].memberRole === 'org_owner'
      );
      const organizationId = await ensureOrganization(client, ownerUserId || adminUserId);

      for (const [index, userId] of tbnUserIds.entries()) {
        await ensureMember(client, organizationId, userId, TBN_USERS[index].memberRole);
      }

      // Query existing trails associated with TBN organization
      const trailsResult = await client.query(
        `
        SELECT t.id, t.slug, t.name
        FROM trails t
        JOIN trail_organizations trail_org ON t.id = trail_org.trail_id
        WHERE trail_org.organization_id = $1
        ORDER BY t.created_at ASC
        `,
        [organizationId]
      );

      if (trailsResult.rows.length === 0) {
        throw new Error('No trails found associated with TBN organization. Please associate trails first.');
      }

      const associatedTrails = trailsResult.rows;
      console.log(`Found ${associatedTrails.length} trails associated with TBN:`);
      associatedTrails.forEach(trail => console.log(`  - ${trail.name} (${trail.slug})`));

      const campaignResults = [];
      for (const campaign of TBN_CAMPAIGNS) {
        if (campaign.trailIndex >= associatedTrails.length) {
          console.warn(`Skipping campaign "${campaign.title}" - trail index ${campaign.trailIndex} out of range`);
          continue;
        }
        const trailId = associatedTrails[campaign.trailIndex].id;
        campaignResults.push(
          await ensureCampaign(client, organizationId, trailId, adminUserId, campaign)
        );
      }

      const serviceResults = [];
      for (const service of TBN_SERVICES) {
        if (service.trailIndex >= associatedTrails.length) {
          console.warn(`Skipping service "${service.title}" - trail index ${service.trailIndex} out of range`);
          continue;
        }
        const trailId = associatedTrails[service.trailIndex].id;
        serviceResults.push(await ensureService(client, organizationId, trailId, adminUserId, service));
      }

      const organizationServiceResults = [];
      for (const service of TBN_ORGANIZATION_SERVICES) {
        organizationServiceResults.push(
          await ensureOrganizationService(client, organizationId, adminUserId, service)
        );
      }

      const updateResults = [];
      for (const update of TBN_TRAIL_UPDATES) {
        if (update.trailIndex >= associatedTrails.length) {
          console.warn(`Skipping update "${update.title}" - trail index ${update.trailIndex} out of range`);
          continue;
        }
        const trailId = associatedTrails[update.trailIndex].id;
        updateResults.push(await ensureTrailUpdate(client, trailId, organizationId, adminUserId, update));
      }

      const cycleHubResults = [];
      for (const store of CYCLE_HUBS) {
        cycleHubResults.push(await ensureCycleHub(client, store));
      }

      const expertIds = tbnUserIds.filter(
        (_userId, index) => TBN_USERS[index].role === 'expert'
      );
      const expertTrailAssociationsInserted = await ensureExpertTrailAssociations(
        client,
        expertIds,
        associatedTrails
      );
      const expertTrailsByIndex = [];
      for (const expertId of expertIds) {
        expertTrailsByIndex.push(await getExpertAssociatedTrails(client, expertId));
      }

      const rideProgramResults = [];
      for (const program of RIDE_WITH_EXPERT_PROGRAMS) {
        const expert = TBN_USERS[program.expertIndex];
        const expertUserId = expertIds[program.expertIndex];
        const expertTrails = expertTrailsByIndex[program.expertIndex] || [];
        const trail = expertTrails[program.trailIndex];

        if (!expertUserId || !trail) {
          console.warn(
            `Skipping ride program for expert index ${program.expertIndex}, trail index ${program.trailIndex} - no associated trail found`
          );
          continue;
        }

        rideProgramResults.push(
          await ensureRideProgram(
            client,
            expertUserId,
            expert.name,
            trail,
            program,
            organizationId,
            adminUserId
          )
        );
      }

      await client.query('COMMIT');

      console.log('Trail Builders Nepal seed completed successfully.');
      console.log(`- Organization: ${TRAIL_BUILDERS_NEPAL.slug}`);
      console.log(`- Users: ${TBN_USERS.length}`);
      console.log(`- Trails used: ${associatedTrails.length}`);
      console.log(`- Campaigns inserted: ${campaignResults.filter(Boolean).length}`);
      console.log(`- Services inserted: ${serviceResults.filter(Boolean).length}`);
      console.log(`- Organization services inserted: ${organizationServiceResults.filter(Boolean).length}`);
      console.log(`- Trail updates inserted: ${updateResults.filter(Boolean).length}`);
      console.log(`- Cycle hubs inserted: ${cycleHubResults.filter(Boolean).length}`);
      console.log(`- Expert trail associations inserted: ${expertTrailAssociationsInserted}`);
      console.log(`- Expert programs inserted: ${rideProgramResults.filter(Boolean).length}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

module.exports = seedTrailBuildersNepal;

if (require.main === module) {
  runSeedScript(seedTrailBuildersNepal, 'trail builders nepal');
}
