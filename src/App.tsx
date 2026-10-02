/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Header } from './components/Header';
import { QuotaBanner } from './components/QuotaBanner';
import { OfflineCacheBanner } from './components/OfflineCacheBanner';
import { TransitAlertsBanner } from './components/TransitAlertsBanner';
import { testFirestoreConnection } from './firebase/config';
import { subscribeToElevators, updateElevatorStatus } from './firebase/elevatorFacilityService';
import { CampusMap } from './components/CampusMap';
import { RoutePlanner } from './components/RoutePlanner';
import { SubmitReportView } from './components/SubmitReportView';
import { ElevatorStatusDashboard } from './components/ElevatorStatusDashboard';
import { GatorMobilityView } from './components/GatorMobilityView';
import { HotlineModal } from './components/HotlineModal';
import { GeminiVoiceWidget } from './components/GeminiVoiceWidget';
import { SFSU_BUILDINGS, INITIAL_REPORTS, TRANSIT_ALERTS } from './data/sfsuCampusData';
import { CampusBuilding, AccessibilityReport, AccessibleRouteOption, Coordinates } from './types';
import {
  Compass,
  AlertTriangle,
  Car,
  Camera,
  Heart,
  Phone,
  ShieldCheck,
  Sparkles,
  Info,
  ChevronDown,
} from 'lucide-react';
import {
  FaWheelchair,
  FaPhone,
  FaHeart,
  FaArrowUpRightFromSquare,
  FaDownload,
} from 'react-icons/fa6';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.GOOGLE_MAPS_API_KEY ||
  'AIzaSyDDi2LqAxzS8Pfq-WS-MLIsyoB7cOyKAms';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'report' | 'elevators' | 'support'>('map');
  const [buildings, setBuildings] = useState<CampusBuilding[]>(SFSU_BUILDINGS);
  const [reports, setReports] = useState<AccessibilityReport[]>(INITIAL_REPORTS);
  const [transitAlerts] = useState(TRANSIT_ALERTS);

  // Navigation State
  const [originBuilding, setOriginBuilding] = useState<CampusBuilding | null>(SFSU_BUILDINGS[10]); // Transit hub default
  const [destBuilding, setDestBuilding] = useState<CampusBuilding | null>(SFSU_BUILDINGS[0]); // Cesar Chavez Student Center default
  const [activeRoute, setActiveRoute] = useState<AccessibleRouteOption | null>(null);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number | null>(0);

  // Prefill for report creation when clicking on map
  const [prefillLocation, setPrefillLocation] = useState<{ name: string; buildingId?: string } | undefined>();

  // Modals & Accessibility Settings
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [visualAlertsOnly, setVisualAlertsOnly] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(true);

  // Fetch live reports and building statuses from API & sync with Firebase
  useEffect(() => {
    testFirestoreConnection().catch(console.warn);

    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.reports) {
          setReports(data.reports);
        }
      })
      .catch((err) => console.log('Using default campus reports', err));

    fetch('/api/buildings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.buildings) {
          setBuildings(data.buildings);
        }
      })
      .catch((err) => console.log('Using default buildings', err));

    // Live real-time elevator synchronization across campus via Firestore
    const unsub = subscribeToElevators((fbElevators) => {
      setBuildings((prev) =>
        prev.map((bldg) => ({
          ...bldg,
          elevators: bldg.elevators.map((elev) => {
            const fb = fbElevators.find((item) => item.id === elev.id);
            if (fb) {
              return {
                ...elev,
                status: (fb.isOperational ? 'operational' : 'down') as any,
                statusReason: fb.statusReason || elev.statusReason,
              };
            }
            return elev;
          }),
        }))
      );
    });

    return () => unsub();
  }, []);

  // When an elevator is toggled in Dashboard
  const handleToggleElevator = async (elevatorId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'operational' ? 'down' : 'operational';

    try {
      // Sync to Firebase Firestore with audit log
      await updateElevatorStatus(elevatorId, newStatus === 'operational');
    } catch (fbErr) {
      console.warn('Firebase elevator update warning:', fbErr);
    }

    try {
      const response = await fetch(`/api/elevators/${elevatorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setBuildings((prev) =>
          prev.map((bldg) => ({
            ...bldg,
            elevators: bldg.elevators.map((elev) =>
              elev.id === elevatorId ? { ...elev, status: newStatus as any, lastChecked: 'Just now (Toggled)' } : elev
            ),
          }))
        );
      }
    } catch (err) {
      // Local optimistic update
      setBuildings((prev) =>
        prev.map((bldg) => ({
          ...bldg,
          elevators: bldg.elevators.map((elev) =>
            elev.id === elevatorId ? { ...elev, status: newStatus as any, lastChecked: 'Just now' } : elev
          ),
        }))
      );
    }
  };

  // Upvote / Confirm Report
  const handleUpvoteReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/upvote`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, upvotes: data.upvotes, urgency: data.urgency } : r
          )
        );
      }
    } catch (err) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
      );
    }
  };

  const handleSelectBuildingForRoute = (building: CampusBuilding, asOrigin: boolean) => {
    if (asOrigin) {
      setOriginBuilding(building);
    } else {
      setDestBuilding(building);
    }
    setActiveTab('map');
  };

  const handleReportAtLocation = (locationName: string, _coords: Coordinates, buildingId?: string) => {
    setPrefillLocation({ name: locationName, buildingId });
    setActiveTab('report');
  };

  const handleReportSubmitted = (newReport: AccessibilityReport) => {
    setReports((prev) => [newReport, ...prev]);
    // If report is an elevator outage, mark that building's elevator
    if (newReport.category === 'broken_elevator' && newReport.buildingId) {
      setBuildings((prev) =>
        prev.map((b) =>
          b.id === newReport.buildingId
            ? {
                ...b,
                elevators: b.elevators.map((e, idx) =>
                  idx === 0 ? { ...e, status: 'down', lastChecked: 'Just now (Student Report)' } : e
                ),
              }
            : b
        )
      );
    }
  };

  const hasElevatorDownInDest =
    Boolean(destBuilding && destBuilding.elevators.some((e) => e.status === 'down'));

  const handleGeminiVoiceNavigate = (
    targetTab: 'map' | 'report' | 'elevators' | 'support',
    actionDetails?: any,
    openModal?: 'hotline' | 'none'
  ) => {
    setActiveTab(targetTab);

    if (openModal === 'hotline') {
      setIsHotlineOpen(true);
    }

    if (actionDetails) {
      const origId = actionDetails.originBuildingId;
      const destId = actionDetails.destBuildingId || actionDetails.destinationBuildingId || actionDetails.buildingId;
      const bldgName = actionDetails.buildingName;

      if (origId) {
        const found = buildings.find(
          (b) =>
            b.id.toLowerCase() === origId.toLowerCase() ||
            b.name.toLowerCase().includes(origId.toLowerCase()) ||
            b.code.toLowerCase() === origId.toLowerCase()
        );
        if (found) setOriginBuilding(found);
      }
      if (destId) {
        const found = buildings.find(
          (b) =>
            b.id.toLowerCase() === destId.toLowerCase() ||
            b.name.toLowerCase().includes(destId.toLowerCase()) ||
            b.code.toLowerCase() === destId.toLowerCase()
        );
        if (found) setDestBuilding(found);
      } else if (bldgName) {
        const found = buildings.find(
          (b) =>
            b.name.toLowerCase().includes(bldgName.toLowerCase()) ||
            b.code.toLowerCase().includes(bldgName.toLowerCase())
        );
        if (found) setDestBuilding(found);
      }

      if (actionDetails.buildingName || actionDetails.reportCategory || actionDetails.reportDescription) {
        setPrefillLocation({
          name: actionDetails.buildingName || 'Campus Reported Location',
          buildingId: origId || destId,
        });
      }
    }

    // Smoothly scroll down so the student immediately sees their route
    setTimeout(() => {
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }, 150);
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geometry', 'marker']}>
      <div
        className={`min-h-screen flex flex-col font-sans transition-colors ${
          highContrast
            ? 'bg-black text-amber-300 font-mono contrast-125'
            : 'bg-slate-100 text-slate-900'
        } ${largeText ? 'text-lg' : 'text-base'}`}
      >
        {/* Google Maps Quota Defense Banner (Case A compliant) */}
        <QuotaBanner />

        {/* Offline & Service Worker Cache Status Indicator */}
        <OfflineCacheBanner />

        {/* Visual Alerts Notification Bar if active */}
        {visualAlertsOnly && (
          <div className="bg-indigo-900 text-white px-4 py-1.5 text-xs text-center border-b border-indigo-700 flex items-center justify-center gap-2">
            <span className="font-bold">Visual Accommodation Active:</span>
            <span>All campus audible announcements and alerts will display prominent high-contrast text banners.</span>
          </div>
        )}

        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenHotline={() => setIsHotlineOpen(true)}
          onOpenRideRequest={() => setActiveTab('support')}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
          largeText={largeText}
          setLargeText={setLargeText}
          visualAlertsOnly={visualAlertsOnly}
          setVisualAlertsOnly={setVisualAlertsOnly}
        />

        {/* SFSU Transit & BART Alert Bar */}
        <TransitAlertsBanner alerts={transitAlerts} />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 space-y-6">
          {/* TAB 1: CAMPUS NAVIGATOR */}
          {activeTab === 'map' && (
            <div className="space-y-6 animate-fadeIn">
              {/* How to Use Prompt / Welcome Guide */}
              {showWelcomeGuide && (
                <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white p-5 rounded-2xl shadow-xl border border-purple-800 relative">
                  <button
                    onClick={() => setShowWelcomeGuide(false)}
                    className="absolute top-3 right-3 text-purple-300 hover:text-white text-xs font-semibold px-2 py-1 rounded-md bg-white/10"
                  >
                    ✕ Dismiss
                  </button>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-purple-950 font-black flex items-center justify-center shrink-0 shadow">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 pr-8">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-white">
                          Welcome to SFSU GatorAccess Campus Navigator
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                          SF Hacks 2026
                        </span>
                      </div>
                      <p className="text-xs text-purple-200 leading-relaxed">
                        • <strong>Navigate Without Barriers:</strong> Interactive Google Map highlights operational elevators, low-grade ramps, and active campus construction blocks.
                        <br />
                        • <strong>Automatic Broken Elevator Reroute:</strong> If an elevator is reported out of service, our navigator automatically bypasses stairs with accessible slopes or offers 1-tap Gator Mobility cart pick up.
                        <br />
                        • <strong>Multimodal AI Inspection:</strong> Scroll down or tap "AI Hazard Scanner" to upload photos of steep slopes or locked gates for automated work order triage.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Low-Barrier Pathfinder & Carousel (Upper Side of Maps) */}
              <RoutePlanner
                buildings={buildings}
                reports={reports}
                originBuilding={originBuilding}
                destBuilding={destBuilding}
                setOriginBuilding={setOriginBuilding}
                setDestBuilding={setDestBuilding}
                activeRoute={activeRoute}
                setActiveRoute={setActiveRoute}
                onRequestRide={() => setActiveTab('support')}
                hasElevatorDownInDest={hasElevatorDownInDest}
                onOpenHotline={() => setIsHotlineOpen(true)}
                selectedWaypointIndex={selectedWaypointIndex}
                onSelectWaypoint={setSelectedWaypointIndex}
                mapPanel={
              <div className="min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-sm text-slate-800">
                      Campus map
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 hidden xl:inline">
                    Tap any building or waypoint marker to inspect accessible corridor details
                  </span>
                </div>

                <CampusMap
                  buildings={buildings}
                  reports={reports}
                  activeRoute={activeRoute}
                  selectedWaypointIndex={selectedWaypointIndex}
                  onSelectWaypoint={setSelectedWaypointIndex}
                  onSelectBuildingForRoute={handleSelectBuildingForRoute}
                  onReportAtLocation={handleReportAtLocation}
                  originBuilding={originBuilding}
                  destBuilding={destBuilding}
                />
              </div>
                }
              />


            </div>
          )}

          {/* TAB 2: AI HAZARD SCANNER & REPORT */}
          {activeTab === 'report' && (
            <div className="animate-fadeIn">
              <SubmitReportView
                buildings={buildings}
                onReportSubmitted={handleReportSubmitted}
                onRequestRide={() => setActiveTab('support')}
                prefillLocation={prefillLocation}
              />
            </div>
          )}

          {/* TAB 3: ELEVATORS & WORK ORDERS */}
          {activeTab === 'elevators' && (
            <div className="animate-fadeIn">
              <ElevatorStatusDashboard
                buildings={buildings}
                reports={reports}
                onToggleElevator={handleToggleElevator}
                onUpvoteReport={handleUpvoteReport}
                onRequestRide={() => setActiveTab('support')}
              />
            </div>
          )}

          {/* TAB 4: GATOR RIDES & CAPS THERAPY */}
          {activeTab === 'support' && (
            <div className="animate-fadeIn">
              <GatorMobilityView
                buildings={buildings}
                onOpenHotline={() => setIsHotlineOpen(true)}
              />
            </div>
          )}
        </main>

        {/* Accessible Hotlines Modal */}
        <HotlineModal
          isOpen={isHotlineOpen}
          onClose={() => setIsHotlineOpen(false)}
          onRequestRide={() => {
            setIsHotlineOpen(false);
            setActiveTab('support');
          }}
        />

        {/* Global Footer */}
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex items-center gap-3 text-center md:text-left">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-900/60 text-amber-300 shrink-0">
                <FaWheelchair className="w-5 h-5" />
              </span>
              <div>
                <div className="font-bold text-white text-sm">GatorAccess</div>
                <div className="text-[11px] text-slate-400">San Francisco State University</div>
              </div>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px]">
              <button
                onClick={() => setIsHotlineOpen(true)}
                className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
              >
                <FaPhone className="w-3 h-3" />
                DPRC Hotline: (415) 405-3580
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
              >
                <FaHeart className="w-3 h-3" />
                CAPS 24/7: (415) 338-2208
              </button>
              <a
                href="https://dprc.sfsu.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
                dprc.sfsu.edu
              </a>
              <a
                href="/api/export-archive"
                download="gatoraccess-sfhacks-2026.tar.gz"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-amber-300 font-bold rounded-lg transition-colors"
              >
                <FaDownload className="w-3 h-3" />
                Download Codebase
              </a>
            </nav>
          </div>
          <div className="border-t border-slate-800 px-4 py-3 text-center text-[11px] text-slate-500">
            Built for SF Hacks 2026 • Powered by Google Maps Platform & Gemini Multimodal AI
          </div>
        </footer>

        {/* Global Gemini Voice Floating AI Assistant */}
        <GeminiVoiceWidget
          onNavigate={handleGeminiVoiceNavigate}
          currentTab={activeTab}
        />
      </div>
    </APIProvider>
  );
}
