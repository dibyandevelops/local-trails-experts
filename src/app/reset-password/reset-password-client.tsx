'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { resetPassword } from '@/services/auth/auth.service';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: resetPassword,
  });

  const password = watch('password');

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ token, password: values.password });
  });

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Account recovery
          </p>
          <h1 className="mt-2 text-2xl font-black text-gray-950 dark:text-white">
            Reset your password
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
            Create a new password for your LocoXperts account. Reset links expire after 1 hour.
          </p>
        </div>

        <div className="p-6">
          {!token ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-100">
              This reset link is missing a token. Request a new password reset from the login modal.
            </div>
          ) : mutation.isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100">
                Password updated. You can now sign in with your new password.
              </div>
              <Link
                href="/?login=1&message=Password%20updated.%20Please%20sign%20in."
                className="inline-flex w-full items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
                  aria-invalid={!!errors.password}
                  {...register('password', {
                    required: 'Enter a new password.',
                    minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                    validate: (value) => /\d/.test(value) || 'Password must include at least one number.',
                  })}
                />
                {errors.password?.message && (
                  <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="confirm-password">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword', {
                    required: 'Confirm your new password.',
                    validate: (value) => value === password || 'Passwords do not match.',
                  })}
                />
                {errors.confirmPassword?.message && (
                  <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {mutation.isError && (
                <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {mutation.error instanceof Error ? mutation.error.message : 'Failed to reset password.'}
                </p>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
              >
                {mutation.isPending ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
