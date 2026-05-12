type Props = {
  year: number;
  brand: string;
};

export default function FooterInfoColumn({ year, brand }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{brand}</p>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        Nepal Trail Hub: free trail maps, local experts, and community-led rides.
      </p>
      <ul className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
        <li>• Keep Nepal trails mapped and easier to navigate.</li>
        <li>• Fund trail maintenance, signage, and local trail crews.</li>
        <li>• Connect riders with verified local experts.</li>
        <li>• Support local tourism and trail communities.</li>
      </ul>
      <a
        href="https://dibyan.com.np"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center rounded-full border border-emerald-300 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        Built and maintained by Dibyan
      </a>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        © {year} {brand}. All rights reserved. {brand} are trademarks or registered trademarks of
        their respective owners.
      </p>
    </div>
  );
}
