import { CampusBuilding, Coordinates } from '../types';
import { SFSU_BUILDINGS, SFSU_CENTER } from '../data/sfsuCampusData';

export interface LocationDetectionResult {
  detectedLocation: string;
  buildingId: string;
  coordinates: Coordinates;
  locationConfidence: number;
  locationEvidence: string[];
  needsLocationConfirmation: boolean;
}

/**
 * Calculates distance in meters between two lat/lng coordinates (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Finds the nearest building and entrance to given GPS coordinates.
 */
export function matchGpsToCampusBuilding(
  lat: number,
  lng: number,
  accuracyMeters: number = 10,
  buildingsList: CampusBuilding[] = SFSU_BUILDINGS
): {
  building: CampusBuilding;
  entranceName?: string;
  distanceMeters: number;
  isInsideCampus: boolean;
} {
  let closestBuilding = buildingsList[0] || SFSU_BUILDINGS[0];
  let minDistance = Infinity;
  let matchedEntrance: string | undefined = undefined;

  for (const bldg of buildingsList) {
    const distToCenter = calculateDistanceMeters(lat, lng, bldg.coordinates.lat, bldg.coordinates.lng);
    if (distToCenter < minDistance) {
      minDistance = distToCenter;
      closestBuilding = bldg;
    }

    // Check individual entrances
    if (bldg.accessibleEntrances && bldg.accessibleEntrances.length > 0) {
      for (const ent of bldg.accessibleEntrances) {
        const distToEnt = calculateDistanceMeters(lat, lng, ent.coordinates.lat, ent.coordinates.lng);
        if (distToEnt < 30) {
          matchedEntrance = ent.description;
        }
      }
    }
  }

  // SFSU campus radius is approx 1200 meters from center
  const distFromCenter = calculateDistanceMeters(lat, lng, SFSU_CENTER.lat, SFSU_CENTER.lng);
  const isInsideCampus = distFromCenter <= 1500;

  return {
    building: closestBuilding,
    entranceName: matchedEntrance,
    distanceMeters: minDistance,
    isInsideCampus,
  };
}

/**
 * Combines Browser GPS coordinates and Gemini visual sign detection
 * into the structured location response.
 */
export function resolveLocationDetection(params: {
  gpsCoords?: { lat: number; lng: number; accuracy?: number } | null;
  geminiSign?: string | null;
  geminiLocation?: string | null;
  selectedBuildingName?: string;
  buildingsList?: CampusBuilding[];
}): LocationDetectionResult {
  const buildings = params.buildingsList && params.buildingsList.length > 0 ? params.buildingsList : SFSU_BUILDINGS;
  const evidence: string[] = [];

  // Case 1: Both GPS and Gemini visual sign exist
  if (params.gpsCoords && params.geminiSign) {
    const gpsMatch = matchGpsToCampusBuilding(
      params.gpsCoords.lat,
      params.gpsCoords.lng,
      params.gpsCoords.accuracy,
      buildings
    );

    evidence.push('Browser GPS');
    evidence.push('Building sign detected in image');

    // Check if the visual sign matches the nearest building
    const signLower = params.geminiSign.toLowerCase();
    const bldgNameLower = gpsMatch.building.name.toLowerCase();
    const matchesGps = signLower.includes(bldgNameLower) || bldgNameLower.includes(signLower);

    if (matchesGps) {
      const locName = gpsMatch.entranceName
        ? `${gpsMatch.building.name} (${gpsMatch.entranceName.split('(')[0].trim()})`
        : params.geminiLocation || `${gpsMatch.building.name} North Entrance`;

      return {
        detectedLocation: locName,
        buildingId: gpsMatch.building.id,
        coordinates: {
          lat: params.gpsCoords.lat,
          lng: params.gpsCoords.lng,
        },
        locationConfidence: 0.94,
        locationEvidence: evidence,
        needsLocationConfirmation: false,
      };
    } else {
      // Disagreement between GPS and visible sign: trust visible sign but flag confirmation
      const signBuilding = buildings.find(
        (b) =>
          signLower.includes(b.name.toLowerCase()) ||
          signLower.includes(b.code.toLowerCase())
      ) || gpsMatch.building;

      return {
        detectedLocation: params.geminiSign,
        buildingId: signBuilding.id,
        coordinates: signBuilding.coordinates,
        locationConfidence: 0.85,
        locationEvidence: evidence,
        needsLocationConfirmation: true,
      };
    }
  }

  // Case 2: Only Browser GPS is available
  if (params.gpsCoords) {
    const gpsMatch = matchGpsToCampusBuilding(
      params.gpsCoords.lat,
      params.gpsCoords.lng,
      params.gpsCoords.accuracy,
      buildings
    );

    const accuracy = Math.round(params.gpsCoords.accuracy || 15);
    evidence.push(`Browser GPS (within ${accuracy}m)`);
    evidence.push('Campus Grid Match');

    const isHighAccuracy = accuracy <= 25 && gpsMatch.distanceMeters <= 80 && gpsMatch.isInsideCampus;
    const locName = gpsMatch.entranceName
      ? `${gpsMatch.building.name} (${gpsMatch.entranceName.split('(')[0].trim()})`
      : gpsMatch.building.name;

    return {
      detectedLocation: locName,
      buildingId: gpsMatch.building.id,
      coordinates: {
        lat: params.gpsCoords.lat,
        lng: params.gpsCoords.lng,
      },
      locationConfidence: isHighAccuracy ? 0.90 : 0.72,
      locationEvidence: evidence,
      needsLocationConfirmation: !isHighAccuracy,
    };
  }

  // Case 3: Only Gemini Vision detected sign is available (no GPS)
  if (params.geminiSign) {
    evidence.push('Building sign detected in image');
    const signLower = params.geminiSign.toLowerCase();
    const matchedBuilding = buildings.find(
      (b) =>
        signLower.includes(b.name.toLowerCase()) ||
        signLower.includes(b.code.toLowerCase())
    ) || buildings[0];

    return {
      detectedLocation: params.geminiLocation || `${matchedBuilding.name} Main Entrance`,
      buildingId: matchedBuilding.id,
      coordinates: matchedBuilding.coordinates,
      locationConfidence: 0.82,
      locationEvidence: evidence,
      // GPS was unavailable: per requirement, request confirmation
      needsLocationConfirmation: true,
    };
  }

  // Case 4: Neither GPS nor image sign available -> Location uncertain
  const defaultBuilding = buildings.find(
    (b) => b.name.toLowerCase() === (params.selectedBuildingName || '').toLowerCase()
  ) || buildings[0];

  return {
    detectedLocation: defaultBuilding ? `${defaultBuilding.name} (Unconfirmed)` : 'Location uncertain (SFSU Campus)',
    buildingId: defaultBuilding ? defaultBuilding.id : 'ccsc',
    coordinates: defaultBuilding ? defaultBuilding.coordinates : SFSU_CENTER,
    locationConfidence: 0.45,
    locationEvidence: ['Default campus reference'],
    needsLocationConfirmation: true,
  };
}
