'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { loginUser, requestPasswordReset } from '@/services/auth/auth.service';

interface ILoginComponentProps {
  embedded?: boolean;
  onLoggedIn?: () => void;
  onOpenRegister?: () => void;
  next?: string | null;
}

type ForgotPasswordForm = {
  identifier: string;
};

const LoginComponent: React.FunctionComponent<ILoginComponentProps> = (
  { embedded = false, onLoggedIn, onOpenRegister, next = null },
) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'login' | 'forgot'>('login');
  const errorRef = React.useRef<HTMLParagraphElement | null>(null);
  const {
    register,
    handleSubmit: handleForgotSubmit,
    setValue: setForgotValue,
    formState: { errors: forgotErrors },
  } = useForm<ForgotPasswordForm>({
    defaultValues: { identifier: '' },
  });

  React.useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  React.useEffect(() => {
    const message = searchParams?.get('message');
    setNotice(message ? decodeURIComponent(message) : null);
  }, [searchParams]);

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      window.dispatchEvent(new Event('auth-changed'));
      onLoggedIn?.();
      if (next) {
        router.push(next);
        return;
      }
      const resolvedRole = data.user.role || 'participant';
      if (resolvedRole === 'expert') {
        router.push(`/experts/${data.user.id}`);
      } else if (resolvedRole === 'participant') {
        router.push('/trails');
      } else {
        router.push('/admin');
      }
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || 'Login failed. Please try again.');
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (data) => {
      setError(null);
      setNotice(data.message || 'If an account exists, a password reset link has been sent.');
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || 'Failed to request password reset.');
    },
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = React.useCallback(
    (e) => {
      e.preventDefault();
      setError(null);

      if (!identifier.trim() || !password) {
        setError('Please enter your email or phone number and password to continue.');
        return;
      }

      loginMutation.mutate({
        identifier: identifier.trim(),
        password,
      });
    },
    [identifier, password, loginMutation],
  );

  const openForgotPassword = () => {
    setError(null);
    setNotice(null);
    setForgotValue('identifier', identifier.trim());
    setMode('forgot');
  };

  const backToLogin = () => {
    setError(null);
    setNotice(null);
    setMode('login');
  };

  const handleForgotPassword = handleForgotSubmit((values) => {
    setError(null);
    setNotice(null);
    forgotPasswordMutation.mutate(values.identifier.trim());
  });

  return (
    <div className="mx-auto max-w-lg">
      {!embedded && (
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-4 py-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-hero-glow/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-hero-glow/30 blur-3xl" />
          <div className="relative">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Sign in
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Login
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Sign in with your email or phone number.
            </p>
            <div className="mt-3 flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              <span>• Access trails and upcoming rides</span>
              <span>• Manage your profile and bookings</span>
            </div>
          </div>
        </div>
      )}
      {mode === 'forgot' ? (
        <form
          onSubmit={handleForgotPassword}
          className={
            embedded
              ? 'space-y-4'
              : 'space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900'
          }
          noValidate
        >
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-100">
            Enter your email or phone number. If we find an account, we&apos;ll send a secure reset link to its email address.
          </div>
          {notice && !error && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {notice}
            </div>
          )}
          <div>
            <label
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              htmlFor="forgot-identifier"
            >
              Email or phone number
            </label>
            <input
              id="forgot-identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or +9779812345678"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
              aria-invalid={!!forgotErrors.identifier || !!error}
              {...register('identifier', {
                required: 'Enter your email or phone number.',
                validate: (value) =>
                  value.trim().length > 0 || 'Enter your email or phone number.',
              })}
            />
            {forgotErrors.identifier?.message && (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">
                {forgotErrors.identifier.message}
              </p>
            )}
          </div>
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={forgotPasswordMutation.isPending}
            className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
          >
            {forgotPasswordMutation.isPending ? 'Sending reset link...' : 'Send reset link'}
          </button>
          <button
            type="button"
            onClick={backToLogin}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Back to login
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={
            embedded
              ? 'space-y-4'
              : 'space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900'
          }
          noValidate
        >
        {notice && !error && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
          >
            {notice}
          </div>
        )}
        <div>
          <label
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            htmlFor="email"
          >
            Email or phone number
          </label>
          <input
            type="text"
            name="identifier"
            id="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or +9779812345678"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
            required
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-28 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
              required
              autoComplete="current-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-300 dark:hover:bg-slate-700 dark:hover:text-green-200"
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>
        </div>

        {error && (
          <p
            id="login-error"
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={openForgotPassword}
            className="text-xs font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Login'}
        </button>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
          <span>or</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        </div>
        <Link
          href={`/api/auth/google/start?next=${encodeURIComponent(next || '/trails')}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.8-1.7 2.8-4.1 2.8-6.9 0-.7-.1-1.3-.2-1.9H12z"
            />
            <path
              fill="#34A853"
              d="M12 21c2.6 0 4.8-.9 6.4-2.3l-3-2.3c-.8.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3.3v2.6C4.9 18.8 8.1 21 12 21z"
            />
            <path
              fill="#4A90E2"
              d="M6.4 13.1c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V6.7H3.3C2.5 8.2 2 9.9 2 11.2s.5 3 1.3 4.5l3.1-2.6z"
            />
            <path
              fill="#FBBC05"
              d="M12 5.3c1.4 0 2.7.5 3.7 1.4l2.7-2.7C16.8 2.5 14.6 1.5 12 1.5c-3.9 0-7.1 2.2-8.7 5.2l3.1 2.6c.8-2.4 3-4.2 5.6-4.2z"
            />
          </svg>
          Continue with Google
        </Link>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Don&apos;t have a participant account?{' '}
          {onOpenRegister ? (
            <button
              type="button"
              onClick={onOpenRegister}
              className="font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              Join Adventure
            </button>
          ) : (
            <Link
              href="/register"
              className="font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              Join Adventure
            </Link>
          )}
        </p>
        </form>
      )}
    </div>
  );
};

export default LoginComponent;
