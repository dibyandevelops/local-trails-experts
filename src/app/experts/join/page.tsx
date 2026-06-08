'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { loginUser } from '@/services/auth/auth.service';

export default function ExpertJoinPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>(['mtb']);
  const [credentials, setCredentials] = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const toggleSport = (value: string) => {
    setSelectedSports((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setErrorMessage('Please accept the terms and privacy policy.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/experts/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          city,
          password,
          sports: selectedSports,
          credentials,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit application');
        return;
      }

      // After successful signup, automatically log in the user
      try {
        await loginUser({
          email,
          password,
        });

        // Dispatch auth changed event to update UI
        window.dispatchEvent(new Event('auth-changed'));

        // Redirect to trails page
        router.push('/trails');
      } catch (loginErr) {
        console.error('Auto-login failed after signup:', loginErr);
        // If auto-login fails, redirect to login page with a message
        router.push('/?login=1&message=signup-success&next=%2Ftrails');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/ai/expert-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city,
          sports: selectedSports,
          language:
            typeof navigator !== 'undefined'
              ? navigator.language || 'en'
              : 'en',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate bio');
      }
      setCredentials((data?.bio || '').trim());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate bio.');
    } finally {
      setGeneratingBio(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
  const labelClass = 'block text-sm font-semibold text-gray-800 dark:text-slate-100';
  const helperClass = 'mt-1 text-xs text-gray-500 dark:text-slate-400';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-6 dark:border-emerald-800/50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/40 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Local Experts
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-950 dark:text-slate-50 sm:text-4xl">
            Apply as a local trail expert
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
            Create an expert profile for guiding, coaching, route advice, and hosted rides around Nepal.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-slate-50">
              Expert signup
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Fill in the essentials now. Verification details can be completed after signup.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="e.g., Suman Gurung"
              />
            </div>
            <div>
              <label className={labelClass}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="+9779812345678"
              />
              <p className={helperClass}>Use international format, e.g. +977...</p>
            </div>
            <div>
              <label className={labelClass}>
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="Min 8 characters with a number"
              />
              <p className={helperClass}>At least 8 characters and one number.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Home base city</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="e.g., Kathmandu"
              />
            </div>

            <div>
              <label className={labelClass}>Sports you guide or coach</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRAIL_SPORTS.map((sport) => {
                  const selected = selectedSports.includes(sport.value);
                  return (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => toggleSport(sport.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-slate-950'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-500'
                      }`}
                    >
                      {sport.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className={labelClass}>
                Bio <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBio}
                disabled={generatingBio}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950"
              >
                {generatingBio ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <textarea
              required
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder="Tell riders about your local trail knowledge, guiding experience, and riding style."
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {errorMessage}
            </p>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
            <input
              id="expert-accept-terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="expert-accept-terms" className="text-xs leading-5">
              I agree to the{' '}
              <a href="/terms" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                Privacy Policy
              </a>
              .
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
            <p className="max-w-md text-xs text-gray-500 dark:text-slate-400">
              After signup, continue verification from your expert profile.
            </p>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-emerald-900/20 bg-emerald-950 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Who this is for
            </p>
            <h2 className="mt-2 text-xl font-bold">Guides, coaches, and local riders</h2>
            <ul className="mt-4 space-y-3 text-sm text-emerald-50">
              <li>Know local trails, conditions, and route choices.</li>
              <li>Can support riders with guided rides or training.</li>
              <li>Want a verified profile for events and requests.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
            <h3 className="font-semibold text-gray-950 dark:text-slate-50">What happens next</h3>
            <ol className="mt-3 space-y-2">
              <li>1. Your expert account is created.</li>
              <li>2. Add verification details from your profile.</li>
              <li>3. Once approved, riders can discover and contact you.</li>
            </ol>
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              Certificates are optional. Real riding experience and local route knowledge are enough to get started.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
