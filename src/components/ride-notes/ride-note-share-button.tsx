'use client';

import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';

type RideNoteShareButtonProps = {
  title: string;
  url: string;
  compact?: boolean;
};

export default function RideNoteShareButton({
  title,
  url,
  compact = false,
}: RideNoteShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    if (url.startsWith('http')) return url;
    if (typeof window === 'undefined') return url;
    return new URL(url, window.location.origin).toString();
  }, [url]);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const shareLinks = [
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    setOpen((current) => !current);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setOpen(false);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleShare}
        className={
          compact
            ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white/90 text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-lime-200 dark:hover:bg-emerald-950/50'
            : 'inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-lime-200 dark:hover:bg-emerald-950/50'
        }
        aria-label={`Share ${title}`}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>Share</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950">
          {shareLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 font-semibold text-gray-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-950/40"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copyLink}
            className="block w-full rounded-lg px-3 py-2 text-left font-semibold text-gray-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-950/40"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
