'use client';

import { useState, useEffect } from 'react';
import { Trail, Difficulty } from '@/types';

export default function TrailsPage() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchTrails();
  }, [search, difficulty, location]);

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
      <h1 className="text-4xl font-bold mb-8 text-green-800">
        Search Trails
      </h1>

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
          <p className="text-gray-600">No trails found. Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trails.map((trail) => (
            <div
              key={trail.id}
              className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {trail.image_url && (
                <img
                  src={trail.image_url}
                  alt={trail.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{trail.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      trail.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : trail.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {trail.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{trail.location}</p>
                {trail.description && (
                  <p className="text-gray-700 mb-4 line-clamp-3">{trail.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {trail.distance_km && (
                    <div>
                      <span className="font-semibold">Distance:</span> {trail.distance_km} km
                    </div>
                  )}
                  {trail.elevation_gain_m && (
                    <div>
                      <span className="font-semibold">Elevation:</span> {trail.elevation_gain_m} m
                    </div>
                  )}
                  {trail.estimated_time_hours && (
                    <div>
                      <span className="font-semibold">Time:</span> {trail.estimated_time_hours} hrs
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

