import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RideNoteChecklist from '@/components/ride-notes/ride-note-checklist';
import RideNoteShareButton from '@/components/ride-notes/ride-note-share-button';
import { getPublicRideNoteBySlug, getRideNoteSeo, type RideNoteCategory } from '@/lib/data/public-ride-notes';
import { jsonLdStringify } from '@/lib/jsonld';
import { absoluteUrl, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';

type RideNotePageProps = {
  params: Promise<{ slug: string }>;
};

type RideNoteContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'checklist'; sections: RideNoteChecklistSection[] };

type RideNoteChecklistSection = {
  heading: string | null;
  description: string | null;
  items: string[];
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
  const blocks = content
    .split(/\n{2,}/)
    .map((block): RideNoteContentBlock | RideNoteChecklistSection | null => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) return null;

      const heading = lines[0].endsWith(':') && !lines[0].startsWith('- ')
        ? lines[0].replace(/:$/, '')
        : null;
      const blockLines = heading ? lines.slice(1) : lines;
      const firstListIndex = blockLines.findIndex((line) => line.startsWith('- '));
      const descriptionLines = firstListIndex > 0 ? blockLines.slice(0, firstListIndex) : [];
      const listLines = firstListIndex >= 0 ? blockLines.slice(firstListIndex) : blockLines;
      const items = listLines
        .filter((line) => line.startsWith('- '))
        .map((line) => line.replace(/^- /, '').trim())
        .filter(Boolean);

      if (items.length > 0 && items.length === listLines.length) {
        return {
          heading,
          description: descriptionLines.length > 0 ? descriptionLines.join(' ') : null,
          items,
        };
      }

      return { type: 'paragraph', text: lines.join(' ') };
    })
    .filter((block): block is RideNoteContentBlock | RideNoteChecklistSection => block !== null);

  return blocks.reduce<RideNoteContentBlock[]>((accumulator, block) => {
    if ('items' in block) {
      const previousBlock = accumulator[accumulator.length - 1];
      if (previousBlock?.type === 'checklist') {
        previousBlock.sections.push(block);
        return accumulator;
      }
      accumulator.push({ type: 'checklist', sections: [block] });
      return accumulator;
    }

    accumulator.push(block);
    return accumulator;
  }, []);
}

function getNoteDescription(excerpt: string | null, content: string) {
  const source = (excerpt || content).replace(/\s+/g, ' ').trim();
  if (source.length <= 160) return source;
  return `${source.slice(0, 157).replace(/\s+\S*$/, '')}...`;
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
  const authorName = seo.expert_name || seo.author_name || seo.organization_name || SITE_NAME;
  const categoryLabel = categoryLabels[seo.category];
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `/ride-notes/${seo.slug}` },
    authors: [{ name: authorName }],
    keywords: [
      seo.title,
      categoryLabel,
      'Nepal cycling',
      'Nepal mountain biking',
      'Kathmandu MTB trails',
      'local cycling guides Nepal',
      'LocoXperts ride notes',
      seo.trail_name,
      seo.trail_location,
    ].filter(Boolean) as string[],
    robots: { index: true, follow: true },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/ride-notes/${seo.slug}`,
      type: 'article',
      publishedTime: seo.published_at || seo.created_at,
      modifiedTime: seo.updated_at || seo.published_at || seo.created_at,
      authors: [authorName],
      section: categoryLabel,
      tags: ['cycling', 'mountain biking', 'Nepal', categoryLabel, seo.trail_name].filter(Boolean) as string[],
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
  const canonicalUrl = absoluteUrl(`/ride-notes/${note.slug}`);
  const imageUrl = absoluteUrl(note.cover_image_url || DEFAULT_OG_IMAGE_PATH);
  const description = getNoteDescription(note.excerpt, note.content);
  const authorName = note.expert_name || note.author_name || note.organization_name || SITE_NAME;
  const articleJsonLd = jsonLdStringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: note.title,
    description,
    image: imageUrl,
    datePublished: note.published_at || note.created_at,
    dateModified: note.updated_at || note.published_at || note.created_at,
    author: {
      '@type': note.organization_name && !note.expert_name ? 'Organization' : 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/home'),
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/icons/logo-transparent-source.png'),
      },
    },
    mainEntityOfPage: canonicalUrl,
    articleSection: categoryLabels[note.category],
    about: [note.trail_name, note.trail_location, 'Mountain biking in Nepal'].filter(Boolean),
  });
  const breadcrumbJsonLd = jsonLdStringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: absoluteUrl('/home'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Ride Notes',
        item: absoluteUrl('/ride-notes'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: note.title,
        item: canonicalUrl,
      },
    ],
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <article className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.045em] text-emerald-950 dark:text-white md:text-6xl">
              {note.title}
            </h1>
            <RideNoteShareButton
              title={note.title}
              url={absoluteUrl(`/ride-notes/${note.slug}`)}
            />
          </div>
          {note.excerpt && (
            <p className="mt-5 max-w-3xl text-base leading-7 text-emerald-950/70 dark:text-slate-300 md:text-lg">
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
            {paragraphs.map((block, index) => {
              if (block.type === 'checklist') {
                return (
                  <RideNoteChecklist
                    key={index}
                    title={note.title}
                    sections={block.sections}
                  />
                );
              }

              return <p key={index}>{block.text}</p>;
            })}
          </div>

          {note.trail_name && (
            <div className="mt-10 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-950">
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
    </div>
  );
}
