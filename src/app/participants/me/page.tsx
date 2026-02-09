'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhoneVerificationDialog from '@/components/phone-verification-dialog';
import type { User, SportType } from '@/types';
import { format } from 'date-fns';

type ParticipantEvent = {
  id: string;
  title: string;
  event_date: string;
  city: string | null;
  sport_type: string | null;
  joined_at: string;
};

export default function ParticipantProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<ParticipantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    bio: '',
    sports: '',
    phone: '',
  });

  const sportOptions: { value: SportType; label: string }[] = [
    { value: 'mtb', label: 'MTB Trail Rides' },
    { value: 'hiking', label: 'Hiking' },
    { value: 'trail_running', label: 'Trail Running' },
    { value: 'training', label: 'Training & Coaching' },
    { value: 'local_tour', label: 'Local Tours' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/me');
        const meData = await meRes.json();
        setUser(meData.user || null);
        if (meData.user) {
          setEditForm({
            name: meData.user.name || '',
            city: meData.user.city || '',
            bio: meData.user.bio || '',
            sports: Array.isArray(meData.user.sports)
              ? meData.user.sports.join(', ')
              : '',
            phone: meData.user.phone || '',
          });
        }

        if (!meData.user || meData.user.role !== 'participant') {
          setLoading(false);
          return;
        }

        const eventsRes = await fetch('/api/participants/me/events');
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      } catch (error) {
        console.error('Error loading participant profile', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-gray-600">Loading profile...</div>;
  }

  if (!user || user.role !== 'participant') {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3">
        You must be logged in as a participant to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Edit Profile
        </h2>
        {message && (
          <p
            className={`text-sm border rounded-lg px-3 py-2 mb-3 ${
              message.includes('select at least one sport')
                ? 'text-red-600 bg-red-50 border-red-100'
                : 'text-green-700 bg-green-50 border-green-100'
            }`}
          >
            {message}
          </p>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setMessage(null);
            try {
              const selectedSports = editForm.sports
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
              if (selectedSports.length === 0) {
                setMessage('Please select at least one sport.');
                setSaving(false);
                return;
              }
              const response = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: editForm.name,
                  city: editForm.city,
                  bio: editForm.bio,
                  sports: selectedSports,
                  phone: editForm.phone,
                }),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data?.error || 'Failed to update profile');
              }
              setUser(data.user);
              setMessage('Profile updated.');
            } catch (error) {
              console.error('Error updating profile', error);
              setMessage('Unable to update profile.');
            } finally {
              setSaving(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) =>
                setEditForm({ ...editForm, name: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={editForm.city}
              onChange={(event) =>
                setEditForm({ ...editForm, city: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={editForm.bio}
              onChange={(event) =>
                setEditForm({ ...editForm, bio: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sports
            </label>
            <div className="flex flex-wrap gap-2">
              {sportOptions.map((sport) => {
                const selected = editForm.sports
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .includes(sport.value);
                return (
                  <button
                    key={sport.value}
                    type="button"
                    onClick={() => {
                      const current = editForm.sports
                        .split(',')
                        .map((value) => value.trim())
                        .filter(Boolean);
                      const updated = selected
                        ? current.filter((value) => value !== sport.value)
                        : [...current, sport.value];
                      setEditForm({ ...editForm, sports: updated.join(', ') });
                    }}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="tel"
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm({ ...editForm, phone: event.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="+9779812345678"
              />
              <button
                type="button"
                onClick={() => setVerifyOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-green-700 text-green-700 hover:bg-green-50"
              >
                {user.phone_verified_at ? 'Verified' : 'Verify phone'}
              </button>
            </div>
            {!user.phone_verified_at && (
              <p className="text-xs text-gray-500 mt-1">
                Please verify to unlock bookings.
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <PhoneVerificationDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        phone={editForm.phone}
        onVerified={async () => {
          const response = await fetch('/api/me/verify-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: editForm.phone }),
          });
          const data = await response.json();
          if (response.ok) {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    phone: data.user?.phone || prev.phone,
                    phone_verified_at:
                      data.user?.phone_verified_at || new Date().toISOString(),
                  }
                : prev
            );
          }
        }}
      />

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Your Profile</h1>
        <p className="text-sm text-gray-600 mt-1">{user.name || 'Participant'}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Events You Joined
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have not joined any events yet.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-green-700"
                  >
                    {event.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {format(new Date(event.event_date), 'PPP p')}
                    {event.city ? ` • ${event.city}` : ''}
                  </p>
                  {event.sport_type && (
                    <p className="text-xs text-gray-500">
                      Sport: {event.sport_type}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/events`)}
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  View event list
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
