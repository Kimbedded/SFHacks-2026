import React, { useState, useEffect } from 'react';
import {
  preCacheCampusData,
  getOfflineCacheStats,
  OfflineCacheStats,
} from '../utils/offlineCacheManager';
import {
  WifiOff,
  Wifi,
  Database,
  CheckCircle,
  RefreshCw,
  Info,
  ShieldCheck,
} from 'lucide-react';

export function OfflineCacheBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [stats, setStats] = useState<OfflineCacheStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initial stats check
    getOfflineCacheStats().then(setStats);

    const handleOnline = () => {
      setIsOnline(true);
      getOfflineCacheStats().then(setStats);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualCache = async () => {
    setIsRefreshing(true);
    try {
      const newStats = await preCacheCampusData();
      setStats(newStats);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="w-full">
      {/* Critical Offline Notice Bar (visible when user loses signal) */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md transition-all animate-pulse">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
            <span>
              <strong>Low Reception / Offline Active:</strong> GatorAccess is serving cached SFSU
              building coordinates, accessible entrances, elevators, and map tiles from the browser Cache API.
            </span>
          </div>
          <span className="bg-amber-800/80 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider shrink-0 ml-2">
            Cache Active
          </span>
        </div>
      )}

      {/* Offline Status Mini-Pill in UI */}
      <div className="flex items-center justify-between py-1.5 px-4 bg-slate-900/90 border-b border-purple-900/30 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <WifiOff className="w-3 h-3 text-amber-400" />
              Offline Mode Active
            </span>
          )}

          <span className="text-slate-600">|</span>

          <span className="flex items-center gap-1 text-purple-300">
            <Database className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Cache API:</span>
            <strong>{stats?.cachedBuildingCount || 11}</strong> Buildings & Elevators Cached
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="hover:text-amber-300 transition-colors flex items-center gap-1"
            title="Inspect offline cache details"
          >
            <Info className="w-3 h-3 text-slate-400" />
            <span className="hidden md:inline">Offline Cache Details</span>
          </button>

          <button
            onClick={handleManualCache}
            disabled={isRefreshing}
            className="px-2 py-0.5 bg-purple-950 hover:bg-purple-900 text-amber-300 rounded border border-purple-800 flex items-center gap-1 transition-all disabled:opacity-50"
            title="Update offline cache for basement/dead zone navigation"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Caching...' : 'Sync Offline Pack'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Cache Details Drawer */}
      {showDetails && (
        <div className="bg-slate-950 text-slate-200 border-b border-purple-900/40 p-3 sm:p-4 text-xs animate-fadeIn">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Service Worker & Cache API Active for Dead Zones
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed max-w-2xl">
                Configured with Workbox <strong>StaleWhileRevalidate</strong> caching rules. Map tiles from Google
                Maps CDN and JSON API responses for building coordinates, power doors, elevators, and barrier reports
                are locally stored in the browser. When navigating underground in Lot 20 or inside building elevators
                where cell signal drops, the navigator continues without disruption.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2.5 py-1 bg-slate-900 rounded border border-slate-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                11 SFSU Buildings Cached
              </span>
              <span className="px-2.5 py-1 bg-slate-900 rounded border border-slate-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Live Map Tiles Cached
              </span>
              <span className="px-2.5 py-1 bg-slate-900 rounded border border-slate-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Elevator Status Persisted
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
