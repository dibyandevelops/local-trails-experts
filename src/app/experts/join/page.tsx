'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { loginUser } from '@/services/auth/auth.service';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

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

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-6 py-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-20 h-56 w-56 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative text-left">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              For Experts
            </span>
            {EXPERTS_BETA_ENABLED && (
              <span className="rounded-full border border-amber-300/80 bg-amber-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                Beta
              </span>
            )}
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Nepal
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Apply as a Local Expert
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            Share your local trail knowledge and host rides or training sessions.
          </p>
          {EXPERTS_BETA_ENABLED && (
            <p className="mt-2 max-w-2xl text-xs font-medium text-amber-700 dark:text-amber-300">
              Beta feature: workflows may change.
            </p>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-hero-border/70 bg-white/90 p-6 shadow-sm dark:bg-slate-900/80">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            Why apply for a <span className="text-hero-pill-text">Verified badge</span>?
          </h2>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-hero-pill-text" />
              <span>Show up clearly in expert search results.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-hero-pill-text" />
              <span>Build trust with riders and visitors.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-hero-pill-text" />
              <span>Get access to expert features as they roll out.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-green-900 to-emerald-950 p-6 text-white shadow-sm">
          <div>
            <h3 className="text-xl font-semibold mb-3">Who is this for?</h3>
            <p className="text-sm text-green-100 mb-4">
              This is for local guides and coaches who:
            </p>
            <ul className="space-y-2 text-sm text-green-100">
              <li>• Know local trails and weather conditions</li>
              <li>• Have guiding, coaching, or riding experience</li>
              <li>• Want to host rides or training sessions</li>
            </ul>
          </div>
          <p className="mt-6 text-xs text-green-200">
            Start with this form. We may ask for extra details before approval.
          </p>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Quick Expert Signup
          {EXPERTS_BETA_ENABLED && (
            <span className="ml-2 inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Beta
            </span>
          )}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Create your account in under a minute. You can complete verification details from your profile after signup.
        </p>
        {EXPERTS_BETA_ENABLED && (
          <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Experts onboarding is currently in beta. Applications are open, and review timelines may vary.
          </div>
        )}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          After signup, we will request a few additional verification details in your profile before approval.
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Suman Gurung"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+9779812345678"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use international format (e.g., +977...).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Min 8 characters with a number"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters and include a number.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home Base City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., your city in Nepal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sports you guide or coach
              </label>
              <div className="flex flex-wrap gap-2">
                {TRAIL_SPORTS.map((sport) => (
                  <button
                    key={sport.value}
                    type="button"
                    onClick={() => toggleSport(sport.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      selectedSports.includes(sport.value)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {sport.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700">
                Bio <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBio}
                disabled={generatingBio}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
              >
                {generatingBio ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <textarea
              required
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Tell about yourself."
            />
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Certificates are optional. Real riding experience and local route knowledge are enough to get started.
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
            <input
              id="expert-accept-terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="expert-accept-terms" className="text-xs leading-5">
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

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-green-700 text-white font-semibold text-sm shadow-sm hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : EXPERTS_BETA_ENABLED ? 'Submit Application (Beta)' : 'Submit Application'}
            </button>
            <p className="text-xs text-gray-500 max-w-md">
              Once registered, your profile and hosted events can display a
              <span className="inline-flex items-center ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold text-[11px]">
                Verified Expert
              </span>{' '}
              badge to participants.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
