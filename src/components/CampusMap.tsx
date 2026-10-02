import React, { useState, useEffect, Component, ErrorInfo } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { CampusBuilding, AccessibilityReport, Coordinates, AccessibleRouteOption } from '../types';
import { PolylineOverlay } from './PolylineOverlay';
import { SFSU_CENTER } from '../data/sfsuCampusData';
import {
  isApiKeyConfigured,
  getLastGmpError,
  GoogleMapsErrorInfo,
  GOOGLE_MAPS_ERRORS,
} from '../utils/googleMapsConfig';
import {
  Layers,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Compass,
  MapPin,
  ExternalLink,
  Info,
} from 'lucide-react';

interface CampusMapProps {
  buildings: CampusBuilding[];
  reports: AccessibilityReport[];
  activeRoute: AccessibleRouteOption | null;
  onSelectBuildingForRoute: (building: CampusBuilding, asOrigin: boolean) => void;
  onReportAtLocation: (locationName: string, coords: Coordinates, buildingId?: string) => void;
}

// Convert SFSU GPS coordinates to percentage positions (0-100%) for the radar map
function gpsToPercent(coords: Coordinates): { left: string; top: string } {
  // SFSU campus bounding box
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
  onSelectBuildingForRoute,
  onReportAtLocation,
}: CampusMapProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [selectedReport, setSelectedReport] = useState<AccessibilityReport | null>(null);

  // Layer Toggles
  const [showElevators, setShowElevators] = useState(true);
  const [showEntrances, setShowEntrances] = useState(true);
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
      {/* Offline Mode Prominent Header Notice */}
      <div className="absolute top-12 sm:top-14 left-3 right-3 z-15 pointer-events-none flex justify-center">
        <div className="px-3.5 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-amber-400/40 text-amber-200 text-[11px] shadow-xl flex items-center gap-2 pointer-events-auto max-w-xl text-center">
          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-amber-300">Demo / Offline Mode:</strong> Displaying sample SF State campus barrier, elevator, and power door data (not live Google Maps).
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
        {/* Campus Walkways: Malcolm X Plaza & Quad Axis */}
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
          Lot 20 / West Campus
        </div>
      </div>

      {/* Interactive Campus Buildings */}
      {buildings.map((bldg) => {
        const pos = gpsToPercent(bldg.coordinates);
        const hasBrokenElevator = bldg.elevators.some((e) => e.status === 'down');
        const isSelected = selectedBuilding?.id === bldg.id;

        return (
          <div
            key={bldg.id}
            style={{ left: pos.left, top: pos.top }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-200"
          >
            {/* Building Marker Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedBuilding(bldg);
                setSelectedReport(null);
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
              <Building className="w-3 h-3 shrink-0" />
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
                    E
                  </span>
                ))}
              </div>
            )}

            {/* Power Entrance Indicator */}
            {showEntrances && bldg.accessibleEntrances.some((e) => e.hasPowerDoor) && (
              <div
                className="absolute -bottom-2 -left-1 w-3 h-3 rounded-full bg-blue-600 border border-white shadow flex items-center justify-center text-[7px] text-white"
                title="Power automatic entrance available"
              >
                ♿
              </div>
            )}
          </div>
        );
      })}

      {/* Reported Campus Accessibility Barriers */}
      {showHazards &&
        reports
          .filter((r) => r.status !== 'resolved')
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
                }}
                style={{ left: pos.left, top: pos.top }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform cursor-pointer border-2 ${
                  isSelected
                    ? 'bg-rose-500 text-white border-white scale-125'
                    : 'bg-amber-400 text-purple-950 border-purple-950 hover:scale-125'
                }`}
                title={`${rep.title} - ${rep.urgency}`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              </button>
            );
          })}

      {/* Active Route Vector Line connecting origin to destination */}
      {activeRoute && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {activeRoute.pathCoordinates && activeRoute.pathCoordinates.length >= 2 && (
              <polyline
                points={activeRoute.pathCoordinates
                  .map((pt) => {
                    const p = gpsToPercent(pt);
                    return `${parseFloat(p.left) * 10},${parseFloat(p.top) * 6.2}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="5"
                strokeDasharray="8 4"
                strokeLinecap="round"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-[520px] lg:h-[620px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900">
      {/* Map Control Overlay */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200 text-xs flex flex-wrap items-center gap-2 max-w-[90%]">
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-purple-700" />
          Layers:
        </span>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showElevators}
            onChange={(e) => setShowElevators(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium">Elevators</span>
        </label>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showEntrances}
            onChange={(e) => setShowEntrances(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium">Power Doors</span>
        </label>

        <label className="flex items-center space-x-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHazards}
            onChange={(e) => setShowHazards(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium text-rose-700">
            Barriers ({reports.filter((r) => r.status !== 'resolved').length})
          </span>
        </label>
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
              <Compass className="w-3.5 h-3.5 text-amber-300" />
              {mapsError ? 'Demo / Offline Radar Mode (Fallback)' : 'Demo / Offline Mode (Radar)'}
            </span>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200 text-[11px] hidden sm:block">
        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
          <Compass className="w-3 h-3 text-purple-700" />
          Campus Accessibility Legend
        </div>
        <div className="space-y-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Elevator Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse"></span>
            <span>Elevator Out of Service</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Active Hazard / Detour</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
            <span>Power Auto Entrance</span>
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
            defaultCenter={SFSU_CENTER}
            defaultZoom={17}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={true}
          >
            {/* Render Campus Buildings & Elevators */}
            {buildings.map((building) => {
              const hasBrokenElevator = building.elevators.some((e) => e.status === 'down');

              return (
                <React.Fragment key={building.id}>
                  {/* Building Advanced Marker */}
                  <AdvancedMarker
                    position={building.coordinates}
                    title={building.name}
                    onClick={() => {
                      setSelectedBuilding(building);
                      setSelectedReport(null);
                    }}
                  >
                    <div
                      className={`cursor-pointer px-2.5 py-1 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-110 ${
                        hasBrokenElevator
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-purple-900 text-white border-purple-400'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-extrabold">{building.code}</span>
                      {hasBrokenElevator && (
                        <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
                      )}
                    </div>
                  </AdvancedMarker>

                  {/* Accessible Entrances with Power Doors */}
                  {showEntrances &&
                    building.accessibleEntrances.map((entrance, idx) => (
                      <AdvancedMarker
                        key={`${building.id}-entrance-${idx}`}
                        position={entrance.coordinates}
                        title={`${building.name} - ${entrance.description}`}
                        onClick={() => {
                          setSelectedBuilding(building);
                          setSelectedReport(null);
                        }}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md border ${
                            entrance.hasPowerDoor
                              ? 'bg-blue-600 text-white border-blue-300'
                              : 'bg-slate-700 text-white border-slate-400'
                          }`}
                        >
                          <span className="text-[10px] font-bold">♿</span>
                        </div>
                      </AdvancedMarker>
                    ))}
                </React.Fragment>
              );
            })}

            {/* Active Barriers & Hazards */}
            {showHazards &&
              reports
                .filter((r) => r.status !== 'resolved')
                .map((rep) => (
                  <AdvancedMarker
                    key={rep.id}
                    position={rep.coordinates}
                    title={`${rep.title} (${rep.urgency})`}
                    onClick={() => {
                      setSelectedReport(rep);
                      setSelectedBuilding(null);
                    }}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-purple-950 border-2 border-purple-950 flex items-center justify-center shadow-lg hover:scale-125 transition-transform cursor-pointer">
                      <AlertTriangle className="w-4 h-4 text-purple-950" />
                    </div>
                  </AdvancedMarker>
                ))}

            {/* Active Accessible Route Polyline */}
            {activeRoute && activeRoute.pathCoordinates && activeRoute.pathCoordinates.length > 0 && (
              <PolylineOverlay
                path={activeRoute.pathCoordinates}
                strokeColor="#f59e0b"
                strokeWeight={6}
                strokeOpacity={0.9}
              />
            )}
          </Map>
        </MapErrorBoundary>
      ) : (
        renderRadarView()
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
            <span className="font-bold text-slate-700 block text-[11px]">Elevators & Lifts:</span>
            {selectedBuilding.elevators.length === 0 ? (
              <p className="text-slate-400 italic">No elevators in this single-story structure.</p>
            ) : (
              selectedBuilding.elevators.map((elev) => (
                <div key={elev.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-700 font-medium">
                    {elev.name} (Floors {elev.floorsServed})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                      elev.status === 'operational'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {elev.status === 'operational' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {elev.status === 'operational' ? 'Active' : 'Out of Service'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onSelectBuildingForRoute(selectedBuilding, true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-center text-[11px] transition-colors"
            >
              Start Route Here
            </button>
            <button
              onClick={() => onSelectBuildingForRoute(selectedBuilding, false)}
              className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-center text-[11px] transition-colors"
            >
              Route Destination
            </button>
          </div>
        </div>
      )}

      {/* Report Info Window / Popup Card */}
      {selectedReport && (
        <div className="absolute bottom-4 left-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded bg-amber-100 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                  {selectedReport.title}
                </h4>
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                  {selectedReport.urgency} Urgency • {selectedReport.category.replace('_', ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1.5 py-0.5 rounded bg-slate-100"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
            {selectedReport.description}
          </p>

          {selectedReport.aiAnalysis?.suggestedDetour && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 font-medium">
              <strong>Suggested Detour:</strong> {selectedReport.aiAnalysis.suggestedDetour}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>Work Order: {selectedReport.facilitiesWorkOrderId || 'Pending'}</span>
            <button
              onClick={() => onReportAtLocation(selectedReport.locationName, selectedReport.coordinates)}
              className="text-purple-700 hover:text-purple-900 font-bold"
            >
              Report update
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
