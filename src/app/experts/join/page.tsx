'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { loginUser } from '@/services/auth/auth.service';
import { resizeImageToDataUrl } from '@/lib/image';

export default function ExpertJoinPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>(['mtb']);
  const [credentials, setCredentials] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'EX';

  const toggleSport = (value: string) => {
    setSelectedSports((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
          profile_photo_url: profilePhotoUrl || null,
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
          role: 'expert',
        });

        // Dispatch auth changed event to update UI
        window.dispatchEvent(new Event('auth-changed'));

        // Redirect to create event page
        router.push('/events/create');
      } catch (loginErr) {
        console.error('Auto-login failed after signup:', loginErr);
        // If auto-login fails, redirect to login page with a message
        router.push('/?login=1&role=expert&message=signup-success&next=%2Fevents%2Fcreate');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <section className="mb-10 text-center">
        <p className="text-sm font-semibold tracking-wide text-green-700 uppercase mb-2">
          For Guided Trails & Coaches
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          Become a Verified Sports Expert
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Share your local knowledge from anywhere in the world. Host guided
          MTB rides, hikes, trail runs, and performance training sessions for
          riders, runners, and travelers.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">
            Why get a <span className="text-green-700">Verified Expert Badge</span>?
          </h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
              <span>Stand out in search results for your city and sport categories.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
              <span>Build trust with visiting riders, runners, and hikers.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
              <span>Access upcoming features like expert-only events and group bookings.</span>
            </li>
          </ul>
        </div>

        <div className="bg-green-900 text-white rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-3">Who is this for?</h3>
            <p className="text-sm text-green-100 mb-4">
              Local MTB guides, hiking leaders, trail runners, cycling coaches,
              and outdoor professionals who:
            </p>
            <ul className="space-y-2 text-sm text-green-100">
              <li>• Know the local routes, weather, and safety practices</li>
              <li>• Have guiding, coaching, or competition experience</li>
              <li>• Want to host paid events and training sessions</li>
            </ul>
          </div>
          <p className="mt-6 text-xs text-green-200">
            You can start with a simple application. We may contact you for
            additional verification (certifications, references, or social
            profiles) before granting the badge.
          </p>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Apply for Expert Verification
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Tell us about your experience guiding, coaching, or leading outdoor
          activities. This helps us keep the community safe and high-quality.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              {profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePhotoUrl} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile photo (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploadingPhoto(true);
                  try {
                    const dataUrl = await resizeImageToDataUrl(file);
                    setProfilePhotoUrl(dataUrl);
                  } catch (error) {
                    console.error(error);
                    setErrorMessage('Unable to load profile photo. Try a smaller image.');
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
                className="block w-full text-sm text-gray-700"
              />
              {uploadingPhoto && (
                <p className="text-xs text-gray-500 mt-1">Processing photo...</p>
              )}
            </div>
          </div>
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
                placeholder="e.g., Kathmandu, London, or your city"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your credentials & experience <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Share guiding/teaching experience, certifications, races, previous groups you've led, links to social profiles, etc."
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-green-700 text-white font-semibold text-sm shadow-sm hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
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
