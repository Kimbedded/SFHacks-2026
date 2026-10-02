import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from '../firebase-applet-config.json';
import type { TransitAlert } from '../src/types';

export const BART_REFRESH_MS = 5 * 60 * 1000;

async function transitDocument() {
  const name = 'bart-transit-sync';
  const app = getApps().find((app) => app.name === name) ?? initializeApp({
    projectId: config.projectId,
    credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : applicationDefault(),
  }, name);
  // Resolve credentials before starting Firestore RPCs so missing credentials
  // produce a handled sync error.
  await app.options.credential!.getAccessToken();
  return getFirestore(app, config.firestoreDatabaseId || '(default)').doc('transitFeeds/bart');
}

function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#cdata-section' in value) {
    return String(value['#cdata-section']);
  }
  return '';
}

export async function fetchBartAlerts(command: 'bsa' | 'elev', updatedAt: string): Promise<TransitAlert[]> {
  const url = new URL('https://api.bart.gov/api/bsa.aspx');
  url.search = new URLSearchParams({ cmd: command, json: 'y',
    key: process.env.BART_API_KEY || 'MW9S-E7SL-26DU-VV8V' }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`BART ${command} HTTP ${response.status}`);
  const data = await response.json();
  if (!data.root || !Array.isArray(data.root.bsa) || data.root.error) {
    throw new Error(`BART ${command} returned an invalid response`);
  }
  return data.root.bsa.map((item: Record<string, unknown>, index: number) => {
    const details = plainText(item.description).trim();
    if (!details) throw new Error(`BART ${command} returned an empty advisory`);
    const normal = /no advisories issued|no delays|all elevators.*(?:operational|service)|(?:0|no) elevators? (?:are )?out of service/i.test(details);
    return {
      id: `bart-${command}-${index}`,
      service: command === 'elev' ? 'BART Elevator Status' : 'BART Service Advisories',
      stopName: plainText(item.station) || 'BART systemwide',
      status: normal ? 'accessible' : command === 'elev' ? 'elevator_down' : 'reduced_service',
      headline: command === 'elev' ? 'BART elevator update' : 'BART service update',
      details,
      alternativeGuidance: command === 'elev'
        ? 'Check bart.gov/stations/elevators for station-specific accessible alternatives.'
        : 'Check bart.gov/schedules/advisories before traveling.',
      lastUpdated: updatedAt,
    };
  });
}

export async function syncBartTransit() {
  const updatedAt = new Date().toISOString();
  const [service, elevators] = await Promise.all([
    fetchBartAlerts('bsa', updatedAt), fetchBartAlerts('elev', updatedAt),
  ]);
  // Replace the snapshot atomically so expired advisories disappear. A failed
  // fetch or write leaves the last successful snapshot intact.
  await (await transitDocument()).set({ source: 'BART', updatedAt, alerts: [...service, ...elevators] });
  console.log(`Saved ${service.length + elevators.length} BART updates to Firestore.`);
}

export async function readBartTransit() {
  const snapshot = await (await transitDocument()).get();
  if (!snapshot.exists) return { alerts: [], updatedAt: null };
  const data = snapshot.data()!;
  return { alerts: data.alerts, updatedAt: data.updatedAt };
}

export function startBartTransitSync() {
  let running = false;
  const refresh = async () => {
    if (running) return;
    running = true;
    try { await syncBartTransit(); }
    catch (error) { console.error('BART Firestore sync failed:', error instanceof Error ? error.message : error); }
    finally { running = false; }
  };
  void refresh();
  const timer = setInterval(refresh, BART_REFRESH_MS);
  timer.unref();
  return () => clearInterval(timer);
}
