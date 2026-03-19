type VerificationDetailsContentProps = {
  yearsExperience?: string | null;
  certifications?: string | null;
  guidingHistory?: string | null;
  safetyTraining?: string | null;
  links?: string | null;
  emptyLabel?: string;
  className?: string;
};

export function hasVerificationDetails(input: {
  yearsExperience?: string | null;
  certifications?: string | null;
  guidingHistory?: string | null;
  safetyTraining?: string | null;
  links?: string | null;
}) {
  return Boolean(
    input.yearsExperience ||
      input.certifications ||
      input.guidingHistory ||
      input.safetyTraining ||
      input.links
  );
}

export default function VerificationDetailsContent({
  yearsExperience,
  certifications,
  guidingHistory,
  safetyTraining,
  links,
  emptyLabel = 'No verification details provided.',
  className = '',
}: VerificationDetailsContentProps) {
  const hasAny = hasVerificationDetails({
    yearsExperience,
    certifications,
    guidingHistory,
    safetyTraining,
    links,
  });

  if (!hasAny) {
    return <p className="text-sm text-gray-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${className}`}>
      {yearsExperience && (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">Experience</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-slate-100">{yearsExperience}</p>
        </div>
      )}
      {certifications && (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">Certifications</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-slate-100">{certifications}</p>
        </div>
      )}
      {guidingHistory && (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">Guiding History</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-slate-100">{guidingHistory}</p>
        </div>
      )}
      {safetyTraining && (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">Safety Training</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-slate-100">{safetyTraining}</p>
        </div>
      )}
      {links && (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">Links / Proof</p>
          <p className="mt-1 break-words text-sm text-gray-800 dark:text-slate-100">{links}</p>
        </div>
      )}
    </div>
  );
}
