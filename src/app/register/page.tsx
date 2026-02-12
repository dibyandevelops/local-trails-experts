'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SportType } from '@/types';

const sportOptions: { value: SportType; label: string }[] = [
  { value: 'mtb', label: 'MTB Trail Rides' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'trail_running', label: 'Trail Running' },
  { value: 'training', label: 'Training & Coaching' },
  { value: 'local_tour', label: 'Local Tours' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    sports: [] as SportType[],
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordChecks = useMemo(
    () => ({
      length: form.password.length >= 8,
      number: /\d/.test(form.password),
    }),
    [form.password]
  );

  const validatePassword = () => {
    if (!passwordChecks.length) return 'Password must be at least 8 characters.';
    if (!passwordChecks.number) return 'Password must include at least one number.';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const pwdError = validatePassword();
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Full name, email, and phone number are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            sports: form.sports,
            password: form.password,
            phone: form.phone.trim(),
          }),
        });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to register.');
      }

      setSuccess('Account created! You are now signed in.');
      window.dispatchEvent(new Event('auth-changed'));
      setForm({ name: '', email: '', sports: [], password: '', phone: '' });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Participant Registration
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Create a participant account to join events and save your profile.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone number
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="+9779812345678"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Use international format (e.g., +977...).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sports
          </label>
          <div className="flex flex-wrap gap-2">
            {sportOptions.map((sport) => {
              const selected = form.sports.includes(sport.value);
              return (
                <button
                  key={sport.value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      sports: selected
                        ? prev.sports.filter((value) => value !== sport.value)
                        : [...prev.sports, sport.value],
                    }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    selected
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-600'
                  }`}
                >
                  {sport.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pick all that apply.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="At least 8 characters with a number"
            required
          />
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <p className={passwordChecks.length ? 'text-green-700' : ''}>
              • At least 8 characters
            </p>
            <p className={passwordChecks.number ? 'text-green-700' : ''}>
              • Includes at least one number
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </div>
  );
}
