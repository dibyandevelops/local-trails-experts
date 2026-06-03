import type { OrganizationGalleryItem } from './hooks/use-organization-detail';

export default function OrganizationGallerySection({
  items,
  organizationName,
}: {
  items: OrganizationGalleryItem[];
  organizationName: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gallery</h2>
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {items.length}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.caption || `${organizationName} gallery`}
              className="h-44 w-full object-cover"
            />
            {item.caption && (
              <p className="p-3 text-xs text-gray-700 dark:text-slate-300">{item.caption}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
