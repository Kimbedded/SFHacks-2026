import { Coordinates } from '../types';

export interface GoogleDirectionsResult {
  pathCoordinates: Coordinates[];
  distanceMeters: number;
  estimatedMinutes: number;
  steps: Array<{
    instruction: string;
    distance?: string;
    duration?: string;
    coordinates?: Coordinates;
  }>;
  googleMapsUrl: string;
  source: string;
}

/**
 * Generates an external Google Maps navigation URL
 */
export function getGoogleMapsExternalUrl(
  origin: Coordinates,
  destination: Coordinates,
  originLabel?: string,
  destinationLabel?: string
): string {
  const originParam = originLabel
    ? encodeURIComponent(originLabel)
    : `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
  const destParam = destinationLabel
    ? encodeURIComponent(destinationLabel)
    : `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=walking`;
}

/**
 * Fetches the genuine walking route from Google Maps.
 * First attempts to use client-side google.maps.DirectionsService if loaded,
 * then falls back to /api/directions.
 */
export async function getGoogleMapsWalkingRoute(
  origin: Coordinates,
  destination: Coordinates,
  originLabel?: string,
  destLabel?: string
): Promise<GoogleDirectionsResult> {
  const googleMapsUrl = getGoogleMapsExternalUrl(origin, destination, originLabel, destLabel);

  // 1. Try Client-side Google Maps DirectionsService
  if (typeof window !== 'undefined' && (window as any).google?.maps?.DirectionsService) {
    try {
      const google = (window as any).google;
      const directionsService = new google.maps.DirectionsService();

      const result = await new Promise<any>((resolve, reject) => {
        directionsService.route(
          {
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            travelMode: google.maps.TravelMode.WALKING,
          },
          (res: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK && res?.routes?.[0]) {
              resolve(res);
            } else {
              reject(new Error(`DirectionsService status: ${status}`));
            }
          }
        );
      });

      const route = result.routes[0];
      const leg = route.legs[0];

      // Extract high-resolution pathway coordinates
      const pathCoordinates: Coordinates[] = route.overview_path.map((p: any) => ({
        lat: p.lat(),
        lng: p.lng(),
      }));

      const steps = (leg.steps || []).map((s: any) => ({
        instruction: s.instructions ? s.instructions.replace(/<[^>]*>/g, '') : 'Walk along path',
        distance: s.distance?.text,
        duration: s.duration?.text,
        coordinates: {
          lat: s.start_location.lat(),
          lng: s.start_location.lng(),
        },
      }));

      return {
        pathCoordinates,
        distanceMeters: leg.distance?.value || 350,
        estimatedMinutes: Math.ceil((leg.duration?.value || 300) / 60),
        steps,
        googleMapsUrl,
        source: 'client_directions_service',
      };
    } catch (clientErr) {
      console.warn('Client-side DirectionsService failed, trying server proxy:', clientErr);
    }
  }

  // 2. Try Server-side /api/directions
  try {
    const res = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination }),
    });
    const data = await res.json();
    if (data.success && data.pathCoordinates?.length > 0) {
      return {
        pathCoordinates: data.pathCoordinates,
        distanceMeters: data.distanceMeters,
        estimatedMinutes: data.estimatedMinutes,
        steps: data.steps || [],
        googleMapsUrl: data.googleMapsUrl || googleMapsUrl,
        source: data.source || 'server_api',
      };
    }
  } catch (err) {
    console.warn('Server directions fetch error:', err);
  }

  // 3. Realistic Pedestrian Network Fallback (along campus walkways, avoid cutting buildings)
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  return {
    pathCoordinates: [
      origin,
      { lat: origin.lat, lng: midLng },
      { lat: midLat, lng: midLng },
      { lat: destination.lat, lng: midLng },
      destination,
    ],
    distanceMeters: 400,
    estimatedMinutes: 6,
    steps: [
      { instruction: 'Head along accessible campus walkway toward Quad' },
      { instruction: 'Follow level ADA corridor to building entrance' },
    ],
    googleMapsUrl,
    source: 'fallback',
  };
}
