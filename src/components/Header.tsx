import React, { useState, useEffect } from 'react';
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
  FaUser,
  FaRightFromBracket,
  FaBars,
  FaXmark,
} from 'react-icons/fa6';
import { AppUser } from './LoginPage';
import { GatorAppIcon } from './GatorAppIcon';

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
  currentUser?: AppUser | null;
  onLogout?: () => void;
}

const NAV_ITEMS = [
  {
    id: 'map',
    label: 'Campus Navigator',
    shortLabel: 'Navigator',
    icon: FaRoute,
    active: 'bg-emerald-100 text-emerald-950 border-emerald-400',
    idle: 'text-emerald-100 hover:bg-emerald-500/15',
  },
  {
    id: 'report',
    label: 'AI Hazard Scanner',
    shortLabel: 'AI Scanner',
    icon: FaCamera,
    active: 'bg-rose-100 text-rose-950 border-rose-400',
    idle: 'text-rose-100 hover:bg-rose-500/15',
  },
  {
    id: 'elevators',
    label: 'Facilities Status',
    shortLabel: 'Facilities',
    icon: FaElevator,
    active: 'bg-sky-100 text-sky-950 border-sky-400',
    idle: 'text-sky-100 hover:bg-sky-500/15',
  },
  {
    id: 'support',
    label: 'GatorRides & CAPS',
    shortLabel: 'Support',
    icon: FaHeart,
    active: 'bg-violet-100 text-violet-950 border-violet-400',
    idle: 'text-violet-100 hover:bg-violet-500/15',
  },
] as const;

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
  currentUser,
  onLogout,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentNavItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const CurrentIcon = currentNavItem.icon;

  const handleSelectTab = (tab: 'map' | 'report' | 'elevators' | 'support') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white shadow-lg border-b border-purple-800">
      {/* Accessibility Toolbar */}
      <div className="px-3 sm:px-4 py-1.5 bg-black/30 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-purple-200 truncate">
          <span className="font-semibold text-amber-400 shrink-0">SF State Official:</span>
          <span className="hidden sm:inline truncate">Disability Programs & Resource Center (DPRC) Sync</span>
          <span className="sm:hidden text-[11px] text-purple-300">DPRC Sync</span>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast((prev) => !prev)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
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
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
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
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
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
      <div className="w-full px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand */}
        <div
          className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer min-w-0"
          onClick={() => handleSelectTab('map')}
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden shadow-md transition-transform hover:scale-105 active:scale-95">
            <GatorAppIcon className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-white flex items-center gap-1 sm:gap-1.5 truncate">
                GatorAccess <span className="text-amber-400 font-semibold text-xs sm:text-sm">SF State</span>
              </h1>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Campus accessibility
              </span>
            </div>
            <p className="text-[11px] text-purple-200 leading-tight hidden sm:block truncate">
              Find a route. Report a barrier. Get support.
            </p>
            {/* Active section badge on mobile for clear orientation */}
            <div className="md:hidden flex items-center gap-1 text-[11px] text-amber-300 font-medium">
              <CurrentIcon className="w-3 h-3 text-amber-400" />
              <span>{currentNavItem.label}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Mobile Hamburger */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-purple-900/60 border border-purple-700/50 text-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-5 h-5 rounded-full border border-amber-400"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-400 text-purple-950 font-bold flex items-center justify-center text-[10px]">
                  {currentUser.displayName.charAt(0)}
                </div>
              )}
              <div className="leading-tight text-left">
                <div className="font-semibold text-white truncate max-w-[120px]">
                  {currentUser.displayName}
                </div>
                <div className="text-[10px] text-amber-300">
                  {currentUser.isGuest ? 'Guest Access' : 'SFSU Verified'}
                </div>
              </div>
            </div>
          )}

          {/* Quick Ride Button */}
          <button
            onClick={onOpenRideRequest}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-700 hover:bg-purple-800     text-white font-bold text-xs rounded-xl shadow-none transition-transform active:scale-95 border border-slate-300 cursor-pointer"
            title="Request Gator Mobility Golf Cart Shuttle"
          >
            <FaCar className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Gator Cart Ride</span>
            <span className="sm:hidden text-[11px]">Ride</span>
          </button>

          {/* Quick Hotline Button */}
          <button
            onClick={onOpenHotline}
            className="hidden xs:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-700/80 hover:bg-purple-600 text-white font-bold text-xs rounded-xl border border-purple-400/40 shadow-none transition-transform active:scale-95 cursor-pointer"
            title="SFSU Accessibility Hotlines (DPRC, CAPS, UPD)"
          >
            <FaPhone className="w-3 h-3 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">DPRC Hotlines</span>
            <span className="sm:hidden text-[11px]">Hotlines</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-red-900/60 hover:text-red-200 text-purple-200 rounded-xl text-xs transition-colors border border-white/10 cursor-pointer"
              title="Log out or switch account"
            >
              <FaRightFromBracket className="w-3 h-3" />
              <span className="hidden md:inline">Log out</span>
            </button>
          )}

          {/* Hamburger Menu Toggle Button (Mobile only) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`md:hidden flex items-center justify-center p-2 rounded-xl border transition-colors cursor-pointer ${
              mobileMenuOpen
                ? 'bg-amber-400 text-purple-950 border-slate-300 shadow-none font-bold'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <FaXmark className="w-4 h-4" /> : <FaBars className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation (Tabs visible side-by-side on md and larger) */}
      <nav
        aria-label="Main navigation"
        className="hidden md:grid md:grid-cols-4 gap-2 px-4 sm:px-6 py-2.5 border-t border-white/10"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon, active, idle }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`min-w-0 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === id ? active : `border-white/10 ${idle}`
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Collapsible Navigation Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-purple-800 bg-purple-950/95 backdrop-blur-md px-3 py-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 px-1 pb-2">
            Navigation
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon, active, idle }) => {
              const isCurrent = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSelectTab(id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? active + ' shadow-none font-bold scale-[1.01]'
                      : `border-white/10 ${idle} bg-white/5`
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-white">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Drawer on Mobile */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onOpenHotline();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border border-purple-500/40"
              >
                <FaPhone className="w-3.5 h-3.5 text-amber-300" />
                <span>DPRC Hotlines</span>
              </button>

              <button
                onClick={() => {
                  onOpenRideRequest();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800   text-white font-bold text-xs rounded-xl shadow"
              >
                <FaCar className="w-3.5 h-3.5" />
                <span>Cart Ride</span>
              </button>
            </div>

            {/* Mobile User Profile & Logout */}
            {currentUser && (
              <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-6 h-6 rounded-full border border-amber-400"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-purple-950 font-bold flex items-center justify-center text-[11px]">
                      {currentUser.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="font-semibold text-white truncate max-w-[150px]">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] text-amber-300">
                      {currentUser.isGuest ? 'Guest Access' : 'SFSU Verified'}
                    </div>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-200 rounded-lg text-xs border border-red-500/30"
                  >
                    <FaRightFromBracket className="w-3 h-3" />
                    <span>Log out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

