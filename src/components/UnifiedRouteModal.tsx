import React, { useState, useEffect } from 'react';
import { CampusBuilding, AccessibleRouteOption, Coordinates, AccessibilityReport } from '../types';
import { CampusMap } from './CampusMap';
import {
  FaWheelchair,
  FaVolumeHigh,
  FaCar,
  FaArrowUpRightFromSquare,
  FaXmark,
  FaChevronLeft,
  FaChevronRight,
  FaLocationDot,
  FaCompass,
  FaTriangleExclamation,
  FaRoute,
  FaCheck,
  FaPhone,
} from 'react-icons/fa6';

interface UnifiedRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: AccessibleRouteOption | null;
  selectedCorridorTitle?: string;
  originName: string;
  originAddress: string;
  destinationName: string;
  destinationAddress: string;
  selectedWaypointIndex: number;
  onSelectWaypoint: (idx: number) => void;
  buildings: CampusBuilding[];
  reports: AccessibilityReport[];
  onRequestRide: () => void;
  onOpenHotline: () => void;
  originBuilding?: CampusBuilding | null;
  destBuilding?: CampusBuilding | null;
}

export function UnifiedRouteModal({
  isOpen,
  onClose,
  activeRoute,
  selectedCorridorTitle,
  originName,
  originAddress,
  destinationName,
  destinationAddress,
  selectedWaypointIndex = 0,
  onSelectWaypoint,
  buildings,
  reports,
  onRequestRide,
  onOpenHotline,
  originBuilding,
  destBuilding,
}: UnifiedRouteModalProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Close on Escape key & manage body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeRoute) return null;

  // Text-to-speech audio reader
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const title = selectedCorridorTitle || activeRoute.title;
    const waypointSteps = activeRoute.steps
      .map((s, idx) => `Waypoint ${idx + 1}: ${s.instruction}. ${s.accessibilityNotes}.`)
      .join(' ');

    const textToRead = `${title}. From ${originName} to ${destinationName}. Distance: ${activeRoute.distanceMeters} meters, approximately ${activeRoute.estimatedMinutes} minutes walk. ${activeRoute.isFullyADACompliant ? 'Verified zero-stair corridor.' : 'Check accessibility conditions along the walking route.'} ${waypointSteps}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const currentStep = activeRoute.steps[selectedWaypointIndex] || activeRoute.steps[0];
  const totalSteps = activeRoute.steps.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Unified Route and Map View"
    >
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border-2 border-purple-500/50 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* MODAL HEADER: Title, Origin/Destination addresses, Action Buttons        */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border-b border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-purple-950 font-black flex items-center justify-center shadow-md shrink-0">
                <FaWheelchair className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                    {selectedCorridorTitle || activeRoute.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                    Zero-Stairs ADA Certified
                  </span>
                </div>
                {/* Simplified Addresses */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-purple-200 mt-0.5">
                  <span className="font-semibold text-slate-300">From:</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                    {originName} ({originAddress})
                  </span>
                  <span className="text-purple-400 font-bold">➔</span>
                  <span className="font-semibold text-slate-300">To:</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded font-mono text-[11px] text-emerald-300">
                    {destinationName} ({destinationAddress})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            {activeRoute.googleMapsUrl && (
              <a
                href={activeRoute.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
                title="Open pedestrian walking route in Google Maps app"
              >
                <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
                <span>Open in Google Maps</span>
              </a>
            )}

            <button
              onClick={handleToggleSpeak}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-purple-800/80 hover:bg-purple-700 text-white border-purple-500/60'
              }`}
              title="Voice navigation"
            >
              <FaVolumeHigh className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'Stop Voice' : 'Read Aloud'}</span>
            </button>

            <button
              onClick={onRequestRide}
              className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Request Gator Cart electric golf shuttle"
            >
              <FaCar className="w-3.5 h-3.5" />
              <span>Gator Cart</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer border border-white/20 ml-1"
              title="Close modal"
              aria-label="Close modal"
            >
              <FaXmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning notice if elevator down */}
        {activeRoute.warningNotice && (
          <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-2">
            <FaTriangleExclamation className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{activeRoute.warningNotice}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL BODY: Split View (Turn-by-turn waypoints on left, map on right)   */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT PANEL: Waypoint Stepper & Details (~38% width on desktop) */}
          <div className="w-full lg:w-[38%] bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
            {/* Waypoint Header & Stepper */}
            <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                    <FaCompass className="w-3.5 h-3.5 text-purple-400" />
                    <span>Turn-by-Turn Waypoints</span>
                  </h4>
                  <span className="text-[11px] text-purple-300">
                    Waypoint {selectedWaypointIndex + 1} of {totalSteps} • Overlaid on Map
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={selectedWaypointIndex === 0}
                    onClick={() => onSelectWaypoint(Math.max(0, selectedWaypointIndex - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-purple-900 disabled:opacity-40 text-white flex items-center justify-center transition-colors border border-slate-700 cursor-pointer"
                    title="Previous waypoint"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    disabled={selectedWaypointIndex === totalSteps - 1}
                    onClick={() => onSelectWaypoint(Math.min(totalSteps - 1, selectedWaypointIndex + 1))}
                    className="w-7 h-7 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                    title="Next waypoint"
                  >
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Waypoint Stepper Numbers */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {activeRoute.steps.map((step, idx) => {
                  const isSelected = selectedWaypointIndex === idx;
                  const isFirst = idx === 0;
                  const isLast = idx === totalSteps - 1;

                  return (
                    <button
                      key={`modal-step-dot-${idx}`}
                      onClick={() => onSelectWaypoint(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-purple-950 shadow-lg scale-105 ring-2 ring-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      <span className="text-[10px]">{isFirst ? 'Start' : isLast ? 'End' : `WP ${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Waypoints List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeRoute.steps.map((step, idx) => {
                const isSelected = selectedWaypointIndex === idx;
                const isFirst = idx === 0;
                const isLast = idx === totalSteps - 1;

                return (
                  <div
                    key={`modal-wp-card-${idx}`}
                    onClick={() => onSelectWaypoint(idx)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-purple-950/80 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-purple-400/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${
                          isFirst
                            ? 'bg-emerald-500 text-white'
                            : isLast
                            ? 'bg-amber-400 text-purple-950'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {isFirst ? '1 • Departure' : isLast ? `${idx + 1} • Arrival` : `Waypoint ${idx + 1}`}
                      </span>
                    </div>

                    <p className="font-extrabold text-xs text-white leading-snug">
                      {step.instruction}
                    </p>

                    <div className="p-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-[11px] text-purple-200">
                      <strong className="block text-amber-300 font-bold mb-0.5">ADA Guidance:</strong>
                      {step.accessibilityNotes}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metrics footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <FaCheck className="w-3 h-3" />
                Zero Stairs ADA
              </span>
              <span>
                {activeRoute.distanceMeters}m • ~{activeRoute.estimatedMinutes} mins • Slope &lt; {activeRoute.maxSlopeGrade}%
              </span>
            </div>
          </div>

          {/* RIGHT PANEL: Live Interactive Map Overlaid with Waypoints (~62% width on desktop) */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden flex flex-col">
            <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2 shadow-lg">
              <span className="font-bold">Focused Route Corridor</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">(Non-relevant landmarks minimized)</span>
            </div>

            <CampusMap
              buildings={buildings}
              reports={reports}
              activeRoute={activeRoute}
              selectedWaypointIndex={selectedWaypointIndex}
              onSelectWaypoint={onSelectWaypoint}
              onSelectBuildingForRoute={() => {}}
              onReportAtLocation={() => {}}
              originBuilding={originBuilding}
              destBuilding={destBuilding}
              isFocusMode={true}
              containerClassName="relative w-full h-full min-h-[350px] lg:min-h-full rounded-none overflow-hidden bg-slate-950"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
