'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SportType } from '@/types';
import { TRAIL_SPORTS } from '@/services/constants/sports';

export default function RegisterPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
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
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const url = new URL(window.location.href);
      const msg = url.searchParams.get('message');
      if (msg) {
        setNotice(msg);
        url.searchParams.delete('message');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // ignore
    }
  }, []);

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

  const validateForm = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      return 'Full name, email, and phone number are required.';
    }
    if (form.sports.length === 0) {
      return 'Please select at least one sport.';
    }
    return validatePassword();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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

  if (!mounted) {
    return <div className="max-w-lg mx-auto" />;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-4xl font-bold mb-2 text-green-800">
        Join the Adventure! 🚵
      </h1>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        Create your free account to unlock epic trails, connect with verified guides and coaches,
        save your favorite spots, and never miss an event. Your next great outdoor experience starts here!
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4"
      >
        {notice && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Dibyan Shrestha"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+9779812345678"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use international format (e.g., +977...).
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Choose Your Sports 🎯
          </label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">
                Pick your adventure style — you can always change these later!
              </p>
              <p className="text-xs font-semibold text-gray-700">
                {form.sports.length} selected
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAIL_SPORTS.map((sport) => {
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
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pick at least one sport.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Create a Strong Password 🔐
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="At least 8 characters with a number"
            required
          />
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <p className={passwordChecks.length ? 'text-green-700' : ''}>
              ✅ At least 8 characters
            </p>
            <p className={passwordChecks.number ? 'text-green-700' : ''}>
              ✅ Includes at least one number
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
          disabled={loading || Boolean(validateForm())}
          className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Start My Adventure! 🌟'}
        </button>
      </form>
    </div>
  );
}
