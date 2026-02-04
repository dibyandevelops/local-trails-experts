'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types';

interface ILoginComponentProps {}

const LoginComponent: React.FunctionComponent<ILoginComponentProps> = (
  props,
) => {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>('participant');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = React.useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);

      if (role !== 'participant' && !email.trim()) {
        setError('Please enter your email to continue.');
        return;
      }

      if (role === 'participant') {
        router.push('/trails');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            role,
            password: password || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data?.error || 'Login failed. Please try again.');
          return;
        }

        if (role === 'expert') {
          router.push(`/experts/${data.user.id}`);
        } else {
          router.push('/admin');
        }
      } catch (err) {
        console.error('Login error', err);
        setError('Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [email, password, role, router],
  )

  return (
    <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Login</h1>
      <p className="text-sm text-gray-600 mb-6">
        Choose your role to access your dashboard.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          >
            <option value="participant">Participant</option>
            <option value="expert">Expert</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === 'participant' ? 'Optional for participants' : 'you@example.com'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Not enforced yet"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginComponent;
