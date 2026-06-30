import { getServiceCategoryLabel } from '@/services/constants/organization-services';
import type { OrganizationService } from './hooks/use-organization-detail';
import ServiceBookingButton from './service-booking-button';

export default function OrganizationServicesSection({
  services,
  organizationName,
}: {
  services: OrganizationService[];
  organizationName?: string | null;
}) {
  if (!services.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Services</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <article key={service.id} className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{getServiceCategoryLabel(service.category)}</p>
            <h3 className="mt-1 font-bold text-gray-950 dark:text-white">{service.title}</h3>
            {service.description && <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-slate-300">{service.description}</p>}
            <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-slate-100">{service.price_npr !== null ? `From NPR ${Number(service.price_npr).toLocaleString()}` : service.price_note || 'Contact for pricing'}</p>
            {service.location && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{service.location}</p>}
            <div className="mt-4">
              <ServiceBookingButton
                serviceId={service.id}
                serviceTitle={service.title}
                organizationName={organizationName}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
