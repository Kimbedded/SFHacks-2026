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
  strokeColor = '#4f46e5',
  strokeWeight = 5,
  strokeOpacity = 0.85,
  isDashed = false,
}: PolylineOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib || path.length === 0) return;

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

    return () => {
      line.setMap(null);
    };
  }, [map, mapsLib, path, strokeColor, strokeWeight, strokeOpacity, isDashed]);

  return null;
}
