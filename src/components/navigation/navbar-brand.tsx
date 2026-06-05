import Image from 'next/image';
import Link from 'next/link';

export default function NavbarBrand() {
  return (
    <Link
      href="/home"
      className="inline-flex items-center gap-2 rounded-2xl py-1 pr-2 transition-opacity hover:opacity-95"
      aria-label="Go to LocoXperts home"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-sm ring-1 ring-white/60 sm:h-12 sm:w-12">
        <Image
          src="/icons/logo-transparent-source.png?v=20260604-lx"
          alt="LocoXperts logo"
          width={96}
          height={96}
          className="h-full w-full object-contain"
          priority
          unoptimized
        />
      </span>
      <span className="hidden text-sm font-black uppercase tracking-[0.22em] text-emerald-50 sm:inline">
        LocoXperts
      </span>
    </Link>
  );
}
