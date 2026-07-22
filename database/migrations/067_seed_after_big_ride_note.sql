UPDATE ride_notes
SET
  status = 'draft',
  updated_at = NOW()
WHERE LOWER(slug) LIKE '%kora%'
   OR LOWER(title) LIKE '%kora%';

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
VALUES (
  'what-now-after-the-big-ride',
  'What now after the big ride?',
  'A calm post-event note on recovery, bike care, learning from the ride, and turning one big cycling day into a better riding habit.',
  $$A big ride can leave you tired, proud, and a little unsure about what to do next. The best answer is not to rush into another hard effort immediately. Give your body, bike, and mind a short reset first.

Start with recovery. Drink enough water, eat a proper meal, stretch lightly, and sleep well. If your legs feel heavy for a few days, that is normal. Easy spinning, walking, or a short relaxed ride can help more than forcing another hard climb too soon.

Check your bike while the ride is still fresh in your memory. Clean the chain, look for loose bolts, inspect the tyres, check brake pads, and notice any shifting or noise problems. Small issues after a long ride are easier to fix early.

Write down what you learned. Which climb felt hardest? Where did you run out of food or water? Did your saddle, shoes, gloves, or pacing feel right? These notes are simple, but they make your next long ride much better.

Stay connected with the people you rode with. Share photos, thank the riders who helped, and ask about routes you want to try next. A strong cycling community is built between events, not only during them.

The next step does not need to be bigger. It can be a cleaner local loop, a better-paced weekend ride, a trail you have not explored, or helping a newer rider join safely. One big ride becomes useful when it turns into a steady riding habit.$$,
  '/images/trail-og-fallback.jpg',
  'ride_note',
  'published',
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  published_at = COALESCE(ride_notes.published_at, EXCLUDED.published_at),
  updated_at = NOW();
