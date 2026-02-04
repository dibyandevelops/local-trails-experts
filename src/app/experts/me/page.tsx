'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Event, User } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function ExpertProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    bio: '',
    sports: '',
  });

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
          });
        }

        if (!meData.user || meData.user.role !== 'expert') {
          setLoading(false);
          return;
        }

        const eventsRes = await fetch(`/api/experts/${meData.user.id}/events`);
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      } catch (error) {
        console.error('Error loading expert profile', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-gray-600">Loading profile...</div>;
  }

  if (!user || user.role !== 'expert') {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3">
        You must be logged in as an expert to view this page.
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
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
            {message}
          </p>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setMessage(null);
            try {
              const response = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: editForm.name,
                  city: editForm.city,
                  bio: editForm.bio,
                  sports: editForm.sports
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
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
              Sports (comma separated)
            </label>
            <input
              type="text"
              value={editForm.sports}
              onChange={(event) =>
                setEditForm({ ...editForm, sports: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
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

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Your Profile</h1>
        <p className="text-sm text-gray-600 mt-1">{user.name || 'Expert'}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Events You Host
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have not created any events yet.
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
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  View event
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
