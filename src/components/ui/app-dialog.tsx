import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClassName?: string;
  contentClassName?: string;
};

export default function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidthClassName = 'max-w-lg',
  contentClassName = '',
}: AppDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          className={`fixed inset-x-2 bottom-2 top-2 z-50 flex min-h-0 w-auto flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[88vh] sm:w-[94vw] ${maxWidthClassName} sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl ${contentClassName}`}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-700 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close dialog"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
