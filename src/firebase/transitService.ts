import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import type { TransitAlert } from '../types';

export function subscribeToTransitAlerts(
  onUpdate: (alerts: TransitAlert[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(doc(db, 'transitFeeds', 'bart'), (snapshot) => {
    const alerts = snapshot.data()?.alerts;
    onUpdate(Array.isArray(alerts) ? alerts : []);
  }, onError);
}
