'use client';

import { useState, useEffect } from 'react';
import { Trail, Difficulty, User } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { useRouter } from 'next/navigation';

function TrailGallery({ trails }: { trails: Trail[] }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trails.map((trail) => (
        <TrailCard
          {...{
            ...trail,
            onClick() {
              router.push(`/trails/${trail.id}`);
            },
          }}
        />
      ))}
    </div>
  );
}
export default function TrailsPage() {
  const router = useRouter();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [location, setLocation] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchTrails();
  }, [search, difficulty, location]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        setUser(data.user || null);
      } catch {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  const fetchTrails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (difficulty) params.append('difficulty', difficulty);
      if (location) params.append('location', location);

      const response = await fetch(`/api/trails?${params.toString()}`);
      const data = await response.json();
      setTrails(data.trails || []);
    } catch (error) {
      console.error('Error fetching trails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrails();
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold text-green-800">Search Trails</h1>
        {(user?.role === 'admin' || user?.role === 'expert') && (
          <button
            type="button"
            onClick={() => router.push('/trails/create')}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Create Trail
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-8 bg-gray-50 p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Trail name, description, or location..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or region..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading trails...</p>
        </div>
      ) : trails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No trails found. Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <TrailGallery trails={trails} />
      )}
    </div>
  );
}
