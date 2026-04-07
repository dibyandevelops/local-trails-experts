'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export type ThemedDropdownItem = {
  label: string;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  separatorBefore?: boolean;
};

type ThemedDropdownProps = {
  label: string;
  items: ThemedDropdownItem[];
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
};

export default function ThemedDropdown({
  label,
  items,
  align = 'end',
  triggerClassName,
}: ThemedDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold leading-none text-white shadow-sm transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800 ${
            triggerClassName || ''
          }`}
        >
          {label}
          <span aria-hidden="true" className="translate-y-[0.5px] text-xs opacity-80">
            ▾
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className="z-50 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl ring-1 ring-black/5 dark:border-emerald-900/60 dark:bg-slate-900 dark:ring-0"
        >
          {items.map((item) => {
            const commonClass =
              'block w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm leading-tight text-gray-700 outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 dark:text-slate-200 dark:data-[highlighted]:bg-emerald-900/30 dark:data-[highlighted]:text-emerald-100';
            const toneClass =
              item.tone === 'danger'
                ? 'text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-800 dark:text-red-300 dark:data-[highlighted]:bg-red-950/40 dark:data-[highlighted]:text-red-200'
                : '';
            const itemClass = `${commonClass} ${toneClass}`.trim();

            if (item.href) {
              return (
                <React.Fragment key={item.label}>
                  {item.separatorBefore ? (
                    <DropdownMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-slate-700" />
                  ) : null}
                  <DropdownMenu.Item asChild disabled={item.disabled}>
                    <a href={item.href} className={itemClass}>
                      {item.label}
                    </a>
                  </DropdownMenu.Item>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={item.label}>
                {item.separatorBefore ? (
                  <DropdownMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-slate-700" />
                ) : null}
                <DropdownMenu.Item
                  disabled={item.disabled}
                  onSelect={() => item.onSelect?.()}
                  className={itemClass}
                >
                  {item.label}
                </DropdownMenu.Item>
              </React.Fragment>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
