import { fireEvent, render, screen } from '@testing-library/react';
import { TrailCard } from '@/components/feature-components/trail-card';
import type { Trail } from '@/types';

const baseTrail: Trail = {
  id: 'trail-1',
  name: 'Forest Loop',
  description: 'Fast flowy singletrack through pine forest.',
  difficulty: 'medium',
  location: 'Kathmandu',
  safety_labels: ['helmet_required', 'carry_water'],
  latitude: 27.7,
  longitude: 85.3,
  distance_km: 12.3,
  elevation_gain_m: 500,
  estimated_time_hours: 2,
  image_url: null,
  route_data: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('TrailCard', () => {
  it('renders trail details and safety labels', () => {
    render(<TrailCard {...baseTrail} />);

    expect(screen.getByText('Forest Loop')).toBeInTheDocument();
    expect(screen.getByText('Kathmandu')).toBeInTheDocument();
    expect(screen.getByText(/helmet required/i)).toBeInTheDocument();
    expect(screen.getByText(/carry water/i)).toBeInTheDocument();
  });

  it('triggers onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<TrailCard {...baseTrail} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /select forest loop/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
