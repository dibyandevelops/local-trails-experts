import { COMMUNITY_NAME } from '@/lib/branding';

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
      <p className="text-xs text-emerald-700 dark:text-emerald-200">Built with {COMMUNITY_NAME}.</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        © {year} {brand}. All rights reserved. {brand} are trademarks or registered trademarks of
        their respective owners.
      </p>
    </div>
  );
}

