import type { Metadata } from 'next';
import Link from 'next/link';
import RideNoteShareButton from '@/components/ride-notes/ride-note-share-button';
import { getPublicRideNotes, type PublicRideNote, type RideNoteCategory } from '@/lib/data/public-ride-notes';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Ride Notes',
  description:
    'Local trail guides, expert notes, ride reports, safety updates, and trail work stories from LocoXperts.',
  alternates: { canonical: '/ride-notes' },
};

const categoryLabels: Record<RideNoteCategory, string> = {
  trail_guide: 'Trail guide',
  expert_note: 'Expert note',
  ride_report: 'Ride report',
  safety: 'Safety',
  trail_work: 'Trail work',
  ride_note: 'Ride note',
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-NP', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNoteMeta(note: PublicRideNote) {
  return [
    formatDate(note.published_at || note.created_at),
    note.trail_name,
    note.expert_name ? `With ${note.expert_name}` : '',
  ].filter(Boolean);
}

export default async function RideNotesPage() {
  const notes = await getPublicRideNotes();
  const [featuredNote, ...restNotes] = notes;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50/60 px-6 py-8 shadow-sm dark:border-emerald-900/60 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/40 md:px-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl dark:bg-lime-300/10" />
        <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-lime-200">
          Ride Notes
        </p>
        <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-0.04em] text-emerald-950 dark:text-white md:text-6xl">
          Local knowledge before the ride.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-950/75 dark:text-slate-300 md:text-base">
          Trail guides, expert notes, ride reports, safety updates, and trail work stories connected
          to the routes and people on LocoXperts.
        </p>
        </div>
      </header>

      {notes.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No ride notes published yet.
        </section>
      ) : (
        <>
          {featuredNote && (
            <article className="group mt-6 grid overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[1.1fr_0.9fr]">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {categoryLabels[featuredNote.category]}
                  </span>
                  <RideNoteShareButton
                    title={featuredNote.title}
                    url={absoluteUrl(`/ride-notes/${featuredNote.slug}`)}
                    compact
                  />
                </div>
                <Link href={`/ride-notes/${featuredNote.slug}`}>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-emerald-950 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-lime-200 md:text-5xl">
                  {featuredNote.title}
                </h2>
                {featuredNote.excerpt && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
                    {featuredNote.excerpt}
                  </p>
                )}
                <p className="mt-5 text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {getNoteMeta(featuredNote).join(' / ')}
                </p>
                </Link>
              </div>
              <Link
                href={`/ride-notes/${featuredNote.slug}`}
                className="min-h-56 bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-300 dark:from-emerald-950 dark:via-slate-900 dark:to-emerald-800"
              >
                {featuredNote.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredNote.cover_image_url}
                    alt=""
                    className="h-full min-h-56 w-full object-cover"
                  />
                ) : null}
              </Link>
            </article>
          )}

          <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {restNotes.map((note) => (
              <article
                key={note.id}
                className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-lime-200">
                    {categoryLabels[note.category]}
                  </span>
                  <RideNoteShareButton
                    title={note.title}
                    url={absoluteUrl(`/ride-notes/${note.slug}`)}
                    compact
                  />
                </div>
                <Link href={`/ride-notes/${note.slug}`} className="block">
                  <h2 className="mt-2 line-clamp-2 text-xl font-black tracking-[-0.025em] text-emerald-950 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-lime-200">
                    {note.title}
                  </h2>
                  {note.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
                      {note.excerpt}
                    </p>
                  )}
                  <p className="mt-4 text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {getNoteMeta(note).join(' / ')}
                  </p>
                </Link>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
