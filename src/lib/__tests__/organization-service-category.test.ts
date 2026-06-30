import { inferOrganizationServiceCategory } from '@/lib/organization-service-category';

describe('inferOrganizationServiceCategory', () => {
  it.each([
    ['Half-day MTB photo and drone coverage', 'ride_photography'],
    ['Shuttle pickup and drop-off for riders', 'shuttle_transport'],
    ['Beginner cornering skills clinic', 'training'],
    ['Guided local trail tour', 'guiding'],
    ['Bike mechanic and puncture repair', 'repair_support'],
  ])('classifies %s', (input, expected) => {
    expect(inferOrganizationServiceCategory(input)).toBe(expected);
  });

  it('falls back to other for an unknown service', () => {
    expect(inferOrganizationServiceCategory('Custom support package')).toBe('other');
  });
});
