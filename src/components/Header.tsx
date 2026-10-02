import React from 'react';
import {
  Compass,
  Camera,
  AlertTriangle,
  Phone,
  Car,
  Heart,
  Eye,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'map' | 'report' | 'elevators' | 'support';
  setActiveTab: (tab: 'map' | 'report' | 'elevators' | 'support') => void;
  onOpenHotline: () => void;
  onOpenRideRequest: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean | ((prev: boolean) => boolean)) => void;
  largeText: boolean;
  setLargeText: (v: boolean | ((prev: boolean) => boolean)) => void;
  visualAlertsOnly: boolean;
  setVisualAlertsOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export function Header({
  activeTab,
  setActiveTab,
  onOpenHotline,
  onOpenRideRequest,
  highContrast,
  setHighContrast,
  largeText,
  setLargeText,
  visualAlertsOnly,
  setVisualAlertsOnly,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white shadow-lg border-b border-purple-800">
      {/* Accessibility Toolbar */}
      <div className="px-4 py-1.5 bg-black/30 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-purple-200">
          <span className="font-semibold text-amber-400">SF State Official:</span>
          <span className="hidden sm:inline">Disability Programs & Resource Center (DPRC) Sync</span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              highContrast ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-purple-200 hover:text-white'
            }`}
            title="Toggle high contrast accessibility theme"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden xs:inline">High Contrast</span>
          </button>

          {/* Text Size Toggle */}
          <button
            onClick={() => setLargeText((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              largeText ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-purple-200 hover:text-white'
            }`}
            title="Toggle larger typography"
          >
            <Type className="w-3 h-3" />
            <span className="hidden xs:inline">Large Text</span>
          </button>

          {/* Visual Alert Mode Toggle */}
          <button
            onClick={() => setVisualAlertsOnly((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              visualAlertsOnly ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-purple-200 hover:text-white'
            }`}
            title="Visual text alerts for auditory barrier accommodation"
          >
            {visualAlertsOnly ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            <span className="hidden sm:inline">Visual Alerts</span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('map')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 font-black flex items-center justify-center shadow-md border-2 border-amber-300">
            <span className="text-xl">♿</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                GatorAccess <span className="text-amber-400 font-semibold text-xs sm:text-sm">SF State</span>
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Live Campus Barrier Guard
              </span>
            </div>
            <p className="text-[11px] text-purple-200 leading-tight hidden xs:block">
              Accessible Pathfinding • Multimodal AI Hazard Scanner • Facilities Triage
            </p>
          </div>
        </div>

        {/* Quick Hotline & Ride Request CTA */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenRideRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95 border border-amber-300"
            title="Request Gator Mobility Golf Cart Shuttle"
          >
            <Car className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Gator Cart Ride</span>
            <span className="sm:hidden">Ride</span>
          </button>

          <button
            onClick={onOpenHotline}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700/80 hover:bg-purple-600 text-white font-bold text-xs rounded-xl border border-purple-400/40 shadow-sm transition-transform active:scale-95"
            title="SFSU Accessibility Hotlines (DPRC, CAPS, UPD)"
          >
            <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">DPRC Hotlines</span>
            <span className="sm:hidden">Hotlines</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar border-t border-purple-800/80">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'map'
              ? 'border-amber-400 text-amber-300 bg-white/5'
              : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Campus Navigator</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'report'
              ? 'border-amber-400 text-amber-300 bg-white/5'
              : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>AI Hazard Scanner & Report</span>
        </button>

        <button
          onClick={() => setActiveTab('elevators')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'elevators'
              ? 'border-amber-400 text-amber-300 bg-white/5'
              : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Elevators & Facilities Status</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'support'
              ? 'border-amber-400 text-amber-300 bg-white/5'
              : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Gator Rides & CAPS Therapy</span>
        </button>
      </div>
    </header>
  );
}
