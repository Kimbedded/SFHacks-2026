import React, { useState, useEffect, Component, ErrorInfo } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { CampusBuilding, AccessibilityReport, Coordinates, AccessibleRouteOption } from '../types';
import { PolylineOverlay } from './PolylineOverlay';
import {
  SFSU_CENTER,
  SFSU_ACCESSIBLE_PARKING,
  AccessibleParkingLocation,
  SFSU_FALLBACK_STARTING_POINT,
} from '../data/sfsuCampusData';
import {
  isApiKeyConfigured,
  getLastGmpError,
  GoogleMapsErrorInfo,
  GOOGLE_MAPS_ERRORS,
} from '../utils/googleMapsConfig';
import {
  FaWheelchair,
  FaSquareParking,
  FaElevator,
  FaTriangleExclamation,
  FaBuilding,
  FaRoute,
  FaCompass,
  FaLayerGroup,
  FaArrowRight,
  FaArrowUpRightFromSquare,
  FaCircleCheck,
  FaCircleXmark,
  FaCar,
  FaExpand,
  FaLocationDot,
} from 'react-icons/fa6';

interface CampusMapProps {
  buildings: CampusBuilding[];
  reports: AccessibilityReport[];
  activeRoute: AccessibleRouteOption | null;
  selectedWaypointIndex?: number | null;
  onSelectWaypoint?: (index: number) => void;
  onSelectBuildingForRoute: (building: CampusBuilding, asOrigin: boolean) => void;
  onReportAtLocation: (locationName: string, coords: Coordinates, buildingId?: string) => void;
  originBuilding?: CampusBuilding | null;
  destBuilding?: CampusBuilding | null;
  isFocusMode?: boolean;
  containerClassName?: string;
  onOpenSingleModal?: () => void;
  userLocation?: Coordinates | null;
}

// Controller to center the Google Map camera to the starting point when no active route is active
function MapCenterController({
  center,
  hasActiveRoute,
}: {
  center: Coordinates;
  hasActiveRoute: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (map && center && !hasActiveRoute) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng, hasActiveRoute]);
  return null;
}

// Convert SFSU GPS coordinates to percentage positions (0-100%) for the radar map
function gpsToPercent(coords: Coordinates): { left: string; top: string } {
  const minLng = -122.4835;
  const maxLng = -122.474;
  const minLat = 37.7212;
  const maxLat = 37.7262;

  const x = Math.max(5, Math.min(95, ((coords.lng - minLng) / (maxLng - minLng)) * 100));
  const y = Math.max(8, Math.min(92, ((maxLat - coords.lat) / (maxLat - minLat)) * 100));

  return {
    left: `${x.toFixed(2)}%`,
    top: `${y.toFixed(2)}%`,
  };
}

// Error Boundary to prevent any unhandled Google Maps render crash from breaking the app
interface MapErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError: () => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('MapErrorBoundary caught an error, switching to radar mode:', error, info);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function CampusMap({
  buildings,
  reports,
  activeRoute,
  selectedWaypointIndex = 0,
  onSelectWaypoint,
  onSelectBuildingForRoute,
  onReportAtLocation,
  originBuilding,
  destBuilding,
  isFocusMode = true,
  containerClassName,
  onOpenSingleModal,
  userLocation,
}: CampusMapProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [selectedReport, setSelectedReport] = useState<AccessibilityReport | null>(null);
  const [selectedParking, setSelectedParking] = useState<AccessibleParkingLocation | null>(null);
  const [selectedWaypointPopup, setSelectedWaypointPopup] = useState<{
    index: number;
    step: any;
  } | null>(null);

  // Live location state: starts with user's current GPS location, or falls back to Student Life Events Center / Annex I
  const [liveLocation, setLiveLocation] = useState<Coordinates | null>(userLocation || null);
  const [hasAcquiredLiveLocation, setHasAcquiredLiveLocation] = useState(Boolean(userLocation));

  useEffect(() => {
    if (userLocation) {
      setLiveLocation(userLocation);
      setHasAcquiredLiveLocation(true);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHasAcquiredLiveLocation(true);
        },
        (err) => {
          console.warn('Geolocation could not be acquired, defaulting to Student Life Events Center / Annex I:', err);
          setLiveLocation(SFSU_FALLBACK_STARTING_POINT.coordinates);
          setHasAcquiredLiveLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLiveLocation(SFSU_FALLBACK_STARTING_POINT.coordinates);
      setHasAcquiredLiveLocation(false);
    }
  }, [userLocation]);

  const effectiveStartingPoint: Coordinates =
    originBuilding?.coordinates || liveLocation || SFSU_FALLBACK_STARTING_POINT.coordinates;

  // Focus mode state: minimizes non-relevant landmarks when waypoints are active
  const [focusRouteOnly, setFocusRouteOnly] = useState(isFocusMode);

  useEffect(() => {
    setFocusRouteOnly(isFocusMode);
  }, [isFocusMode]);

  const hasActiveWaypoints = Boolean(activeRoute && activeRoute.steps && activeRoute.steps.length > 0);

  // Proximity check for barriers/hazards when focusRouteOnly is active
  const isNearbyRoute = (coords: Coordinates): boolean => {
    if (!activeRoute?.steps || activeRoute.steps.length === 0) return true;
    return activeRoute.steps.some((step) => {
      const dist = Math.hypot(coords.lat - step.coordinates.lat, coords.lng - step.coordinates.lng);
      return dist < 0.0012; // ~120m
    });
  };

  // Helper to determine if a campus building is relevant to the active corridor route
  const isRelevantBuilding = (building: CampusBuilding): boolean => {
    if (!hasActiveWaypoints || !focusRouteOnly) return true;

    if (destBuilding && (building.id === destBuilding.id || building.code.toLowerCase() === destBuilding.code.toLowerCase())) {
      return true;
    }
    if (originBuilding && (building.id === originBuilding.id || building.code.toLowerCase() === originBuilding.code.toLowerCase())) {
      return true;
    }
    if (activeRoute?.title.toLowerCase().includes(building.name.toLowerCase()) || activeRoute?.title.toLowerCase().includes(building.code.toLowerCase())) {
      return true;
    }

    if (activeRoute?.steps && activeRoute.steps.length > 0) {
      const startCoord = activeRoute.steps[0].coordinates;
      const endCoord = activeRoute.steps[activeRoute.steps.length - 1].coordinates;
      const dStart = Math.hypot(building.coordinates.lat - startCoord.lat, building.coordinates.lng - startCoord.lng);
      const dEnd = Math.hypot(building.coordinates.lat - endCoord.lat, building.coordinates.lng - endCoord.lng);
      if (dStart < 0.0009 || dEnd < 0.0009) return true;
    }

    return false;
  };

  // Layer Toggles
  const [showElevators, setShowElevators] = useState(true);
  const [showEntrances, setShowEntrances] = useState(true);
  const [showParking, setShowParking] = useState(true);
  const [showHazards, setShowHazards] = useState(true);

  // Google Maps State & Error Tracking
  const [mapsError, setMapsError] = useState<GoogleMapsErrorInfo | null>(getLastGmpError());
  const hasConfiguredKey = isApiKeyConfigured();

  useEffect(() => {
    const handleGmpError = (event: Event) => {
      const customEvent = event as CustomEvent<GoogleMapsErrorInfo>;
      if (customEvent.detail) {
        setMapsError(customEvent.detail);
      }
    };

    window.addEventListener('gmp-error', handleGmpError);
    return () => {
      window.removeEventListener('gmp-error', handleGmpError);
    };
  }, []);

  const shouldRenderGoogleMaps = hasConfiguredKey && !mapsError;

  // The Offline Campus Barrier Radar View (Zero crash fallback)
  const renderRadarView = () => (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-900 select-none overflow-hidden">
      {/* Offline Mode Header Notice */}
      <div className="absolute top-12 sm:top-14 left-3 right-3 z-15 pointer-events-none flex justify-center">
        <div className="px-3.5 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-amber-400/40 text-amber-200 text-[11px] shadow-xl flex items-center gap-2 pointer-events-auto max-w-xl text-center">
          <FaCompass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-amber-300">Demo / Offline Mode:</strong> Displaying SFSU barrier, accessible parking, elevator, and power door telemetry.
          </span>
        </div>
      </div>

      {/* Subtle Campus Grid & Roadway Vector Artwork */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#campus-grid)" />
        <path d="M 50 150 Q 300 250 550 240 T 950 320" fill="none" stroke="#e0e7ff" strokeWidth="6" strokeOpacity="0.25" />
        <path d="M 450 50 L 500 550" fill="none" stroke="#e0e7ff" strokeWidth="6" strokeOpacity="0.2" />
        <circle cx="500" cy="270" r="85" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Campus Radar Sweep Animation */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full border border-purple-500/20 animate-pulse pointer-events-none"></div>
        <div className="w-[300px] h-[300px] rounded-full border border-amber-400/20 pointer-events-none"></div>
      </div>

      {/* Campus Geographic Landmarks */}
      <div className="absolute top-[38%] left-[45%] -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
        <div className="px-3 py-1 bg-purple-950/60 rounded-full border border-purple-400/20 text-[10px] font-bold text-purple-300 uppercase tracking-widest backdrop-blur-sm">
          Malcolm X Plaza & Quad Hub
        </div>
      </div>
      <div className="absolute top-[52%] right-[4%] pointer-events-none">
        <div className="px-2 py-0.5 bg-black/60 rounded border border-white/20 text-[9px] font-bold text-amber-300">
          19th Ave & Muni Metro
        </div>
      </div>
      <div className="absolute top-[70%] left-[8%] pointer-events-none">
        <div className="px-2 py-0.5 bg-black/60 rounded border border-white/20 text-[9px] font-bold text-slate-300">
          Lot 20 ADA Garage
        </div>
      </div>

      {/* Interactive Campus Buildings */}
      {buildings.map((bldg) => {
        const pos = gpsToPercent(bldg.coordinates);
        const hasBrokenElevator = bldg.elevators.some((e) => e.status === 'down');
        const isSelected = selectedBuilding?.id === bldg.id;
        const isRelevant = isRelevantBuilding(bldg);

        // When waypoints are showing and landmark is not relevant, minimize it to a subtle dot
        if (hasActiveWaypoints && focusRouteOnly && !isRelevant) {
          return (
            <div
              key={bldg.id}
              style={{ left: pos.left, top: pos.top }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-5 opacity-25 hover:opacity-100 transition-opacity"
            >
              <button
                type="button"
                onClick={() => setSelectedBuilding(bldg)}
                className="w-2 h-2 rounded-full bg-slate-400 hover:bg-purple-400 transition-all cursor-pointer"
                title={`${bldg.name} (Minimized landmark)`}
              />
            </div>
          );
        }

        return (
          <div
            key={bldg.id}
            style={{ left: pos.left, top: pos.top }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ${
              isRelevant && hasActiveWaypoints ? 'z-30' : 'z-10'
            }`}
          >
            {/* Building Marker Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedBuilding(bldg);
                setSelectedReport(null);
                setSelectedParking(null);
              }}
              className={`group relative cursor-pointer px-2.5 py-1 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-amber-400 text-purple-950 border-white scale-125 z-30 shadow-amber-400/50'
                  : hasBrokenElevator
                  ? 'bg-rose-600 text-white border-rose-400 hover:scale-110 shadow-rose-900/50'
                  : 'bg-purple-900/90 hover:bg-purple-800 text-white border-purple-400/30 hover:scale-110'
              }`}
              title={`${bldg.name} (${bldg.code})`}
            >
              <FaBuilding className="w-3 h-3 shrink-0" />
              <span className="font-black text-[11px]">{bldg.code}</span>
              {hasBrokenElevator && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
              )}
            </button>

            {/* Satellite indicators for Elevators */}
            {showElevators && (
              <div className="absolute -top-3 -right-2 flex gap-0.5">
                {bldg.elevators.map((elev) => (
                  <span
                    key={elev.id}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow border border-white ${
                      elev.status === 'operational'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-600 text-white animate-pulse'
                    }`}
                    title={`Elevator ${elev.name}: ${elev.status}`}
                  >
                    <FaElevator className="w-2 h-2" />
                  </span>
                ))}
              </div>
            )}

            {/* Power Entrance Indicator */}
            {showEntrances && bldg.accessibleEntrances.some((e) => e.hasPowerDoor) && (
              <div
                className="absolute -bottom-2 -left-1 w-3.5 h-3.5 rounded-full bg-blue-600 border border-white shadow flex items-center justify-center text-white"
                title="Power automatic entrance available"
              >
                <FaWheelchair className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        );
      })}

      {/* Starting Point Marker on Radar when idle */}
      {(!activeRoute || !activeRoute.steps || activeRoute.steps.length === 0) && (
        <div
          style={gpsToPercent(effectiveStartingPoint)}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-40"
        >
          <div className="px-2.5 py-1 rounded-xl bg-purple-950 text-amber-300 font-black text-[10px] shadow-xl border-2 border-amber-400 flex items-center gap-1.5 whitespace-nowrap animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{hasAcquiredLiveLocation ? '📍 Current Location' : '🏛️ Annex I (Start)'}</span>
          </div>
        </div>
      )}

      {/* Accessible Parking on Radar (Minimized/hidden when route waypoints active) */}
      {showParking &&
        (!hasActiveWaypoints || !focusRouteOnly) &&
        SFSU_ACCESSIBLE_PARKING.map((pkg) => {
          const pos = gpsToPercent(pkg.coordinates);
          const isSelected = selectedParking?.id === pkg.id;

          return (
            <div
              key={pkg.id}
              style={{ left: pos.left, top: pos.top }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-15"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedParking(pkg);
                  setSelectedBuilding(null);
                  setSelectedReport(null);
                }}
                className={`cursor-pointer px-2 py-1 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-purple-950 border-white scale-125 z-30'
                    : 'bg-blue-700 hover:bg-blue-600 text-white border-blue-300 hover:scale-110'
                }`}
                title={`${pkg.name} (${pkg.totalStalls} ADA Stalls)`}
              >
                <FaSquareParking className="w-3.5 h-3.5" />
                <span className="font-black text-[10px]">{pkg.code}</span>
              </button>
            </div>
          );
        })}

      {/* Reported Campus Accessibility Barriers (Filtered along active route when waypoints active) */}
      {showHazards &&
        reports
          .filter((r) => r.status !== 'resolved')
          .filter((rep) => !hasActiveWaypoints || !focusRouteOnly || isNearbyRoute(rep.coordinates))
          .map((rep) => {
            const pos = gpsToPercent(rep.coordinates);
            const isSelected = selectedReport?.id === rep.id;

            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => {
                  setSelectedReport(rep);
                  setSelectedBuilding(null);
                  setSelectedParking(null);
                }}
                style={{ left: pos.left, top: pos.top }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform cursor-pointer border-2 ${
                  isSelected
                    ? 'bg-rose-500 text-white border-white scale-125'
                    : 'bg-amber-400 text-purple-950 border-purple-950 hover:scale-125'
                }`}
                title={`${rep.title} - ${rep.urgency}`}
              >
                <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0" />
              </button>
            );
          })}

      {/* Active Route Vector Line connecting origin to destination */}
      {activeRoute && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            {activeRoute.pathCoordinates && activeRoute.pathCoordinates.length >= 2 && (
              <polyline
                points={activeRoute.pathCoordinates
                  .map((pt) => {
                    const p = gpsToPercent(pt);
                    return `${parseFloat(p.left)},${parseFloat(p.top)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.2"
                strokeDasharray="2 1"
                strokeLinecap="round"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )}

      {/* Active Route Waypoints Overlaid on Radar Map */}
      {activeRoute &&
        activeRoute.steps &&
        activeRoute.steps.map((step, idx) => {
          const pos = gpsToPercent(step.coordinates);
          const isSelected = selectedWaypointIndex === idx;
          const isFirst = idx === 0;
          const isLast = idx === activeRoute.steps.length - 1;

          return (
            <div
              key={`radar-wp-${idx}`}
              style={{ left: pos.left, top: pos.top }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-25 transition-all cursor-pointer ${
                isSelected ? 'scale-125 z-40' : 'hover:scale-110'
              }`}
              onClick={() => {
                if (onSelectWaypoint) onSelectWaypoint(idx);
                setSelectedWaypointPopup({ index: idx, step });
              }}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border shadow-lg ${
                  isSelected
                    ? 'bg-amber-400 text-purple-950 border-white ring-2 ring-purple-600'
                    : isFirst
                    ? 'bg-emerald-600 text-white border-white'
                    : isLast
                    ? 'bg-amber-500 text-purple-950 border-white'
                    : 'bg-purple-800 text-white border-purple-300'
                }`}
              >
                {idx + 1}
              </div>
            </div>
          );
        })}
    </div>
  );

  return (
    <div
      className={
        containerClassName ||
        'relative w-full h-[520px] lg:h-[620px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900'
      }
    >
      {/* Floating Active Route Bar with Google Maps Action */}
      {activeRoute && (
        <div className="absolute top-14 left-3 z-20 max-w-sm sm:max-w-md bg-slate-950/95 backdrop-blur-md text-white p-2.5 rounded-xl border border-blue-400/40 shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0"></span>
              <span className="font-extrabold text-xs text-white truncate">{activeRoute.title}</span>
            </div>
            <div className="text-[10px] text-blue-200">
              {activeRoute.distanceMeters}m • ~{activeRoute.estimatedMinutes} mins • {activeRoute.pathCoordinates.length} waypoints
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenSingleModal && (
              <button
                type="button"
                onClick={onOpenSingleModal}
                className="px-2.5 py-1.5 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 text-white font-extrabold text-[11px] rounded-lg shadow transition-transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer border border-purple-400/40"
                title="View map and turn-by-turn route together in one single modal"
              >
                <FaExpand className="w-2.5 h-2.5 text-amber-300" />
                <span>Single Modal</span>
              </button>
            )}

            {activeRoute.googleMapsUrl && (
              <a
                href={activeRoute.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-lg shadow transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0"
                title="Open full walking directions in Google Maps app"
              >
                <FaArrowUpRightFromSquare className="w-2.5 h-2.5" />
                <span>Google Maps</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Map Control Overlay */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200 text-xs flex flex-wrap items-center gap-2.5 max-w-[90%]">
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <FaLayerGroup className="w-3.5 h-3.5 text-purple-700" />
          Layers:
        </span>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showElevators}
            onChange={(e) => setShowElevators(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium flex items-center gap-1">
            <FaElevator className="w-3 h-3 text-purple-700" />
            Elevators
          </span>
        </label>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showEntrances}
            onChange={(e) => setShowEntrances(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium flex items-center gap-1">
            <FaWheelchair className="w-3 h-3 text-blue-600" />
            Power Doors
          </span>
        </label>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showParking}
            onChange={(e) => setShowParking(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium flex items-center gap-1">
            <FaSquareParking className="w-3 h-3 text-blue-700" />
            ADA Parking
          </span>
        </label>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHazards}
            onChange={(e) => setShowHazards(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium text-rose-700 flex items-center gap-1">
            <FaTriangleExclamation className="w-3 h-3 text-rose-600" />
            Barriers ({reports.filter((r) => r.status !== 'resolved').length})
          </span>
        </label>

        {/* Route Focus Mode Toggle (Minimizes landmarks other than relevant ones) */}
        {hasActiveWaypoints && (
          <button
            type="button"
            onClick={() => setFocusRouteOnly((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              focusRouteOnly
                ? 'bg-purple-900 text-amber-300 border-amber-400/60 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Toggle landmark minimization along the active corridor"
          >
            <span>{focusRouteOnly ? '🎯 Route Focus: Active' : '👁️ Show All Landmarks'}</span>
          </button>
        )}
      </div>

      {/* Map Mode Indicator */}
      <div className="absolute top-3 right-3 z-20">
        {shouldRenderGoogleMaps ? (
          <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-md flex items-center gap-1.5 border border-emerald-400/50">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            Google Maps Active
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 bg-purple-950/95 text-amber-300 border border-amber-400/50 font-bold text-[10px] rounded-lg shadow-md flex items-center gap-1.5 backdrop-blur-md">
              <FaCompass className="w-3.5 h-3.5 text-amber-300" />
              {mapsError ? 'Demo / Offline Radar Mode (Fallback)' : 'Demo / Offline Mode (Radar)'}
            </span>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200 text-[11px] hidden sm:block">
        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          <FaWheelchair className="w-3.5 h-3.5 text-purple-700" />
          Campus Accessibility Legend
        </div>
        <div className="space-y-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <FaWheelchair className="w-3.5 h-3.5 text-blue-600" />
            <span>Power Auto Entrance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaSquareParking className="w-3.5 h-3.5 text-blue-700" />
            <span>Accessible ADA Parking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaElevator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Elevator Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaElevator className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>Elevator Out of Service</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaTriangleExclamation className="w-3.5 h-3.5 text-amber-500" />
            <span>Active Hazard / Detour</span>
          </div>
        </div>
      </div>

      {/* Map Container: Live Google Maps (Guarded) or Offline Campus Radar */}
      {shouldRenderGoogleMaps ? (
        <MapErrorBoundary
          fallback={renderRadarView()}
          onError={() => setMapsError(GOOGLE_MAPS_ERRORS.AUTH_FAILURE)}
        >
          <Map
            id="campus-map"
            mapId="DEMO_MAP_ID"
            defaultCenter={SFSU_FALLBACK_STARTING_POINT.coordinates}
            defaultZoom={17}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={true}
          >
            {/* Map Camera Controller to center starting point when idle */}
            <MapCenterController
              center={effectiveStartingPoint}
              hasActiveRoute={Boolean(activeRoute && activeRoute.steps && activeRoute.steps.length > 0)}
            />

            {/* Live Starting Point Marker (Current Location or Student Life Events Center / Annex I) */}
            {(!activeRoute || !activeRoute.steps || activeRoute.steps.length === 0) && (
              <AdvancedMarker
                position={effectiveStartingPoint}
                title={hasAcquiredLiveLocation ? "Your Current Starting Location" : "Starting Point: Student Life Events Center / Annex I"}
                zIndex={55}
              >
                <div className="cursor-pointer flex flex-col items-center">
                  <div className="px-2.5 py-1 rounded-xl bg-purple-950 text-amber-300 border-2 border-amber-400 font-extrabold text-[11px] shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{hasAcquiredLiveLocation ? '📍 Current Location (Start)' : '🏛️ Annex I (Start Point)'}</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-purple-950 rotate-45 -mt-1 border-r border-b border-amber-400"></div>
                </div>
              </AdvancedMarker>
            )}

            {/* Render Campus Buildings & Elevators */}
            {buildings.map((building) => {
              const hasBrokenElevator = building.elevators.some((e) => e.status === 'down');
              const isRelevant = isRelevantBuilding(building);

              // When waypoints are showing and landmark is not relevant, minimize it to a subtle dot
              if (hasActiveWaypoints && focusRouteOnly && !isRelevant) {
                return (
                  <AdvancedMarker
                    key={building.id}
                    position={building.coordinates}
                    title={`${building.name} (Non-route landmark - tap to inspect)`}
                    zIndex={5}
                    onClick={() => {
                      setSelectedBuilding(building);
                      setSelectedReport(null);
                      setSelectedParking(null);
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full bg-slate-400/40 hover:bg-purple-500 hover:scale-150 border border-slate-300/50 shadow-xs transition-all cursor-pointer"
                      title={building.name}
                    />
                  </AdvancedMarker>
                );
              }

              return (
                <React.Fragment key={building.id}>
                  {/* Building Advanced Marker */}
                  <AdvancedMarker
                    position={building.coordinates}
                    title={building.name}
                    zIndex={isRelevant && hasActiveWaypoints ? 45 : 15}
                    onClick={() => {
                      setSelectedBuilding(building);
                      setSelectedReport(null);
                      setSelectedParking(null);
                    }}
                  >
                    <div
                      className={`cursor-pointer px-2.5 py-1 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-110 ${
                        isRelevant && hasActiveWaypoints
                          ? 'bg-purple-950 text-amber-300 border-amber-400 ring-2 ring-amber-400/50 scale-105'
                          : hasBrokenElevator
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-purple-900 text-white border-purple-400'
                      }`}
                    >
                      <FaBuilding className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-extrabold">{building.code}</span>
                      {hasBrokenElevator && (
                        <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
                      )}
                    </div>
                  </AdvancedMarker>

                  {/* Accessible Entrances with Power Doors (Shown for relevant buildings) */}
                  {showEntrances &&
                    (!hasActiveWaypoints || !focusRouteOnly || isRelevant) &&
                    building.accessibleEntrances.map((entrance, idx) => (
                      <AdvancedMarker
                        key={`${building.id}-entrance-${idx}`}
                        position={entrance.coordinates}
                        title={`${building.name} - ${entrance.description}`}
                        onClick={() => {
                          setSelectedBuilding(building);
                          setSelectedReport(null);
                          setSelectedParking(null);
                        }}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md border ${
                            entrance.hasPowerDoor
                              ? 'bg-blue-600 text-white border-blue-300'
                              : 'bg-slate-700 text-white border-slate-400'
                          }`}
                        >
                          <FaWheelchair className="w-3.5 h-3.5 text-white" />
                        </div>
                      </AdvancedMarker>
                    ))}
                </React.Fragment>
              );
            })}

            {/* Accessible Parking Locations on Google Maps (Hidden when focusing on route corridor) */}
            {showParking &&
              (!hasActiveWaypoints || !focusRouteOnly) &&
              SFSU_ACCESSIBLE_PARKING.map((pkg) => (
                <AdvancedMarker
                  key={pkg.id}
                  position={pkg.coordinates}
                  title={`${pkg.name} (${pkg.totalStalls} ADA Stalls)`}
                  onClick={() => {
                    setSelectedParking(pkg);
                    setSelectedBuilding(null);
                    setSelectedReport(null);
                  }}
                >
                  <div className="cursor-pointer px-2 py-1 rounded-xl shadow-lg border-2 border-white bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-110">
                    <FaSquareParking className="w-4 h-4 text-white" />
                    <span className="font-extrabold text-[11px]">{pkg.code}</span>
                  </div>
                </AdvancedMarker>
              ))}

            {/* Active Barriers & Hazards (Filtered along route corridor when waypoints active) */}
            {showHazards &&
              reports
                .filter((r) => r.status !== 'resolved')
                .filter((rep) => !hasActiveWaypoints || !focusRouteOnly || isNearbyRoute(rep.coordinates))
                .map((rep) => (
                  <AdvancedMarker
                    key={rep.id}
                    position={rep.coordinates}
                    title={`${rep.title} (${rep.urgency})`}
                    onClick={() => {
                      setSelectedReport(rep);
                      setSelectedBuilding(null);
                      setSelectedParking(null);
                    }}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-purple-950 border-2 border-purple-950 flex items-center justify-center shadow-lg hover:scale-125 transition-transform cursor-pointer">
                      <FaTriangleExclamation className="w-4 h-4 text-purple-950" />
                    </div>
                  </AdvancedMarker>
                ))}

            {/* Active Accessible Route Polyline */}
            {activeRoute && activeRoute.pathCoordinates && activeRoute.pathCoordinates.length > 0 && (
              <PolylineOverlay
                path={activeRoute.pathCoordinates}
                strokeColor="#2563eb"
                strokeWeight={6}
                strokeOpacity={0.9}
              />
            )}

            {/* Turn-by-Turn Accessible Waypoint Markers Overlaid on Google Map */}
            {activeRoute &&
              activeRoute.steps &&
              activeRoute.steps.map((step, idx) => {
                const isSelected = selectedWaypointIndex === idx;
                const isFirst = idx === 0;
                const isLast = idx === activeRoute.steps.length - 1;

                return (
                  <AdvancedMarker
                    key={`route-waypoint-${idx}`}
                    position={step.coordinates}
                    title={`Waypoint ${idx + 1}: ${step.instruction}`}
                    zIndex={isSelected ? 60 : 35}
                    onClick={() => {
                      if (onSelectWaypoint) onSelectWaypoint(idx);
                      setSelectedWaypointPopup({ index: idx, step });
                      setSelectedBuilding(null);
                      setSelectedReport(null);
                      setSelectedParking(null);
                    }}
                  >
                    <div
                      className={`cursor-pointer transition-all duration-200 transform flex flex-col items-center ${
                        isSelected ? 'scale-125 -translate-y-2' : 'hover:scale-115'
                      }`}
                    >
                      {/* Waypoint Numbered Circle Badge */}
                      <div
                        className={`flex items-center justify-center font-black text-xs rounded-full shadow-2xl border-2 transition-all ${
                          isSelected
                            ? 'w-9 h-9 bg-purple-900 text-amber-300 border-amber-300 ring-4 ring-amber-400/60 shadow-purple-950/70'
                            : isFirst
                            ? 'w-7 h-7 bg-emerald-600 text-white border-white shadow-emerald-900/40'
                            : isLast
                            ? 'w-7 h-7 bg-amber-500 text-purple-950 border-white shadow-amber-900/40'
                            : 'w-7 h-7 bg-blue-700 text-white border-white shadow-blue-900/40'
                        }`}
                      >
                        {isFirst ? (
                          <span className="text-[10px] uppercase font-black">1</span>
                        ) : isLast ? (
                          <FaWheelchair className="w-3.5 h-3.5" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      {/* Waypoint Sub-Label */}
                      <div
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md text-center shadow-md -mt-1 border ${
                          isSelected
                            ? 'bg-amber-400 text-purple-950 border-amber-500 font-extrabold'
                            : 'bg-purple-950/90 text-white border-purple-400/50'
                        }`}
                      >
                        {isFirst ? 'Start' : isLast ? 'Arrival' : `WP ${idx + 1}`}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}
          </Map>
        </MapErrorBoundary>
      ) : (
        renderRadarView()
      )}

      {/* Waypoint Info Window Popup (When a Waypoint Pin is Clicked on Map) */}
      {selectedWaypointPopup && (
        <div className="absolute bottom-4 left-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-purple-400 text-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-purple-900 text-amber-300 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                {selectedWaypointPopup.index + 1}
              </span>
              <div>
                <h4 className="font-black text-sm text-purple-950 leading-tight">
                  Waypoint #{selectedWaypointPopup.index + 1}
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  GPS: {selectedWaypointPopup.step.coordinates.lat.toFixed(4)}, {selectedWaypointPopup.step.coordinates.lng.toFixed(4)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedWaypointPopup(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1.5 py-0.5 rounded bg-slate-100"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-800 text-xs font-bold leading-relaxed">
            {selectedWaypointPopup.step.instruction}
          </p>

          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-950">
            <strong className="block text-purple-900 font-bold mb-0.5">ADA Guidance:</strong>
            {selectedWaypointPopup.step.accessibilityNotes}
          </div>

          <div className="flex items-center justify-between pt-1">
            {activeRoute?.googleMapsUrl && (
              <a
                href={activeRoute.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
                <span>Navigate in Google Maps</span>
              </a>
            )}

            <button
              onClick={() => setSelectedWaypointPopup(null)}
              className="text-purple-700 hover:text-purple-950 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Building Info Window / Popup Card */}
      {selectedBuilding && (
        <div className="absolute bottom-4 left-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-purple-950 font-mono">
                  [{selectedBuilding.code}]
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                  {selectedBuilding.name}
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedBuilding.accessibleEntrances.length} Accessible Entrances •{' '}
                {selectedBuilding.elevators.length} Elevators
              </p>
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1.5 py-0.5 rounded bg-slate-100"
            >
              ✕
            </button>
          </div>

          {/* Elevator Status List */}
          <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
              <FaElevator className="w-3 h-3 text-purple-700" />
              Elevators & Lifts:
            </span>
            {selectedBuilding.elevators.length === 0 ? (
              <p className="text-slate-400 italic">No elevators in this single-story structure.</p>
            ) : (
              selectedBuilding.elevators.map((elev) => (
                <div key={elev.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-800 font-medium">
                    {elev.name} (Fl: {elev.floorsServed})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      elev.status === 'operational'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800 animate-pulse'
                    }`}
                  >
                    {elev.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Accessible Entrances */}
          <div className="space-y-1 bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
            <span className="font-bold text-purple-950 flex items-center gap-1 text-[11px]">
              <FaWheelchair className="w-3 h-3 text-blue-600" />
              Power Automated Entrances:
            </span>
            {selectedBuilding.accessibleEntrances.map((entrance, idx) => (
              <div key={idx} className="text-[11px] text-purple-900 flex items-center gap-1">
                <span>•</span>
                <span>{entrance.description}</span>
                {entrance.hasPowerDoor && (
                  <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800">
                    Auto-Door
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                onSelectBuildingForRoute(selectedBuilding, false);
                setSelectedBuilding(null);
              }}
              className="flex-1 py-2 bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center gap-1.5"
            >
              <FaRoute className="w-3.5 h-3.5" />
              <span>Route Here</span>
            </button>
            <button
              onClick={() => {
                onReportAtLocation(selectedBuilding.name, selectedBuilding.coordinates, selectedBuilding.id);
                setSelectedBuilding(null);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold rounded-xl transition-colors"
              title="Report an accessibility issue at this building"
            >
              <FaTriangleExclamation className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Accessible Parking Details Popup Card */}
      {selectedParking && (
        <div className="absolute bottom-4 left-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-blue-200 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <FaSquareParking className="w-4 h-4 text-blue-700" />
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                  {selectedParking.name}
                </h4>
              </div>
              <p className="text-[11px] text-blue-800 font-semibold mt-0.5">
                {selectedParking.totalStalls} ADA Stalls • {selectedParking.vanAccessibleStalls} Van Accessible • {selectedParking.evAccessibleStalls} EV Accessible
              </p>
            </div>
            <button
              onClick={() => setSelectedParking(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1.5 py-0.5 rounded bg-slate-100"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-slate-700">
            <div>
              <span className="font-bold text-blue-950">Required Permit: </span>
              <span>{selectedParking.permitRequirement}</span>
            </div>
            <div>
              <span className="font-bold text-blue-950">Pedestrian Route: </span>
              <span>{selectedParking.pedestrianRoute}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedParking.coordinates.lat},${selectedParking.coordinates.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-transform hover:scale-105"
            >
              <FaSquareParking className="w-3.5 h-3.5" />
              <span>Drive & Park in Google Maps</span>
            </a>

            <button
              onClick={() => {
                onReportAtLocation(selectedParking.name, selectedParking.coordinates);
                setSelectedParking(null);
              }}
              className="text-slate-500 hover:text-purple-900 font-semibold text-xs"
            >
              Report Issue
            </button>
          </div>
        </div>
      )}

      {/* Hazard Report Info Window */}
      {selectedReport && (
        <div className="absolute bottom-4 left-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-rose-200 text-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-100 text-rose-800">
                <FaTriangleExclamation className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                  {selectedReport.title}
                </h4>
                <span className="text-[10px] text-slate-500">{selectedReport.locationName}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1.5 py-0.5 rounded bg-slate-100"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-600 text-[11px] leading-relaxed">{selectedReport.description}</p>

          {selectedReport.aiAnalysis?.suggestedDetour && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              <strong className="block text-amber-950 font-bold">Suggested ADA Detour:</strong>
              {selectedReport.aiAnalysis.suggestedDetour}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Reported: {selectedReport.reportedAt}</span>
            <span className="font-bold text-purple-900">{selectedReport.upvotes} Student Verifications</span>
          </div>
        </div>
      )}
    </div>
  );
}
