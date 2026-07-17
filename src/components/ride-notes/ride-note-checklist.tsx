'use client';

import { useMemo, useState } from 'react';
import { Printer, RotateCcw } from 'lucide-react';

type RideNoteChecklistProps = {
  title: string;
  sections: RideNoteChecklistSection[];
};

type RideNoteChecklistSection = {
  heading: string | null;
  description: string | null;
  items: string[];
};

export default function RideNoteChecklist({ title, sections }: RideNoteChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const checklistId = useMemo(
    () => `${title}-checklist`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    [title]
  );
  const totalCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  const completedCount = sections.reduce(
    (sum, section) => sum + section.items.filter((item) => checkedItems[`${section.heading || 'checklist'}:${item}`]).length,
    0
  );

  const toggleItem = (key: string) => {
    setCheckedItems((current) => ({ ...current, [key]: !current[key] }));
  };

  const resetChecklist = () => {
    setCheckedItems({});
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const printChecklist = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rows = sections
      .map((section) => {
        const sectionRows = section.items
          .map((item) => {
            const itemKey = `${section.heading || 'checklist'}:${item}`;
            const isChecked = checkedItems[itemKey];
            return `
              <li>
                <span class="box">${isChecked ? '&#10003;' : ''}</span>
                <span>${escapeHtml(item)}</span>
              </li>
            `;
          })
          .join('');

        return `
          <section>
            ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}
            ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ''}
            <ul>${sectionRows}</ul>
          </section>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)} checklist</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              color: #111827;
              font-family: Arial, sans-serif;
            }
            main {
              max-width: 760px;
              margin: 0 auto;
            }
            h1 {
              margin: 0;
              font-size: 24px;
              line-height: 1.2;
            }
            p {
              margin: 8px 0 24px;
              color: #4b5563;
              font-size: 14px;
            }
            section {
              margin-top: 22px;
              break-inside: avoid;
            }
            h2 {
              margin: 0 0 4px;
              font-size: 16px;
              line-height: 1.3;
            }
            .section-description {
              margin: 0 0 10px;
              color: #4b5563;
              font-size: 13px;
            }
            ul {
              display: grid;
              gap: 10px;
              margin: 0;
              padding: 0;
              list-style: none;
            }
            li {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              min-height: 28px;
              font-size: 15px;
              line-height: 1.45;
            }
            .box {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              margin-top: 1px;
              border: 2px solid #111827;
              font-size: 13px;
              font-weight: 700;
              line-height: 1;
            }
            @media print {
              body { padding: 20mm; }
            }
          </style>
        </head>
        <body>
          <main>
            <h1>${escapeHtml(title)} checklist</h1>
            <p>${completedCount} of ${totalCount} checked</p>
            ${rows}
          </main>
          <script>
            window.addEventListener('load', () => {
              window.print();
              window.setTimeout(() => window.close(), 250);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <section
      id={checklistId}
      className="ride-note-checklist rounded-2xl border border-emerald-100 bg-emerald-50/45 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20 print:border-gray-300 print:bg-white print:p-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-900 dark:text-lime-100 print:text-black">
            Printable checklist
          </h2>
          <p className="mt-1 text-xs font-semibold text-emerald-900/70 dark:text-slate-300 print:text-gray-700">
            {completedCount} of {totalCount} checked
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={resetChecklist}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-lime-200 dark:hover:bg-emerald-950/50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            onClick={printChecklist}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 dark:bg-lime-300 dark:text-emerald-950 dark:hover:bg-lime-200"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {sections.map((section) => (
          <section key={section.heading || section.items.join('-')}>
            {section.heading && (
              <h3 className="text-sm font-black text-emerald-950 dark:text-lime-100">
                {section.heading}
              </h3>
            )}
            {section.description && (
              <p className="mt-1 text-sm font-medium leading-6 text-emerald-950/70 dark:text-slate-300">
                {section.description}
              </p>
            )}
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-emerald-950/80 dark:text-slate-200 sm:grid-cols-2 print:grid-cols-1 print:text-black">
              {section.items.map((item) => {
                const itemKey = `${section.heading || 'checklist'}:${item}`;
                const inputId = `${checklistId}-${itemKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                return (
                  <li key={itemKey}>
                    <label
                      htmlFor={inputId}
                      className="flex cursor-pointer gap-3 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-emerald-100 hover:bg-white/70 dark:hover:border-emerald-900/50 dark:hover:bg-slate-950/40 print:border-0 print:px-0"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={Boolean(checkedItems[itemKey])}
                        onChange={() => toggleItem(itemKey)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600 print:h-5 print:w-5"
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
