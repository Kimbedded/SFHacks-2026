export * from './types/index';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type HazardCategory =
  | 'broken_elevator'
  | 'obstructed_path'
  | 'steep_slope'
  | 'locked_door'
  | 'broken_power_door'
  | 'restroom_inaccessible'
  | 'auditory_visual_alert'
  | 'construction_detour'
  | 'other';

export interface AIAnalysisResult {
  detectedHazard: string;
  hazardDescription: string;
  slopeGradePercentage?: number | null;
  adaComplianceStatus: 'compliant' | 'borderline' | 'non_compliant' | 'hazardous' | 'requires_inspection';
  adaCodeReference?: string;
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
  suggestedWorkOrderType: string;
  estimatedFixEffort: string;
  suggestedDetour: string;
  recommendedHotlineAction: string;
  confidence: number;
}

export interface AccessibilityReport {
  id: string;
  title: string;
  description: string;
  category: HazardCategory;
  locationName: string;
  buildingId?: string;
  coordinates: Coordinates;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'triaged' | 'work_order_created' | 'dispatched' | 'in_progress' | 'resolved';
  photoUrl?: string;
  aiAnalysis?: AIAnalysisResult;
  facilitiesWorkOrderId?: string;
  upvotes: number;
  reportedAt: string;
  updatedAt: string;
  reporterName?: string;
}

export interface CampusBuilding {
  id: string;
  name: string;
  code: string;
  coordinates: Coordinates;
  accessibleEntrances: {
    description: string;
    coordinates: Coordinates;
    hasPowerDoor: boolean;
  }[];
  elevators: {
    id: string;
    name: string;
    floorsServed: string;
    status: 'operational' | 'down' | 'maintenance' | 'intermittent';
    lastChecked: string;
    alternativePath: string;
  }[];
  amenities: string[];
  notes?: string;
}

export interface AssistanceRequest {
  id: string;
  requesterName: string;
  requesterPhone?: string;
  mobilityNeeds: string;
  serviceType: 'gator_mobility_cart' | 'safety_escort' | 'dprc_specialist' | 'caps_urgent_support';
  pickupLocation: string;
  dropoffLocation?: string;
  pickupCoordinates?: Coordinates;
  status: 'requested' | 'assigned' | 'in_transit' | 'arrived' | 'completed';
  etaMinutes: number;
  vehicleAssigned?: string;
  driverName?: string;
  requestedAt: string;
  notes?: string;
}

export interface TransitAlert {
  id: string;
  service: string;
  stopName: string;
  status: 'accessible' | 'elevator_down' | 'reduced_service' | 'detour';
  headline: string;
  details: string;
  alternativeGuidance: string;
  lastUpdated: string;
}

export interface AccessibleRouteOption {
  id: string;
  title: string;
  type: 'maximum_accessibility' | 'shallowest_slope' | 'fastest_paved' | 'shuttle_assisted';
  distanceMeters: number;
  estimatedMinutes: number;
  maxSlopeGrade: number;
  steps: {
    instruction: string;
    accessibilityNotes: string;
    isElevatorNeeded: boolean;
    isRamp: boolean;
    coordinates: Coordinates;
  }[];
  pathCoordinates: Coordinates[];
  elevationGainMeters: number;
  isFullyADACompliant: boolean;
  warningNotice?: string;
}
