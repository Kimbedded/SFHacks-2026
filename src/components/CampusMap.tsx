import React, { useState } from 'react';
import { Map, AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps';
import { CampusBuilding, AccessibilityReport, Coordinates, AccessibleRouteOption } from '../types';
import { PolylineOverlay } from './PolylineOverlay';
import { SFSU_CENTER } from '../data/sfsuCampusData';
import {
  Layers,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Maximize2,
  Compass,
} from 'lucide-react';

interface CampusMapProps {
  buildings: CampusBuilding[];
  reports: AccessibilityReport[];
  activeRoute: AccessibleRouteOption | null;
  onSelectBuildingForRoute: (building: CampusBuilding, asOrigin: boolean) => void;
  onReportAtLocation: (locationName: string, coords: Coordinates, buildingId?: string) => void;
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

  return (
    <div className="relative w-full h-[520px] lg:h-[620px] rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      {/* Map Control Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200 text-xs flex flex-wrap items-center gap-2 max-w-[90%]">
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
          <span className="text-slate-700 font-medium text-rose-700">Barriers ({reports.filter(r => r.status !== 'resolved').length})</span>
        </label>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200 text-[11px] hidden sm:block">
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

      {/* Google Map Container with explicit CSS height */}
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
          const hasOperationalElevator = building.elevators.some((e) => e.status === 'operational');

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
                <div className="group relative cursor-pointer transform transition-transform hover:scale-110">
                  <div
                    className={`px-2 py-1 rounded-lg shadow-md border text-[11px] font-bold flex items-center gap-1 text-white ${
                      hasBrokenElevator
                        ? 'bg-rose-600 border-rose-800'
                        : 'bg-purple-900 border-purple-950'
                    }`}
                  >
                    <Building className="w-3 h-3" />
                    <span>{building.code}</span>
                    {hasBrokenElevator && <span className="text-[10px]">⚠️</span>}
                  </div>
                </div>
              </AdvancedMarker>

              {/* Accessible Power Door Entrances */}
              {showEntrances &&
                building.accessibleEntrances.map((entrance, idx) => (
                  <AdvancedMarker
                    key={`${building.id}-ent-${idx}`}
                    position={entrance.coordinates}
                    title={`${building.name} Entrance: ${entrance.description}`}
                    onClick={() => {
                      setSelectedBuilding(building);
                      setSelectedReport(null);
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white hover:scale-125 transition-transform cursor-pointer">
                      <span className="text-[10px]">♿</span>
                    </div>
                  </AdvancedMarker>
                ))}

              {/* Elevator Markers */}
              {showElevators &&
                building.elevators.map((elev) => (
                  <AdvancedMarker
                    key={elev.id}
                    position={{
                      lat: building.coordinates.lat + 0.00015,
                      lng: building.coordinates.lng + 0.00015,
                    }}
                    title={`${elev.name} - ${elev.status.toUpperCase()}`}
                    onClick={() => {
                      setSelectedBuilding(building);
                      setSelectedReport(null);
                    }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white cursor-pointer ${
                        elev.status === 'operational'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700 animate-pulse'
                      }`}
                    >
                      <span className="text-[11px] font-bold">🛗</span>
                    </div>
                  </AdvancedMarker>
                ))}
            </React.Fragment>
          );
        })}

        {/* Render Reported Accessibility Hazards */}
        {showHazards &&
          reports
            .filter((r) => r.status !== 'resolved')
            .map((report) => (
              <AdvancedMarker
                key={report.id}
                position={report.coordinates}
                title={report.title}
                onClick={() => {
                  setSelectedReport(report);
                  setSelectedBuilding(null);
                }}
              >
                <div className="cursor-pointer transform hover:scale-125 transition-transform">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                      report.urgency === 'critical'
                        ? 'bg-rose-600 text-white animate-bounce'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
              </AdvancedMarker>
            ))}

        {/* Render Active Accessible Route Polyline */}
        {activeRoute && (
          <PolylineOverlay
            path={activeRoute.pathCoordinates}
            strokeColor="#7c3aed"
            strokeWeight={6}
            strokeOpacity={0.9}
          />
        )}

        {/* Selected Building Info Window */}
        {selectedBuilding && (
          <InfoWindow
            position={selectedBuilding.coordinates}
            onCloseClick={() => setSelectedBuilding(null)}
          >
            <div className="p-1 max-w-xs text-slate-800">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px]">
                  {selectedBuilding.code}
                </span>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  {selectedBuilding.name}
                </h3>
              </div>

              {/* Elevator Summary */}
              {selectedBuilding.elevators.length > 0 && (
                <div className="my-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                    <span>🛗 Elevators ({selectedBuilding.elevators.length}):</span>
                  </div>
                  {selectedBuilding.elevators.map((elev) => (
                    <div key={elev.id} className="flex items-start justify-between gap-1 text-[11px]">
                      <span className="text-slate-600 truncate">{elev.name}</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[10px] uppercase ${
                          elev.status === 'operational'
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-rose-700 bg-rose-50'
                        }`}
                      >
                        {elev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Accessible Entrances */}
              <div className="text-[11px] text-slate-600 mb-2">
                <span className="font-semibold">Accessible Entrances: </span>
                {selectedBuilding.accessibleEntrances.map((e) => e.description).join(' • ')}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    onSelectBuildingForRoute(selectedBuilding, true);
                    setSelectedBuilding(null);
                  }}
                  className="flex-1 py-1 px-2 bg-purple-700 hover:bg-purple-800 text-white rounded text-[11px] font-bold transition-colors"
                >
                  Start Here
                </button>
                <button
                  onClick={() => {
                    onSelectBuildingForRoute(selectedBuilding, false);
                    setSelectedBuilding(null);
                  }}
                  className="flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-[11px] font-bold transition-colors"
                >
                  Navigate To
                </button>
                <button
                  onClick={() => {
                    onReportAtLocation(selectedBuilding.name, selectedBuilding.coordinates, selectedBuilding.id);
                    setSelectedBuilding(null);
                  }}
                  className="py-1 px-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[11px] font-bold transition-colors"
                  title="Report accessibility issue at this building"
                >
                  ⚠️ Report
                </button>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Selected Hazard Report Info Window */}
        {selectedReport && (
          <InfoWindow
            position={selectedReport.coordinates}
            onCloseClick={() => setSelectedReport(null)}
          >
            <div className="p-1 max-w-xs text-slate-800">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedReport.urgency === 'critical'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedReport.urgency} Urgency
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedReport.facilitiesWorkOrderId}
                </span>
              </div>

              <h4 className="font-bold text-sm text-slate-900 leading-snug">
                {selectedReport.title}
              </h4>
              <p className="text-xs text-slate-600 my-1">{selectedReport.description}</p>

              {selectedReport.aiAnalysis?.suggestedDetour && (
                <div className="p-2 my-1.5 rounded bg-purple-50 border border-purple-200 text-[11px] text-purple-900">
                  <span className="font-bold text-purple-950">Safe Detour: </span>
                  {selectedReport.aiAnalysis.suggestedDetour}
                </div>
              )}

              {selectedReport.aiAnalysis?.slopeGradePercentage && (
                <div className="text-[11px] font-semibold text-rose-700">
                  Estimated Slope: {selectedReport.aiAnalysis.slopeGradePercentage}% (ADA Max: 8.33%)
                </div>
              )}

              <div className="text-[10px] text-slate-500 mt-2">
                Reported {selectedReport.reportedAt} • {selectedReport.upvotes} student confirmations
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}
