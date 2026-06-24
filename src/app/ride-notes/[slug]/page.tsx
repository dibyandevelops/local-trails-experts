import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicRideNoteBySlug, getRideNoteSeo, type RideNoteCategory } from '@/lib/data/public-ride-notes';
import { absoluteUrl, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';

type RideNotePageProps = {
  params: Promise<{ slug: string }>;
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
  return date.toLocaleDateString('en-NP', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: RideNotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const seo = await getRideNoteSeo(slug);
  if (!seo) {
    return {
      title: 'Ride Note',
      robots: { index: false, follow: false },
    };
  }

  const image = seo.image || DEFAULT_OG_IMAGE_PATH;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `/ride-notes/${seo.slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/ride-notes/${seo.slug}`,
      type: 'article',
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [absoluteUrl(image)],
    },
  };
}

export default async function RideNoteDetailPage({ params }: RideNotePageProps) {
  const { slug } = await params;
  const note = await getPublicRideNoteBySlug(slug);
  if (!note) notFound();

  const paragraphs = renderContent(note.content);
  const date = formatDate(note.published_at || note.created_at);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <article className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {note.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={note.cover_image_url}
            alt=""
            className="h-72 w-full object-cover md:h-96"
          />
        )}
        <div className="p-6 md:p-10">
          <Link
            href="/ride-notes"
            className="text-xs font-black text-emerald-800 underline decoration-2 underline-offset-4 hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
          >
            Ride Notes
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {categoryLabels[note.category]}
            </span>
            {date && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {date}
              </span>
            )}
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.045em] text-gray-950 dark:text-white md:text-6xl">
            {note.title}
          </h1>
          {note.excerpt && (
            <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600 dark:text-slate-300 md:text-lg">
              {note.excerpt}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {note.trail_name && (
              <Link
                href={`/trails/${note.trail_slug || note.trail_id}`}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
              >
                Trail: {note.trail_name}
              </Link>
            )}
            {note.expert_id && note.expert_name && (
              <Link
                href={`/experts/${note.expert_id}`}
                className="rounded-full border border-lime-200 bg-white px-3 py-1.5 font-semibold text-lime-800 hover:bg-lime-50 dark:border-lime-900/60 dark:bg-slate-900 dark:text-lime-200 dark:hover:bg-lime-950/40"
              >
                Expert: {note.expert_name}
              </Link>
            )}
          </div>

          <div className="mt-8 space-y-5 text-base leading-8 text-gray-700 dark:text-slate-200">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {note.trail_name && (
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                Planning this ride?
              </p>
              <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                Open the trail page for route details, ride support, and expert request options.
              </p>
              <Link
                href={`/trails/${note.trail_slug || note.trail_id}`}
                className="mt-4 inline-flex rounded-full bg-emerald-800 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 dark:bg-lime-300 dark:text-emerald-950 dark:hover:bg-lime-200"
              >
                Open trail
              </Link>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
