import React from 'react';
import {
  FaWheelchair,
  FaElevator,
  FaTriangleExclamation,
  FaRoute,
  FaHeart,
  FaPhone,
  FaCar,
  FaEye,
  FaFont,
  FaVolumeHigh,
  FaVolumeXmark,
  FaCamera,
} from 'react-icons/fa6';

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
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              highContrast ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-purple-200 hover:text-white'
            }`}
            aria-pressed={highContrast}
            title="Toggle high contrast accessibility theme"
          >
            <FaEye className="w-3 h-3" />
            <span className="hidden xs:inline">High Contrast</span>
          </button>

          {/* Text Size Toggle */}
          <button
            onClick={() => setLargeText((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              largeText ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-purple-200 hover:text-white'
            }`}
            aria-pressed={largeText}
            title="Toggle larger typography"
          >
            <FaFont className="w-3 h-3" />
            <span className="hidden xs:inline">Large Text</span>
          </button>

          {/* Visual Alert Mode Toggle */}
          <button
            onClick={() => setVisualAlertsOnly((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              visualAlertsOnly ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-purple-200 hover:text-white'
            }`}
            aria-pressed={visualAlertsOnly}
            title="Visual text alerts for auditory barrier accommodation"
          >
            {visualAlertsOnly ? <FaVolumeXmark className="w-3 h-3" /> : <FaVolumeHigh className="w-3 h-3" />}
            <span className="hidden sm:inline">Visual Alerts</span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer min-w-0" onClick={() => setActiveTab('map')}>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 font-black flex items-center justify-center shadow-md border-2 border-amber-300">
            <FaWheelchair className="w-5 h-5 text-purple-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                GatorAccess <span className="text-amber-400 font-semibold text-xs sm:text-sm">SF State</span>
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Campus accessibility
              </span>
            </div>
            <p className="text-[11px] text-purple-200 leading-tight hidden xs:block">
              Find a route. Report a barrier. Get support.
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
            <FaCar className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Gator Cart Ride</span>
            <span className="sm:hidden">Ride</span>
          </button>

          <button
            onClick={onOpenHotline}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700/80 hover:bg-purple-600 text-white font-bold text-xs rounded-xl border border-purple-400/40 shadow-sm transition-transform active:scale-95"
            title="SFSU Accessibility Hotlines (DPRC, CAPS, UPD)"
          >
            <FaPhone className="w-3 h-3 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">DPRC Hotlines</span>
            <span className="sm:hidden">Hotlines</span>
          </button>
        </div>
      </div>

      {/* Each section has a distinct color and a visible text label. */}
      <nav aria-label="Main navigation" className="w-full px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-2 py-3 border-t border-white/10">
        {([
          { id: 'map', label: 'Campus Navigator', icon: FaRoute, active: 'bg-emerald-100 text-emerald-950 border-emerald-400', idle: 'text-emerald-100 hover:bg-emerald-500/15' },
          { id: 'report', label: 'AI Hazard Scanner', icon: FaCamera, active: 'bg-rose-100 text-rose-950 border-rose-400', idle: 'text-rose-100 hover:bg-rose-500/15' },
          { id: 'elevators', label: 'Facilities Status', icon: FaElevator, active: 'bg-sky-100 text-sky-950 border-sky-400', idle: 'text-sky-100 hover:bg-sky-500/15' },
          { id: 'support', label: 'GatorRides & CAPS', icon: FaHeart, active: 'bg-violet-100 text-violet-950 border-violet-400', idle: 'text-violet-100 hover:bg-violet-500/15' },
        ] as const).map(({ id, label, icon: Icon, active, idle }) => (
          <button key={id} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined}
            className={`min-w-0 flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${activeTab === id ? active : `border-white/10 ${idle}`}`}>
            <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
