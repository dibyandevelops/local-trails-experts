INSERT INTO ride_notes (
  slug,
  title,
  excerpt,
  content,
  cover_image_url,
  category,
  status,
  published_at
)
VALUES
(
  'how-to-buy-a-proper-cycle',
  'How to Buy a Proper Cycle',
  'A practical guide to choosing a cycle that fits your riding style, body, terrain, and budget.',
  $$Buying a proper cycle starts with one simple question: where will you actually ride most of the time? A good bike for city roads may feel weak on rocky trails, and a downhill-focused bike may feel heavy on daily climbs.

Start with your main use. If you ride local trails, gravel roads, jeep tracks, and occasional singletrack, a hardtail mountain bike is often the safest first choice. If you mostly ride paved roads, a road or hybrid bike may make more sense. If you want one bike for mixed roads and light trails, look at gravel bikes or cross-country mountain bikes.

Fit matters more than brand. Check that you can stand over the frame comfortably, reach the handlebar without stretching too much, and pedal without knee pain. A wrong-size bike can make even an expensive model feel bad.

Look at the frame, brakes, drivetrain, wheels, and suspension before getting impressed by paint or stickers. For Nepal-style riding, reliable disc brakes, strong wheels, appropriate gearing, and serviceable parts are more important than flashy upgrades.

If you are buying used, inspect the frame for cracks, dents, rust, and fresh paint that may hide damage. Check if the wheels spin straight, the brakes bite cleanly, the gears shift properly, and the suspension does not leak oil.

Always include maintenance cost in your budget. A cheaper bike that immediately needs tires, brake pads, chain, cassette, cables, and suspension service may cost more than a better-maintained bike.

The proper cycle is the one that fits your body, matches your terrain, can be serviced locally, and leaves enough budget for a helmet, lights, basic tools, and regular maintenance.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  NOW()
),
(
  'popular-authentic-cycle-brands',
  'Popular Authentic Cycle Brands',
  'Recognized bicycle brands to know, plus simple checks to avoid fake or poorly maintained bikes.',
  $$A good brand does not automatically mean a good bike, but recognized brands usually make it easier to find reliable frames, correct sizing, better components, and service information.

Popular global mountain and road bike brands include Trek, Giant, Merida, Specialized, Scott, Cannondale, Cube, Marin, Polygon, Canyon, Orbea, Norco, Santa Cruz, and Commencal. Availability and support can vary by country, so always check what can be serviced near you.

For Nepal riders, local support matters. A brand with an authorized dealer, available spare parts, and mechanics who understand the model is often a better choice than a rare bike that is difficult to repair.

When checking authenticity, look for the frame serial number, original invoice, warranty card, model year details, correct logos, and component specs that match the official model. Fake decals and mismatched parts are common warning signs.

Used bikes need extra care. Ask why the owner is selling, when it was last serviced, whether the frame has crashed, and whether major parts have been replaced. A clean story and clear documents matter.

Do not buy only for the name on the frame. Buy for fit, condition, serviceability, and honest pricing. A well-maintained mid-range bike is usually better than a neglected premium bike.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  NOW()
),
(
  'how-to-ride-uphill',
  'How to Ride Uphill',
  'Simple climbing habits that help you stay steady, save energy, and enjoy longer rides.',
  $$Uphill riding is less about strength and more about rhythm. The goal is to keep moving without burning all your energy in the first few minutes.

Shift early before the climb becomes too steep. If you wait until your legs are already struggling, the gear change can feel rough and you may lose momentum. Use an easier gear and keep your pedaling smooth.

Stay seated on long climbs when possible. Seated climbing saves energy and helps the rear tire keep grip on loose surfaces. Stand only for short steep sections, obstacles, or when you need to stretch your legs.

Keep your upper body quiet. Hold the handlebar firmly but do not pull too hard. Look ahead, keep breathing steady, and avoid sudden movements that make the bike wobble.

On loose trail climbs, keep your weight balanced. Too much weight forward makes the rear tire slip, while too much weight back can make the front wheel lift. Slide slightly forward on the saddle and keep steady pressure on the pedals.

Break the climb into small goals. Ride to the next bend, tree, house, or shade. This keeps the climb mentally easier and helps you avoid panic pacing.

Practice on familiar hills. Over time, you will learn which gear works, when to drink, when to slow down, and when to push. Good climbing is built slowly.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  NOW()
),
(
  'types-of-bike',
  'Types of Bike',
  'A short guide to common bike types and where each one works best.',
  $$There is no single best bike for everyone. Different bikes are built for different surfaces, speeds, comfort levels, and riding goals.

Mountain bikes are made for trails, rough roads, climbs, descents, and mixed terrain. Hardtail mountain bikes have front suspension only and are simpler to maintain. Full-suspension mountain bikes add rear suspension for more comfort and control on rough trails.

Road bikes are built for speed on paved roads. They are light and efficient, but they are not ideal for rough trails or broken roads.

Gravel bikes sit between road bikes and mountain bikes. They are faster on roads than mountain bikes and more capable on rough roads than road bikes. They suit mixed routes, bikepacking, and long endurance rides.

Hybrid bikes are practical for commuting, fitness, and casual rides. They usually have a comfortable upright position and work well on city roads and light gravel.

Downhill and enduro bikes are built for aggressive descents. They are strong and controlled on steep trails, but they can feel heavy and slow for daily climbing.

Electric bikes add motor assistance. They can help riders cover more distance or climb more easily, but they cost more and need battery care.

Choose based on your normal route, not your dream route. The best bike is the one you will ride often and maintain properly.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  NOW()
),
(
  'what-to-know-before-buying-a-bike',
  'What to Know Before Buying a Bike',
  'Key checks to make before spending money on a new or used bike.',
  $$Before buying a bike, decide your budget clearly. Keep part of that budget for a helmet, lights, gloves, bottle, basic repair kit, and the first service. These items are not extras if you plan to ride regularly.

Know your size. Check the frame size, standover height, saddle position, and reach to the handlebar. If possible, test ride the bike for at least a few minutes and notice if your knees, back, wrists, or shoulders feel uncomfortable.

Understand the terrain you will ride. Kathmandu Valley climbs, rough shortcuts, jeep tracks, and trail sections need stronger wheels, useful gearing, and dependable brakes. Smooth road riding needs different priorities.

Check parts that wear out. Tires, chain, cassette, brake pads, cables, bearings, and suspension service can add real cost. On a used bike, these checks matter as much as the listed price.

Ask about documents and ownership. For expensive bikes, request the bill, warranty card, serial number, and seller details. Avoid deals that feel rushed, unclear, or unusually cheap.

Think about service. A bike that local shops can repair easily will keep you riding more often. Rare parts, unusual standards, or neglected suspension can become frustrating.

Do not rush the purchase. Compare options, ask experienced riders, and choose the bike that fits your body, riding plan, and maintenance budget.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  published_at = COALESCE(ride_notes.published_at, EXCLUDED.published_at),
  updated_at = NOW();
