import { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Coordinates } from '../types';

interface PolylineOverlayProps {
  path: Coordinates[];
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  isDashed?: boolean;
}

export function PolylineOverlay({
  path,
  strokeColor = '#2563eb',
  strokeWeight = 6,
  strokeOpacity = 0.9,
  isDashed = false,
}: PolylineOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib || path.length === 0) return;

    // Google Maps casing polyline (outer border for high accessibility contrast)
    const casingLine = new mapsLib.Polyline({
      path,
      strokeColor: '#ffffff',
      strokeOpacity: 0.95,
      strokeWeight: strokeWeight + 3,
      map,
    });

    const line = new mapsLib.Polyline({
      path,
      strokeColor,
      strokeOpacity: isDashed ? 0 : strokeOpacity,
      strokeWeight,
      icons: isDashed
        ? [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 4,
                strokeColor,
              },
              offset: '0',
              repeat: '20px',
            },
          ]
        : undefined,
      map,
    });

    setPolyline(line);

    // Smoothly pan and zoom to fit the calculated pathway
    if (path.length >= 2 && typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      try {
        const bounds = new google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(new google.maps.LatLng(pt.lat, pt.lng)));
        map.fitBounds(bounds, { top: 80, right: 60, bottom: 80, left: 60 });
      } catch (e) {
        console.warn('fitBounds note:', e);
      }
    }

    return () => {
      casingLine.setMap(null);
      line.setMap(null);
    };
  }, [map, mapsLib, path, strokeColor, strokeWeight, strokeOpacity, isDashed]);

  return null;
}
