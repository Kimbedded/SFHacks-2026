/**
 * GatorAccess Offline Cache Manager
 * 
 * Leverages the browser Cache API & Service Worker to guarantee accessible navigation,
 * building floorplans, elevator statuses, and map tiles remain functional in dead zones
 * (such as SFSU Lot 20, Science Hall basements, Thornton Hall elevators).
 */

import { SFSU_BUILDINGS, INITIAL_REPORTS } from '../data/sfsuCampusData';

export const CACHE_NAMES = {
  BUILDINGS: 'campus-building-data-cache',
  REPORTS: 'campus-barrier-reports-cache',
  TILES: 'google-maps-tiles-cache',
  STATIC: 'google-maps-static-cache',
};

export interface OfflineCacheStats {
  isOfflineReady: boolean;
  cachedBuildingCount: number;
  cachedReportsCount: number;
  hasCachedTiles: boolean;
  lastUpdated?: string;
}

/**
 * Actively pre-caches the core SFSU campus building and accessibility API responses
 * into the Cache API so that even on first visit or cold launch without network,
 * the data is instantly accessible.
 */
export async function preCacheCampusData(): Promise<OfflineCacheStats> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      isOfflineReady: false,
      cachedBuildingCount: SFSU_BUILDINGS.length,
      cachedReportsCount: INITIAL_REPORTS.length,
      hasCachedTiles: false,
    };
  }

  try {
    const buildingCache = await caches.open(CACHE_NAMES.BUILDINGS);
    const reportsCache = await caches.open(CACHE_NAMES.REPORTS);

    // Pre-cache building data response
    const buildingResponse = new Response(
      JSON.stringify({
        success: true,
        buildings: SFSU_BUILDINGS,
        source: 'cache-api-offline-fallback',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-GatorAccess-Offline': 'true',
        },
      }
    );
    await buildingCache.put('/api/buildings', buildingResponse);

    // Pre-cache accessibility reports response
    const reportsResponse = new Response(
      JSON.stringify({
        success: true,
        reports: INITIAL_REPORTS,
        source: 'cache-api-offline-fallback',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-GatorAccess-Offline': 'true',
        },
      }
    );
    await reportsCache.put('/api/reports', reportsResponse);

    // Check if tiles cache exists
    const hasTileCache = await caches.has(CACHE_NAMES.TILES);

    const stats: OfflineCacheStats = {
      isOfflineReady: true,
      cachedBuildingCount: SFSU_BUILDINGS.length,
      cachedReportsCount: INITIAL_REPORTS.length,
      hasCachedTiles: hasTileCache,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    localStorage.setItem('gatoraccess_offline_stats', JSON.stringify(stats));
    return stats;
  } catch (err) {
    console.warn('Unable to pre-cache campus data in Cache API:', err);
    return {
      isOfflineReady: false,
      cachedBuildingCount: SFSU_BUILDINGS.length,
      cachedReportsCount: INITIAL_REPORTS.length,
      hasCachedTiles: false,
    };
  }
}

/**
 * Checks current Cache API status
 */
export async function getOfflineCacheStats(): Promise<OfflineCacheStats> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      isOfflineReady: false,
      cachedBuildingCount: SFSU_BUILDINGS.length,
      cachedReportsCount: INITIAL_REPORTS.length,
      hasCachedTiles: false,
    };
  }

  try {
    const hasBuildingCache = await caches.has(CACHE_NAMES.BUILDINGS);
    const hasTilesCache = await caches.has(CACHE_NAMES.TILES);

    return {
      isOfflineReady: hasBuildingCache,
      cachedBuildingCount: SFSU_BUILDINGS.length,
      cachedReportsCount: INITIAL_REPORTS.length,
      hasCachedTiles: hasTilesCache,
      lastUpdated: 'Live Cache Synchronized',
    };
  } catch {
    return {
      isOfflineReady: false,
      cachedBuildingCount: SFSU_BUILDINGS.length,
      cachedReportsCount: INITIAL_REPORTS.length,
      hasCachedTiles: false,
    };
  }
}
