'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { UserRole } from '@/types';
import { loginUser } from '@/services/auth/auth.service';
import { ApiPath } from '@/services/api/paths';

interface ILoginComponentProps {
  initialRole?: UserRole;
  embedded?: boolean;
  onLoggedIn?: () => void;
  next?: string | null;
}

const roleMeta: Record<UserRole, { label: string; destination: string; hint: string }> = {
  participant: {
    label: 'Participant',
    destination: '/trails',
    hint: 'Join and manage your trail events.',
  },
  expert: {
    label: 'Expert',
    destination: '/experts/:id',
    hint: 'Create events and manage hosted activities.',
  },
  admin: {
    label: 'Admin',
    destination: '/admin',
    hint: 'Review applications and manage the platform.',
  },
};

const LoginComponent: React.FunctionComponent<ILoginComponentProps> = (
  { initialRole = 'participant', embedded = false, onLoggedIn, next = null },
) => {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>(initialRole);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement | null>(null);

  React.useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  React.useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      window.dispatchEvent(new Event('auth-changed'));
      onLoggedIn?.();
      if (next) {
        router.push(next);
        return;
      }
      if (role === 'expert') {
        router.push(`/experts/${data.user.id}`);
      } else if (role === 'participant') {
        router.push('/trails');
      } else {
        router.push('/admin');
      }
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || 'Login failed. Please try again.');
    },
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = React.useCallback(
    (e) => {
      e.preventDefault();
      setError(null);

      if (!email.trim() || !password) {
        setError('Please enter your email and password to continue.');
        return;
      }

      loginMutation.mutate({
        email: email.trim(),
        role,
        password,
      });
    },
    [email, password, role, loginMutation],
  );

  return (
    <div className="mx-auto max-w-lg">
      {!embedded && (
        <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 dark:border-green-900/70 dark:bg-green-950/40">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Login
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Select your role and continue to your workspace.
          </p>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        noValidate
      >
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Role
          </legend>
          <div
            role="radiogroup"
            aria-label="Role"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {(Object.keys(roleMeta) as UserRole[]).map((roleKey) => {
              const selected = roleKey === role;
              return (
                <button
                  key={roleKey}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(roleKey)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? 'border-green-700 bg-green-100 text-green-900 dark:border-green-500 dark:bg-green-500/20 dark:text-green-200'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {roleMeta[roleKey].label}
                </button>
              );
            })}
          </div>
          <p
            className="mt-2 text-xs text-gray-500 dark:text-gray-400"
            aria-live="polite"
          >
            {roleMeta[role].hint} Redirects to{' '}
            <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 font-semibold text-green-700 dark:border-green-900 dark:bg-green-900/40 dark:text-green-300">
              {roleMeta[role].destination}
            </span>
            .
          </p>
        </fieldset>

        <div>
          <label
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            htmlFor="email"
          >
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
            required
            autoComplete="email"
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
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-slate-400"
            required
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-xs font-medium text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
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

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Login'}
        </button>
        {role === 'participant' && (
          <Link
            href={`/api/auth/google/start?mode=login&next=${encodeURIComponent(next || '/trails')}`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Continue with Google (Participants)
          </Link>
        )}
        {role === 'expert' && (
          <Link
            href={`${ApiPath.StravaAuthorize}?mode=login`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/50"
          >
            Connect with Strava (Experts)
          </Link>
        )}
        {!embedded && role === 'participant' && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Don&apos;t have a participant account?{' '}
            <Link
              href="/register"
              className="font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              Join Experts
            </Link>
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginComponent;
