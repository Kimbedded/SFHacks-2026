import type { TransitAlert } from '../types';

const POLL_MS = 60 * 1000;

// Mock transit feed: polls the backend's /api/transit-alerts (served from mock BART data).
export function subscribeToTransitAlerts(
  onUpdate: (alerts: TransitAlert[]) => void,
  onError: (error: Error) => void,
) {
  let cancelled = false;

  const load = async () => {
    try {
      const response = await fetch('/api/transit-alerts');
      if (!response.ok) throw new Error(`Transit alerts HTTP ${response.status}`);
      const data = await response.json();
      if (!cancelled) onUpdate(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (error) {
      if (!cancelled) onError(error instanceof Error ? error : new Error('Transit alerts unavailable'));
    }
  };

  void load();
  const timer = setInterval(load, POLL_MS);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}
