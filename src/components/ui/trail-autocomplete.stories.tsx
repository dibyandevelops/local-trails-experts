import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import TrailAutocomplete from './trail-autocomplete';
import type { Trail } from '@/types';

const mockTrails: Trail[] = [
  {
    id: 'trail-1',
    slug: 'chitlang-enduro',
    name: 'Chitlang Enduro Loop',
    description: 'A technical community favorite.',
    difficulty: 'hard',
    sport_type: 'enduro_mtb',
    location: 'Chitlang, Makwanpur',
    latitude: null,
    longitude: null,
    distance_km: 24,
    elevation_gain_m: 820,
    estimated_time_hours: 3.5,
    image_url: null,
    route_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'trail-2',
    slug: 'pharping-flow',
    name: 'Pharping Flow Trail',
    description: 'Flowy sections with short climbs.',
    difficulty: 'moderate',
    sport_type: 'mtb',
    location: 'Pharping, Kathmandu',
    latitude: null,
    longitude: null,
    distance_km: 18,
    elevation_gain_m: 540,
    estimated_time_hours: 2.5,
    image_url: null,
    route_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'trail-3',
    slug: 'nagarkot-xc',
    name: 'Nagarkot XC Ride',
    description: 'Longer XC ride with valley views.',
    difficulty: 'moderate',
    sport_type: 'xc_trails',
    location: 'Nagarkot, Bhaktapur',
    latitude: null,
    longitude: null,
    distance_km: 32,
    elevation_gain_m: 900,
    estimated_time_hours: 4,
    image_url: null,
    route_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const meta: Meta<typeof TrailAutocomplete> = {
  title: 'UI/TrailAutocomplete',
  component: TrailAutocomplete,
};

export default meta;
type Story = StoryObj<typeof TrailAutocomplete>;

function DemoTrailAutocomplete({ loading = false, empty = false }: { loading?: boolean; empty?: boolean }) {
  const [query, setQuery] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const options = useMemo(() => {
    if (empty) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return mockTrails;
    return mockTrails.filter((trail) =>
      `${trail.name} ${trail.location}`.toLowerCase().includes(normalizedQuery)
    );
  }, [empty, query]);

  return (
    <div className="max-w-md p-6">
      <TrailAutocomplete
        label="Trail"
        query={query}
        value={selectedTrail}
        options={options}
        isLoading={loading}
        helperText="Selecting a trail can auto-fill event details."
        onQueryChange={setQuery}
        onChange={setSelectedTrail}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <DemoTrailAutocomplete />,
};

export const Loading: Story = {
  render: () => <DemoTrailAutocomplete loading />,
};

export const Empty: Story = {
  render: () => <DemoTrailAutocomplete empty />,
};
