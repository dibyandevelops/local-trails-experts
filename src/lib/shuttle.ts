export function isShuttleEligibleSport(sportType: string | null | undefined) {
  return sportType === 'downhill_mtb' || sportType === 'enduro_mtb';
}

