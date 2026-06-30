import type { Metadata } from 'next';
import CreateOrganizationForm from '@/components/feature-components/organizations/create-organization-form';

export const metadata: Metadata = {
  title: 'Create an Organization',
  description: 'Create an organization workspace with an admin-verified expert account.',
};

export default function CreateOrganizationPage() {
  return <CreateOrganizationForm />;
}
