'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { UserRole } from '@/types';
import { loginUser } from '@/services/auth/auth.service';

interface ILoginComponentProps {}

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
  props,
) => {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>('participant');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement | null>(null);

  React.useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      window.dispatchEvent(new Event('auth-changed'));
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
      <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
        <h1 className="text-2xl font-semibold text-gray-900">Login</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select your role and continue to your workspace.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            aria-required="true"
          >
            <option value="participant">Participant</option>
            <option value="expert">Expert</option>
            <option value="admin">Admin</option>
          </select>
          <p className="mt-1 text-xs text-gray-500" aria-live="polite">
            {roleMeta[role].hint} Redirects to <span className="font-semibold">{roleMeta[role].destination}</span>.
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            required
            autoComplete="email"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            required
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-xs font-medium text-green-700 hover:text-green-800"
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
          className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Login'}
        </button>
        <p className="text-center text-xs text-gray-500">
          Don&apos;t have a participant account?{' '}
          <Link href="/register" className="font-semibold text-green-700 hover:text-green-800">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginComponent;
