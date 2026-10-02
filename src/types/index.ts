export type NeighborhoodId =
  | 'sfsu'
  | 'mission'
  | 'fidi'
  | 'soma'
  | 'sunset'
  | 'richmond'
  | 'tenderloin'
  | 'twinpeaks'
  | 'embarcadero'
  | 'presidio';

export interface NeighborhoodData {
  id: NeighborhoodId;
  name: string;
  category: string;
  lat: number;
  lng: number;
  x: number; // SVG map x coordinate (0 - 800)
  y: number; // SVG map y coordinate (0 - 650)
  aqi: number; // Air Quality Index
  aqiStatus: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy';
  tempF: number;
  heatIslandDeltaF: number; // difference from regional baseline
  canopyCoveragePct: number;
  trafficIndex: number; // 0 - 100
  cleanlinessScore: number; // 0 - 100 (higher is cleaner)
  solarOutputKw: number;
  activeSensors: number;
  recentAlert?: string;
  notes: string;
}

export interface EdgeSensorNode {
  id: string;
  name: string;
  location: string;
  hardware: string; // e.g., 'ESP32-S3 + BME688 + PM2.5'
  protocol: 'LoRaWAN 915MHz' | 'NB-IoT' | 'BLE Mesh';
  batteryPct: number;
  isSolarCharging: boolean;
  rssi: number; // dBm
  lastPingSecs: number;
  status: 'online' | 'degraded' | 'calibrating';
  readings: {
    temperature: number;
    humidity: number;
    pm25: number;
    co2: number;
    vocIndex: number;
    noiseDb: number;
  };
  anomalyDetected?: string;
}

export interface IncidentClassification {
  id: string;
  title: string;
  timestamp: string;
  location: string;
  imageUrl?: string;
  imageThumbnail: string;
  head1_category: 'Infrastructure & Drainage' | 'Urban Heat & Canopy' | 'Waste & Composting' | 'Transit & Pedestrian' | 'Air Quality & Emissions';
  head2_urgency: {
    score: number; // 1 - 10
    slaHours: number;
    level: 'Low' | 'Medium' | 'High' | 'Critical';
  };
  head3_impact: {
    carbonImpactKg: number;
    affectedRadiusMeters: number;
    heatMitigationScore: number;
  };
  head4_routing: {
    targetAgency: 'SF Public Works' | 'SFMTA (Transit)' | 'SF Department of Environment' | 'Recology Clean Team' | 'SFPUC Water';
    automatedAction: string;
    ticketId: string;
  };
  confidence: number;
  userSubmitted?: boolean;
}

export interface SimulationParams {
  canopyTreesCount: number; // 0 - 25,000
  solarPanelsMw: number; // 0 - 120
  muniTransitBoostPct: number; // 0 - 100%
  coolPavementsPct: number; // 0 - 50%
  compostDiversionRate: number; // 50% - 95%
}

export interface SimulationResults {
  projectedTempReductionF: number;
  annualCo2ReductionTons: number;
  healthcareSavingsUsd: number;
  stormwaterRetainedGallons: number;
  cityGreenScore: string; // e.g., 'A+'
}
