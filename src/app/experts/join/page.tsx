'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { loginUser } from '@/services/auth/auth.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { DEFAULT_LOCALE, localizePath, type Locale } from '@/i18n/config';
import { guideJoinCopy } from '@/i18n/guide-join';

export default function ExpertJoinPage() {
  return <GuideJoinPage locale={DEFAULT_LOCALE} />;
}

export function GuideJoinPage({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = guideJoinCopy[locale];
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
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
  const isExistingAccountApplication = Boolean(currentUser && currentUser.role === 'participant');

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setCity(currentUser.city || '');
    if (Array.isArray(currentUser.sports) && currentUser.sports.length > 0) {
      setSelectedSports(currentUser.sports);
    }
    if (currentUser.bio) {
      setCredentials(currentUser.bio);
    }
  }, [currentUser]);

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
      setErrorMessage(copy.acceptTermsError);
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
          email: currentUser?.email || email,
          phone,
          city,
          password: isExistingAccountApplication ? undefined : password,
          sports: selectedSports,
          credentials,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || copy.genericError);
        return;
      }

      if (isExistingAccountApplication) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.me });
        window.dispatchEvent(new Event('auth-changed'));
        router.push('/experts/me');
        return;
      }

      try {
        await loginUser({
          email,
          password,
        });
        window.dispatchEvent(new Event('auth-changed'));
        router.push('/trails');
      } catch (loginErr) {
        console.error('Auto-login failed after signup:', loginErr);
        // If auto-login fails, redirect to login page with a message
        router.push('/?login=1&message=signup-success&next=%2Ftrails');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(copy.genericError);
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
          language: locale,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || copy.bioError);
      }
      setCredentials((data?.bio || '').trim());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.bioError);
    } finally {
      setGeneratingBio(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
  const labelClass = 'block text-sm font-semibold text-gray-800 dark:text-slate-100';
  const helperClass = 'mt-1 text-xs text-gray-500 dark:text-slate-400';

  if (loadingUser) {
    return <div className="mx-auto max-w-5xl text-sm text-gray-600 dark:text-slate-300">{copy.checkingAccount}</div>;
  }

  if (currentUser?.role === 'expert' && !currentUser.is_verified_expert) {
    return (
      <ExpertStatusCard
        title={copy.pending.title}
        body={copy.pending.body}
        actionHref="/experts/me"
        actionLabel={copy.pending.action}
      />
    );
  }

  if (currentUser?.role === 'expert' && currentUser.is_verified_expert) {
    return (
      <ExpertStatusCard
        title={copy.verified.title}
        body={copy.verified.body}
        actionHref="/organizations/create"
        actionLabel={copy.verified.action}
      />
    );
  }

  if (currentUser?.role === 'admin') {
    return (
      <ExpertStatusCard
        title={copy.admin.title}
        body={copy.admin.body}
        actionHref={localizePath('/home', locale)}
        actionLabel={copy.admin.action}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="border-b border-gray-200 pb-5 dark:border-slate-800">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            {copy.hero.eyebrow}
          </p>
          <h1 className="text-balance text-3xl font-extrabold text-gray-950 dark:text-slate-50 sm:text-4xl">
            {copy.hero.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
            {copy.hero.description}
          </p>
          <p className="mt-2 max-w-2xl text-xs font-medium text-emerald-800 dark:text-emerald-200">
            {copy.hero.opportunity}
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-slate-50">
              {isExistingAccountApplication ? copy.form.existingTitle : copy.form.newTitle}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              {isExistingAccountApplication
                ? copy.form.existingDescription
                : copy.form.newDescription}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="guide-full-name" className={labelClass}>
                {copy.form.fullName} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="guide-full-name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder={copy.form.fullNamePlaceholder}
              />
            </div>
            <div>
              <label htmlFor="guide-email" className={labelClass}>
                {copy.form.email} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="guide-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isExistingAccountApplication}
                className={`${inputClass} mt-1`}
                placeholder={copy.form.emailPlaceholder}
              />
              {isExistingAccountApplication && (
                <p className={helperClass}>{copy.form.currentEmail}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="guide-phone" className={labelClass}>
                {copy.form.phone} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="guide-phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputClass} mt-1`}
                aria-describedby="guide-phone-help"
                placeholder={copy.form.phonePlaceholder}
              />
              <p id="guide-phone-help" className={helperClass}>{copy.form.phoneHelper}</p>
            </div>
            <div>
              <label htmlFor="guide-password" className={labelClass}>
                {copy.form.password} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="guide-password"
                name="password"
                type="password"
                required={!isExistingAccountApplication}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isExistingAccountApplication}
                className={`${inputClass} mt-1`}
                aria-describedby="guide-password-help"
                placeholder={isExistingAccountApplication ? copy.form.passwordExistingPlaceholder : copy.form.passwordPlaceholder}
              />
              <p id="guide-password-help" className={helperClass}>
                {isExistingAccountApplication
                  ? copy.form.passwordExistingHelper
                  : copy.form.passwordHelper}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="guide-home-city" className={labelClass}>{copy.form.homeCity}</label>
              <input
                id="guide-home-city"
                name="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder={copy.form.homeCityPlaceholder}
              />
            </div>

            <div>
              <div id="guide-activities-label" className={labelClass}>{copy.form.activities}</div>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="guide-activities-label">
                {TRAIL_SPORTS.map((sport) => {
                  const selected = selectedSports.includes(sport.value);
                  return (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => toggleSport(sport.value)}
                      aria-pressed={selected}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-slate-950'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-500'
                      }`}
                    >
                      {copy.sportLabels[sport.value] || sport.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label htmlFor="guide-experience" className={labelClass}>
                {copy.form.experience} <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBio}
                disabled={generatingBio}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950"
              >
                {generatingBio ? copy.form.generating : copy.form.generate}
              </button>
            </div>
            <textarea
              id="guide-experience"
              name="experience"
              required
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder={copy.form.experiencePlaceholder}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
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
              {copy.form.agreementPrefix}{' '}
              <a href={localizePath('/terms', locale)} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                {copy.form.terms}
              </a>{' '}
              {copy.form.and}{' '}
              <a href={localizePath('/privacy', locale)} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                {copy.form.privacy}
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
              {submitting ? copy.form.submitting : copy.form.submit}
            </button>
            <p className="max-w-md text-xs text-gray-500 dark:text-slate-400">
              {isExistingAccountApplication
                ? copy.form.existingSubmitNote
                : copy.form.newSubmitNote}
            </p>
          </div>
        </form>

        <aside className="text-sm text-gray-700 dark:text-slate-200">
          <div className="border-l-2 border-emerald-600 pl-4 dark:border-emerald-400">
            <h2 className="font-bold text-gray-950 dark:text-slate-50">{copy.beforeTitle}</h2>
            <ul className="mt-3 space-y-2 leading-6">
              {copy.beforeItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-800">
            <h2 className="font-bold text-gray-950 dark:text-slate-50">{copy.afterTitle}</h2>
            <ol className="mt-3 space-y-2 leading-6">
              {copy.afterItems.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
            </ol>
          </div>
        </aside>
      </section>

    </div>
  );
}

function ExpertStatusCard({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{body}</p>
        <Link href={actionHref} className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
