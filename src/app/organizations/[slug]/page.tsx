import OrganizationDetailClient from '@/components/feature-components/organizations/organization-detail-client';

export const dynamic = 'force-dynamic';

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OrganizationDetailClient slug={slug} />;
}
