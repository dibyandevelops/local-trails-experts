import type { Metadata } from 'next';
import { getExpertSeo } from '@/lib/data/public-experts';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

export async function generateMetadata(
  _props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await _props.params;
  try {
    const expert = await getExpertSeo(id);
    if (!expert) {
      return {
        title: 'Expert not found',
        robots: { index: false, follow: false },
      };
    }

    const displayName = (expert.name || 'Expert').trim();
    const title = `${displayName} — Expert`;
    const description =
      (expert.bio || '').trim() ||
      `View ${displayName}'s profile${expert.city ? ` in ${expert.city}` : ''}.`;

    // Keep expert profiles indexable even if not verified, but avoid rich claims in JSON-LD.
    return {
      title,
      description,
      keywords: [
        `${displayName} cycling expert`,
        `${expert.city || 'Kathmandu, Nepal'} local trail expert`,
        'Nepal MTB guide',
        'bike guide Nepal',
      ],
      alternates: { canonical: `/experts/${expert.id}` },
      openGraph: {
        title,
        description,
        url: `/experts/${expert.id}`,
        siteName: SITE_NAME,
        type: 'profile',
        images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
      },
    };
  } catch {
    return {
      title: 'Expert',
      description: DEFAULT_DESCRIPTION,
      alternates: { canonical: `/experts/${id}` },
    };
  }
}

export default async function ExpertLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  let expert: Awaited<ReturnType<typeof getExpertSeo>>;
  try {
    expert = await getExpertSeo(id);
  } catch {
    expert = null;
  }

  const expertUrl = absoluteUrl(`/experts/${id}`);
  const jsonLd =
    expert &&
    jsonLdStringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: expert.name || undefined,
      description: expert.bio || undefined,
      url: expertUrl,
      homeLocation: expert.city
        ? { '@type': 'Place', name: expert.city }
        : undefined,
    });

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {props.children}
    </>
  );
}
