'use client';

import * as React from 'react';

type WeatherForecastProps = {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
};

type ForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
  } | null;
};

function getWeatherSummary(code: number) {
  if (code === 0) return { label: 'Clear', icon: '☀' };
  if (code <= 3) return { label: 'Partly cloudy', icon: '⛅' };
  if (code <= 48) return { label: 'Misty', icon: '〰' };
  if (code <= 57 || (code >= 80 && code <= 82)) return { label: 'Showers', icon: '☂' };
  if (code <= 67 || code >= 95) return { label: 'Rain likely', icon: '☔' };
  if (code <= 77) return { label: 'Wintry weather', icon: '❄' };
  return { label: 'Mixed conditions', icon: '🌦' };
}

function getRideNote(code: number, rain: number, wind: number) {
  if (rain >= 60 || code >= 80) return 'Carry a rain layer and expect slippery sections.';
  if (wind >= 30) return 'Allow extra time on exposed or ridgeline sections.';
  if (rain >= 30) return 'A light rain layer is worth carrying.';
  if (code === 0 || code <= 3) return 'Good conditions for a planned trail ride.';
  return 'Ride normally and check local conditions before starting.';
}

function getTrailCondition(code: number, rain: number, wind: number) {
  if (rain >= 60 || code >= 80) {
    return {
      label: 'Wet and slippery likely',
      detail: 'Use extra care on roots, rocks, and descents.',
      className: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-50',
    };
  }
  if (wind >= 30) {
    return {
      label: 'Wind may affect exposed sections',
      detail: 'Check the route before leaving and ride within your limits.',
      className: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-50',
    };
  }
  return {
    label: 'Generally suitable for riding',
    detail: 'Weather can change in the hills, so check again before you leave.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-50',
  };
}

export default function TrailWeatherForecast({ latitude, longitude }: WeatherForecastProps) {
  const [forecast, setForecast] = React.useState<ForecastResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const numericLatitude = latitude === null || latitude === undefined ? Number.NaN : Number(latitude);
  const numericLongitude = longitude === null || longitude === undefined ? Number.NaN : Number(longitude);
  const coordinates =
    Number.isFinite(numericLatitude) &&
    Number.isFinite(numericLongitude) &&
    numericLatitude >= -90 &&
    numericLatitude <= 90 &&
    numericLongitude >= -180 &&
    numericLongitude <= 180;
  const validCoordinates = coordinates
    ? { latitude: numericLatitude, longitude: numericLongitude }
    : null;

  React.useEffect(() => {
    if (!validCoordinates) return;
    const controller = new AbortController();
    setForecast(null);
    setError(null);

    fetch(`/api/weather/forecast?latitude=${encodeURIComponent(validCoordinates.latitude)}&longitude=${encodeURIComponent(validCoordinates.longitude)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as ForecastResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || 'Weather unavailable.');
        return data;
      })
      .then(setForecast)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Weather unavailable.');
      });

    return () => controller.abort();
  }, [validCoordinates?.latitude, validCoordinates?.longitude]);

  if (!validCoordinates) return null;

  const daily = forecast?.daily;
  const days = daily?.time || [];
  const todayCode = daily?.weather_code?.[0] ?? 0;
  const todayRain = daily?.precipitation_probability_max?.[0] ?? 0;
  const todayWind = daily?.wind_speed_10m_max?.[0] ?? 0;
  const trailCondition = getTrailCondition(todayCode, todayRain, todayWind);

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Ride planning</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Trail weather</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">Next 5 days</p>
      </div>
      {forecast && days.length > 0 && (
        <div className={`mt-4 rounded-xl border p-3 ${trailCondition.className}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Trail conditions</p>
          <p className="mt-1 text-sm font-bold">{trailCondition.label}</p>
          <p className="mt-1 text-xs">{trailCondition.detail}</p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{error}</p>}
      {!forecast && !error && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading forecast...</p>}
      {forecast && days.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Weather forecast</p>
          {days.map((date, index) => {
            const summary = getWeatherSummary(daily?.weather_code?.[index] ?? 0);
            const high = daily?.temperature_2m_max?.[index];
            const low = daily?.temperature_2m_min?.[index];
            const rain = daily?.precipitation_probability_max?.[index];
            const wind = daily?.wind_speed_10m_max?.[index] ?? 0;
            return (
              <article key={date} className="grid grid-cols-[4.5rem_2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[5rem_2.5rem_8rem_minmax(0,1fr)_auto] sm:gap-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {index === 0 ? 'Today' : new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${date}T12:00:00`))}
                </p>
                <p className="text-xl" aria-hidden="true">{summary.icon}</p>
                <p className="min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-100">{summary.label}</p>
                <p className="hidden min-w-0 text-[11px] leading-4 text-slate-600 dark:text-slate-300 sm:block">
                  {getRideNote(daily?.weather_code?.[index] ?? 0, rain ?? 0, wind)}
                </p>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-950 dark:text-white">
                  {typeof high === 'number' ? `${Math.round(high)}°` : '—'}
                  <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {typeof low === 'number' ? `${Math.round(low)}°` : ''}
                  </span>
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">Rain {typeof rain === 'number' ? `${rain}%` : '—'}</p>
                </div>
                <p className="col-span-4 text-[11px] leading-4 text-slate-600 sm:hidden dark:text-slate-300">{getRideNote(daily?.weather_code?.[index] ?? 0, rain ?? 0, wind)}</p>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Forecast data: Open-Meteo</p>
    </section>
  );
}
