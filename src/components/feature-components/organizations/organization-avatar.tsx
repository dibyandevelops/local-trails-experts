type OrganizationAvatarProps = {
  name: string;
  logoUrl?: string | null;
  sizeClassName?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function OrganizationAvatar({
  name,
  logoUrl,
  sizeClassName = 'h-20 w-20',
}: OrganizationAvatarProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${sizeClassName} rounded-xl border border-emerald-200 bg-white object-cover dark:border-emerald-900/70 dark:bg-slate-900`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-lg font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100`}
      aria-label={`${name} logo placeholder`}
    >
      {getInitials(name) || name}
    </div>
  );
}
