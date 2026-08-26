-- Migration 076: Seed rich, actionable ride blogs with trail & platform usability associations

INSERT INTO ride_notes (
  slug,
  title,
  excerpt,
  content,
  cover_image_url,
  category,
  status,
  trail_id,
  published_at
)
VALUES
(
  'ultimate-kathmandu-valley-circuit-guide',
  'The Ultimate Kathmandu Valley MTB Circuit: Ridge Drops, Pine Singletrack & Village Climbs',
  'A rider’s complete guide to tackling the valley rim, featuring elevation pacing, technical descents, offline navigation tips, and local refreshment stops.',
  $$The Kathmandu Valley rim offers one of the world's most dynamic mountain biking landscapes. Within thirty minutes of leaving the city asphalt, you transition onto lush pine singletracks, technical root gardens, and ancient village footpaths with sweeping views of the Ganesh and Langtang Himalayan ranges.

Understanding the Valley Circuit Terrain:
The circuit connects multiple ridgelines—from the northern pine forests of Shivapuri to the eastern slopes of Nagarkot and the technical southern descents of Phulchowki. The terrain shifts constantly between packed red clay loam, exposed shale, and loose gravel jeep tracks. During dry months, the fine dust demands precise tire traction, while post-monsoon rides require careful line choice around wet roots.

Platform Navigation & Offline Route Caching:
Cellular reception drops frequently once you enter dense ridgeline singletrack. Before rolling out, open this trail on the LocoXperts web platform or download the route into the LocoXperts Navigator mobile app. The vector map will stay fully accessible offline. If you take an overgrown cattle fork by mistake, the smart 'Guide Back' navigation will instantly direct you back to the official trail line using physical road connections.

Pacing the Elevation:
With over 1,500 meters of cumulative climbing, pacing is essential. Keep your cadence between 75 and 85 RPM on the sustained paved climbs through the foothills. Save your energy for the punchy, rocky village switchbacks where standing bursts are required.

Pre-Ride Preparation Checklist:
- Bike check: Inspect tubeless sealant levels and ensure tire pressure is set between 22-26 PSI for traction.
- Spares: Carry two tire levers, tubeless plug bacon strips, a compact hand pump, and a master link.
- Nutrition & Water: Pack at least 2 liters of water and electrolyte tablets; local teahouses are spaced every 8 to 12 km.
- Platform check: Pre-download the GPX track and verify the latest weather forecast on LocoXperts before departure.

Community & Local Trail Etiquette:
You will share several trail sections with local hikers, trail runners, and village elders carrying grass baskets. Always ring your bell or call out early when approaching blind corners. Dismount or yield right-of-way on narrow terrace walls. Supporting small local tea shops for fresh chiya and bananas keeps the local trail community welcoming.$$,
  '/images/trail-og-fallback.jpg',
  'trail_guide',
  'published',
  (SELECT id FROM trails WHERE name ILIKE '%Kathmandu 360%' OR name ILIKE '%Valley%' LIMIT 1),
  NOW()
),
(
  'mastering-himalayan-switchbacks-and-steep-descents',
  'Mastering Himalayan Switchbacks: A Guide’s Technique Playbook for Steep Loose Singletrack',
  'Learn the body mechanics, braking modulation, and line selection needed to tackle loose, off-camber Himalayan corners with total confidence.',
  $$Riding steep downhill trails in the Himalayas is a test of balance, patience, and braking discipline. Unlike manicured bike park berms, natural Himalayan singletracks feature tight, off-camber switchbacks filled with loose gravel, baby-head rocks, and steep drop-offs.

Mastering Body Positioning:
Your center of gravity dictates traction. Lower your chest toward the handlebars while keeping your hips hinged over the bottom bracket—think 'heavy feet, light hands'. Dropping your heels helps absorb braking forces and prevents your weight from pitching over the front wheel when dropping into steep switchbacks.

Braking Without Losing Traction:
The biggest mistake on steep loose terrain is grabbing a fistful of front brake mid-corner. Complete 80% of your braking before you enter the turn while the bike is still upright. As you lean the bike into the switchback, feather the rear brake lightly and let the wheels roll through the apex.

Line Choice: Look Three Turns Ahead:
Target fixation is real: if you stare at the sharp boulder on the edge of the trail, your front tire will track directly into it. Keep your chin up and point your belly button toward the exit of the switchback. Scanning three bike lengths ahead gives your brain time to process rocks and choose the highest, smoothest line.

Trail Readiness Checklist:
- Suspension Sag: Set front fork sag at 20-25% and rear shock sag at 28-30% to prevent diving under hard braking.
- Cockpit: Rotate brake levers slightly upward so your wrists stay straight on steep downhill pitches.
- Protective Gear: Full-face or deep-coverage helmet, knee pads, and full-finger grip gloves.
- Guided Progression: If you are new to technical terrain, book a ride session with a certified LocoXperts guide to learn line choice in real-time.

Connecting with Local Experts on LocoXperts:
Nothing speeds up technical progression faster than following the wheel of a seasoned local rider. You can explore verified local guides and certified mountain bike experts on LocoXperts to schedule private skills coaching or join guided weekend technical clinics.$$,
  '/images/trail-og-fallback.jpg',
  'safety',
  'published',
  (SELECT id FROM trails WHERE name ILIKE '%Shivapuri%' LIMIT 1),
  NOW()
),
(
  'pokhara-ridge-trails-sarangkot-to-peace-pagoda',
  'Pokhara Ridges: Riding Sarangkot Sunrise to the World Peace Pagoda',
  'Experience golden hour over Phewa Lake, rolling hillside traverses, and flowing downhill singletracks through the hills of Pokhara.',
  $$Pokhara is famed for its tranquil lakes and towering Annapurna backdrop, but for mountain bikers, it is a playground of ridgeline traverses, terrace descents, and fast-flowing singletracks. Combining the morning drop from Sarangkot with the scenic climb to the World Peace Pagoda creates one of the most rewarding day rides in Nepal.

The Route Flow:
Start before dawn with an easy spin or vehicle shuttle to Sarangkot ridge at 1,600 meters. Catch the sunrise illuminating Machhapuchhre (Fishtail) and Annapurna South before dropping into the fast, flowing jeep track and singletrack descent down to the northern shore of Phewa Lake. After a lakeside refreshment break, tackle the shaded jungle climb up to the World Peace Pagoda stupa, rewarded by a fast descent back to Lakeside.

Bike Setup Recommendations:
A lightweight trail hardtail or 120-140mm short-travel full suspension bike is the weapon of choice for this route. Fast-rolling cross-country tires with reinforced sidewalls provide low rolling resistance on paved sections while offering puncture protection on sharp limestone rocks.

Ride Day Checklist:
- Lighting: Reliable 800+ lumen front headlight for the pre-dawn Sarangkot ascent.
- Hydration: Two 750ml bottles or a hydration pack with electrolytes.
- Offline Navigation: Ensure your trail route is synced in the LocoXperts mobile app for real-time turn maneuvers.
- Photography: A secure top-tube bag or chest harness for quick photo stops without interrupting flow.

Local Bike Shops & Services in Pokhara:
Need last-minute tubeless sealant, bike rentals, or suspension setup? Use the LocoXperts Store Locator to find verified local bicycle service centers and rental shops near Lakeside before starting your ride.$$,
  '/images/trail-og-fallback.jpg',
  'expert_note',
  'published',
  (SELECT id FROM trails WHERE name ILIKE '%Lakeside%' OR name ILIKE '%Peace Pagoda%' LIMIT 1),
  NOW()
),
(
  'himalayan-bikepacking-and-gear-essentials',
  'Himalayan Bikepacking 101: Packing List, Power Management & High Altitude Routing',
  'Everything you need to know about multi-day self-supported bike adventures in the Himalayas, from altitude acclimatization to gear distribution.',
  $$Multi-day bikepacking through the high valleys of Nepal is an unforgettable journey. Riding through remote mountain villages, crossing suspension bridges, and sleeping in high-altitude teahouses requires self-sufficiency, physical endurance, and disciplined gear packing.

Weight Distribution on the Bike:
In steep Himalayan terrain, carrying all your weight in a heavy backpack will quickly lead to shoulder fatigue and back pain. Distribute weight across the bike frame:
- Frame Bag: Heaviest items (tools, spare parts, battery packs, chain lube).
- Seat Pack: Lightweight, compressible items (sleeping bag liner, down jacket, evening clothes).
- Handlebar Roll: Tent/bivy, thermal sleeping mat, and dry change of base layers.
- Top Tube Bag: Snacks, phone, lip balm, and navigation devices for quick access.

Power & Electronics in Remote Valleys:
Teahouses in remote regions often rely on solar power, and wall plug charging may be limited or carry a fee during peak season. Bring a high-capacity 20,000 mAh power bank with quick-charge capabilities. Running your phone in airplane mode with LocoXperts offline maps and GPS location enabled uses less than 15% battery over an entire 6-hour riding day.

Essential Multi-Day Packing Checklist:
- Bike Maintenance: 2 spare tubes, tubeless plugs, chain lube, mini multi-tool with chain breaker, spare brake pads, and zip ties.
- High Altitude Apparel: Merino wool base layers, windproof shell jacket, insulated packable down jacket, and water-resistant gloves.
- Health & Hygiene: Water purification drops or filter bottle, broad-spectrum sunscreen, altitude sickness medication (Diamox), and blister bandages.
- Community Coordination: Connect with other adventure riders on LocoXperts community rides to share logistics and route updates.

Planning Multi-Day Adventures with LocoXperts:
Before undertaking long-distance routes, check community updates and ride notes posted by local experts on LocoXperts. You can also create a community ride event to invite fellow riders or request route guidance from local organizers.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  (SELECT id FROM trails WHERE name ILIKE '%Kakani%' OR name ILIKE '%Phulchowki%' LIMIT 1),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  trail_id = COALESCE(EXCLUDED.trail_id, ride_notes.trail_id),
  published_at = COALESCE(ride_notes.published_at, EXCLUDED.published_at),
  updated_at = NOW();
