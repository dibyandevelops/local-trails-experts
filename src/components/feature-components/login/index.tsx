'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { UserRole } from '@/types';
import { loginUser } from '@/services/auth/auth.service';

interface ILoginComponentProps {}

const LoginComponent: React.FunctionComponent<ILoginComponentProps> = (
  props,
) => {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>('participant');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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
    <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Login</h1>
      <p className="text-sm text-gray-600 mb-6">
        Choose your role to access your dashboard.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            type="password"
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
          className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginComponent;
