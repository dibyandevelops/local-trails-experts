'use client';

import type { FormEvent } from 'react';

type UnderlineSearchFormProps = {
  id: string;
  label: string;
  placeholder: string;
  buttonLabel?: string;
  action?: string;
  method?: 'get' | 'post';
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  className?: string;
};

export default function UnderlineSearchForm({
  id,
  label,
  placeholder,
  buttonLabel = 'Search',
  action,
  method = 'get',
  name = 'search',
  value,
  onChange,
  onSubmit,
  className = '',
}: UnderlineSearchFormProps) {
  return (
    <form
      action={action}
      method={method}
      onSubmit={onSubmit}
      className={`max-w-3xl border-b-2 border-emerald-950 bg-transparent pb-2 dark:border-lime-300 ${className}`}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          name={name}
          type="search"
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          placeholder={placeholder}
          className="min-h-[54px] w-full border-0 bg-transparent px-0 text-xl font-black text-gray-950 outline-none placeholder:text-gray-500 focus:ring-0 dark:text-slate-50 dark:placeholder:text-slate-500 md:text-2xl"
        />
        <button
          type="submit"
          className="justify-self-start pb-2 text-sm font-black text-emerald-950 underline decoration-2 underline-offset-4 transition hover:text-emerald-700 dark:text-lime-200 dark:hover:text-lime-100 md:justify-self-end"
        >
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}
