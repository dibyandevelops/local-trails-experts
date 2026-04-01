'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm({
  embedded = false,
  notice: initialNotice = null,
  next = '/',
  onRegistered,
}: {
  embedded?: boolean;
  notice?: string | null;
  next?: string;
  onRegistered?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [acceptTerms, setAcceptTerms] = useState(false);

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
    if (!form.email.trim() || !form.phone.trim()) {
      return 'Email and phone number are required.';
    }
    if (!acceptTerms) {
      return 'Please accept the terms and privacy policy.';
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
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to register.');
      }

      setSuccess('Account created! You are now signed in.');
      try {
        localStorage.setItem('participant-onboarding-pending', '1');
      } catch {
        // ignore local storage issues
      }
      window.dispatchEvent(new Event('auth-changed'));
      onRegistered?.();
      setForm({
        email: '',
        password: '',
        phone: '',
      });
      router.push(next || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? '' : 'max-w-lg mx-auto'}>
      {!embedded && (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-4 py-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-hero-glow/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-hero-glow/30 blur-3xl" />
          <div className="relative">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Join
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Join the Adventure!
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Create your account in under a minute. We&apos;ll ask for the rest of your
              profile details after you sign in.
            </p>
            <div className="mt-3 flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              <span>• Save your favorite trails</span>
              <span>• Join expert-led rides and trainings</span>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4 dark:bg-slate-900 dark:border-slate-700"
      >
        {notice && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-200">
            {notice}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
              Phone number
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="+9779812345678"
              required
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
              Use international format (e.g., +977...).
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
            Create a strong password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="At least 8 characters with a number"
            required
          />
          <div className="mt-2 text-xs text-gray-600 space-y-1 dark:text-slate-300">
            <p className={passwordChecks.length ? 'text-green-700 dark:text-green-300' : ''}>
              At least 8 characters
            </p>
            <p className={passwordChecks.number ? 'text-green-700 dark:text-green-300' : ''}>
              Includes at least one number
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 dark:text-red-200 dark:bg-red-950/40 dark:border-red-900/40">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 dark:text-green-200 dark:bg-green-950/40 dark:border-green-900/40">
            {success}
          </p>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="accept-terms" className="text-xs leading-5">
            I agree to the{' '}
            <a href="/terms" className="font-semibold text-green-700 hover:underline">
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" className="font-semibold text-green-700 hover:underline">
              Privacy Policy
            </a>
            .
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(validateForm())}
          className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
        >
          {loading ? 'Creating account...' : 'Start My Adventure'}
        </button>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
          <span>or</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        </div>
        <a
          href={`/api/auth/google/start?next=${encodeURIComponent(next || '/trails')}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
          >
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
        </a>
        <button
          type="button"
          disabled
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500 opacity-80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="currentColor"
          >
            <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.8 3.7-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12z" />
          </svg>
          Continue with Facebook (Coming soon)
        </button>
        <p className="text-center text-xs text-gray-500 dark:text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(
                  new CustomEvent('open-login', {
                    detail: {
                      message: 'Sign in to continue.',
                      next,
                    },
                  })
                );
              } catch {
                router.push(`/?login=1&next=${encodeURIComponent(next || '/')}`);
              }
            }}
            className="font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}
