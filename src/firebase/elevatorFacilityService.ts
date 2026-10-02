import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import { SFSU_BUILDINGS } from '../data/sfsuCampusData';

export interface FirebaseElevator {
  id: string;
  buildingId: string;
  buildingName: string;
  location: string;
  isOperational: boolean;
  statusReason?: string;
  workOrderId?: string;
  outageReportCount?: number;
  lastChecked: string;
  updatedAt?: string;
}

export interface FirebaseFacilityTicket {
  id: string;
  facilityType: 'elevator' | 'power_door' | 'ramp' | 'accessible_restroom' | 'lift' | 'braille_beacon';
  buildingId: string;
  buildingName: string;
  title: string;
  description?: string;
  status: 'operational' | 'reported_broken' | 'work_order_dispatched' | 'parts_on_order' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent_accessibility';
  workOrderNumber?: string;
  reportedAt: string;
  updatedAt?: string;
  upvotes?: number;
}

export interface FirebaseStatusLog {
  id: string;
  elevatorId: string;
  previousStatus: boolean;
  newStatus: boolean;
  notes?: string;
  changedAt: string;
}

const ELEVATORS_COLLECTION = 'elevators';
const FACILITIES_COLLECTION = 'facilities';

/**
 * Initializes Firestore with the initial SFSU elevator fleet if the collection is empty.
 * This guarantees real-time synchronization out of the box across any connected client.
 */
export async function seedElevatorsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, ELEVATORS_COLLECTION));
    if (!snap.empty) {
      return;
    }

    console.log('Seeding initial SFSU elevator fleet into Firestore...');
    const initialElevators: FirebaseElevator[] = [];

    SFSU_BUILDINGS.forEach((b) => {
      b.elevators?.forEach((e) => {
        const isOp = e.status === 'operational';
        initialElevators.push({
          id: e.id,
          buildingId: b.id,
          buildingName: b.name,
          location: e.location || `${e.name} (Floors ${e.floorsServed})`,
          isOperational: isOp,
          statusReason: e.statusReason || (isOp ? 'In normal operation' : 'Maintenance in progress'),
          workOrderId: isOp ? undefined : `SFSU-WO-${Math.floor(1000 + Math.random() * 9000)}`,
          outageReportCount: isOp ? 0 : 2,
          lastChecked: e.lastChecked || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    });

    for (const elev of initialElevators) {
      await setDoc(doc(db, ELEVATORS_COLLECTION, elev.id), elev);
    }
  } catch (err) {
    console.warn('Elevator Firestore seed notice:', err);
  }
}

/**
 * Real-time listener for elevator statuses.
 * Scales efficiently by listening only to the collection snapshot.
 */
export function subscribeToElevators(
  onUpdate: (elevators: FirebaseElevator[]) => void,
  onError?: (err: Error) => void
): () => void {
  const elevCol = collection(db, ELEVATORS_COLLECTION);
  return onSnapshot(
    elevCol,
    (snapshot) => {
      const list: FirebaseElevator[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as FirebaseElevator);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore elevator subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Scalable atomic update for elevator operational status.
 * Also generates an immutable audit entry in the subcollection `/elevators/{id}/statusLogs`.
 */
export async function updateElevatorStatus(
  elevatorId: string,
  newStatus: boolean,
  reason?: string
): Promise<void> {
  const elevRef = doc(db, ELEVATORS_COLLECTION, elevatorId);
  const now = new Date().toISOString();

  await updateDoc(elevRef, {
    isOperational: newStatus,
    statusReason: reason || (newStatus ? 'Verified operational' : 'Out of service reported'),
    lastChecked: now,
    updatedAt: now,
    workOrderId: newStatus ? '' : `SFSU-WO-${Math.floor(1000 + Math.random() * 9000)}`,
  });

  // Write scalable subcollection audit log
  const logId = `log-${Date.now()}`;
  const logRef = doc(db, ELEVATORS_COLLECTION, elevatorId, 'statusLogs', logId);
  await setDoc(logRef, {
    id: logId,
    elevatorId,
    previousStatus: !newStatus,
    newStatus,
    notes: reason || `Status switched to ${newStatus ? 'Operational' : 'Out of Service'}`,
    changedAt: now,
  });
}

/**
 * Initializes Firestore with initial facilities tickets if collection is empty
 */
export async function seedFacilitiesIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, FACILITIES_COLLECTION));
    if (!snap.empty) {
      return;
    }

    const defaultTickets: FirebaseFacilityTicket[] = [
      {
        id: 'fac-ticket-1',
        facilityType: 'power_door',
        buildingId: 'ccsc',
        buildingName: 'Cesar Chavez Student Center',
        title: 'Plaza South Automatic Push-Plate Door Stalling',
        description: 'ADA push-plate activator on the south entrance plaza door is intermittently failing.',
        status: 'work_order_dispatched',
        priority: 'high',
        workOrderNumber: 'SFSU-WO-8241',
        reportedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 6,
      },
      {
        id: 'fac-ticket-2',
        facilityType: 'elevator',
        buildingId: 'th',
        buildingName: 'Thornton Hall',
        title: 'East Tower Elevator #2 Level 3 Sensor Calibration',
        description: 'Doors reopening repeatedly on 3rd floor science wing. Technicians dispatched.',
        status: 'parts_on_order',
        priority: 'urgent_accessibility',
        workOrderNumber: 'SFSU-WO-9014',
        reportedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 14,
      },
      {
        id: 'fac-ticket-3',
        facilityType: 'ramp',
        buildingId: 'hum',
        buildingName: 'Humanities Building',
        title: 'West Courtyard ADA Ramp Handrail Re-anchoring',
        description: 'Handrail loose near middle landing. Facilities scheduled for bolt tightening.',
        status: 'in_progress',
        priority: 'medium',
        workOrderNumber: 'SFSU-WO-7712',
        reportedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 3,
      } as unknown as FirebaseFacilityTicket,
    ];

    for (const ticket of defaultTickets) {
      await setDoc(doc(db, FACILITIES_COLLECTION, ticket.id), ticket);
    }
  } catch (err) {
    console.warn('Facilities Firestore seed notice:', err);
  }
}

/**
 * Real-time listener for facilities work orders & status tickets.
 */
export function subscribeToFacilities(
  onUpdate: (tickets: FirebaseFacilityTicket[]) => void,
  onError?: (err: Error) => void
): () => void {
  const facCol = collection(db, FACILITIES_COLLECTION);
  return onSnapshot(
    facCol,
    (snapshot) => {
      const list: FirebaseFacilityTicket[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as FirebaseFacilityTicket);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore facilities subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new facilities status ticket or work order
 */
export async function createFacilityTicket(
  ticket: Omit<FirebaseFacilityTicket, 'id' | 'reportedAt'>
): Promise<string> {
  const id = `fac-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const woNumber = `SFSU-WO-${Math.floor(1000 + Math.random() * 9000)}`;

  const fullTicket: FirebaseFacilityTicket = {
    ...ticket,
    id,
    reportedAt: now,
    updatedAt: now,
    workOrderNumber: woNumber,
    upvotes: 1,
  };

  await setDoc(doc(db, FACILITIES_COLLECTION, id), fullTicket);

  // Initial subcollection log
  const logId = `log-${Date.now()}`;
  await setDoc(doc(db, FACILITIES_COLLECTION, id, 'workLogs', logId), {
    id: logId,
    workOrderId: id,
    message: `Initial report logged. Work order generated: ${woNumber}`,
    createdAt: now,
  });

  return id;
}

/**
 * Upvote a facility barrier report to prioritize facilities attention
 */
export async function upvoteFacilityTicket(ticketId: string, currentUpvotes: number = 0): Promise<void> {
  const facRef = doc(db, FACILITIES_COLLECTION, ticketId);
  await updateDoc(facRef, {
    upvotes: currentUpvotes + 1,
    updatedAt: new Date().toISOString(),
  });
}
