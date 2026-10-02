import type { TransitAlert } from '../src/types';

// Mock BART feed for the demo: no network calls, API key, or Firebase Admin
// credentials. The shape matches TransitAlert so a real feed can replace this later.
export const BART_REFRESH_MS = 60 * 1000;

export function getMockBartAlerts(updatedAt = new Date().toISOString()): TransitAlert[] {
  return [
    {
      id: 'bart-mock-bsa-0',
      service: 'BART Service Advisories',
      stopName: 'Daly City',
      status: 'reduced_service',
      headline: 'BART service update',
      details:
        'Minor delays of about 10 minutes on the Daly City line due to a train held for equipment inspection.',
      alternativeGuidance:
        'Check bart.gov/schedules/advisories before traveling. Muni 28 and 29 also serve SFSU from Daly City.',
      lastUpdated: updatedAt,
    },
    {
      id: 'bart-mock-elev-0',
      service: 'BART Elevator Status',
      stopName: 'Balboa Park',
      status: 'accessible',
      headline: 'BART elevator update',
      details: 'All elevators at Balboa Park Station are in service.',
      alternativeGuidance: 'Balboa Park is the closest BART station to SFSU, via the K/M Muni lines.',
      lastUpdated: updatedAt,
    },
    {
      id: 'bart-mock-elev-1',
      service: 'BART Elevator Status',
      stopName: 'Daly City',
      status: 'elevator_down',
      headline: 'BART elevator update',
      details: 'The street-level elevator at Daly City Station is out of service for maintenance.',
      alternativeGuidance:
        'Use the platform-to-concourse elevator and the station agent can direct you to the accessible exit. Check bart.gov/stations/elevators.',
      lastUpdated: updatedAt,
    },
  ];
}

export async function readBartTransit() {
  const updatedAt = new Date().toISOString();
  return { alerts: getMockBartAlerts(updatedAt), updatedAt };
}

// Kept so server.ts needs no changes; the mock feed needs no background sync.
export function startBartTransitSync() {
  return () => {};
}
