type Props = {
  year: number;
  brand: string;
};

export default function FooterInfoColumn({ year, brand }: Props) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{brand}</p>
      <p className="max-w-sm text-xs leading-5 text-gray-600 dark:text-slate-300">
        Nepal Trail Hub: free trail maps, local experts, and community-led rides.
      </p>
      <p className="text-xs font-medium text-emerald-800/75 dark:text-emerald-200/75">
        Early access: LocoXperts is improving with every ride.
      </p>
      <ul className="space-y-0.5 text-xs leading-5 text-gray-600 dark:text-slate-300">
        <li>• Keep Nepal trails mapped and easier to navigate.</li>
        <li>• Fund trail maintenance, signage, and local trail crews.</li>
        <li>• Connect riders with verified local experts.</li>
        <li>• Support local tourism and trail communities.</li>
      </ul>
      <span
        className="inline-flex items-center rounded-full border border-emerald-300 bg-white/80 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        Built and maintained by LocoXperts Community
      </span>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        © {year} {brand}. All rights reserved.
      </p>
    </div>
  );
}
