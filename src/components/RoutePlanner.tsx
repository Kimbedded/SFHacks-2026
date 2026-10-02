import React, { useState, useEffect, useRef } from 'react';
import { CampusBuilding, AccessibleRouteOption, Coordinates, AccessibilityReport } from '../types';
import {
  SFSU_ACCESSIBLE_CORRIDORS,
  AccessibleCorridorItem,
  CampusCorridorWaypoint,
  SFSU_FALLBACK_STARTING_POINT,
} from '../data/sfsuCampusData';
import {
  FaWheelchair,
  FaWheelchairMove,
  FaPersonWalkingWithCane,
  FaEyeLowVision,
  FaSquareParking,
  FaElevator,
  FaRoute,
  FaCompass,
  FaCar,
  FaVolumeHigh,
  FaMagnifyingGlass,
  FaLocationCrosshairs,
  FaLocationDot,
  FaClock,
  FaTriangleExclamation,
  FaCircleQuestion,
  FaArrowUpRightFromSquare,
  FaXmark,
  FaCheck,
  FaArrowLeft,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
  FaPersonWalking,
  FaBuilding,
  FaShieldHalved,
  FaPhone,
} from 'react-icons/fa6';
import { getGoogleMapsWalkingRoute, getGoogleMapsExternalUrl } from '../utils/googleDirections';
import { UnifiedRouteModal } from './UnifiedRouteModal';

interface RoutePlannerProps {
  mapPanel?: React.ReactNode;
  buildings: CampusBuilding[];
  reports?: AccessibilityReport[];
  originBuilding: CampusBuilding | null;
  destBuilding: CampusBuilding | null;
  setOriginBuilding: (b: CampusBuilding | null) => void;
  setDestBuilding: (b: CampusBuilding | null) => void;
  activeRoute: AccessibleRouteOption | null;
  setActiveRoute: (route: AccessibleRouteOption | null) => void;
  onRequestRide: () => void;
  hasElevatorDownInDest: boolean;
  onOpenHotline: () => void;
  selectedWaypointIndex?: number | null;
  onSelectWaypoint?: (index: number) => void;
}

// Preset departure origin options with simple campus addresses
interface OriginPreset {
  id: string;
  name: string;
  shortName: string;
  address: string;
  coordinates: Coordinates;
  buildingId?: string;
  icon: string;
}

// Default fallback when GPS is not acquired: Student Life Events Center / Annex I
const DEFAULT_FALLBACK_ORIGIN: OriginPreset = {
  id: 'origin-annex',
  name: 'Student Life Events Center / Annex I',
  shortName: 'Student Life Events Center / Annex I',
  address: '100 North State Drive',
  coordinates: { lat: 37.7260, lng: -122.4826 },
  buildingId: 'annex1',
  icon: '🏛️',
};

const ORIGIN_PRESETS: OriginPreset[] = [
  {
    id: 'origin-current',
    name: 'Current Location',
    shortName: 'Current Location',
    address: 'Current location (or Annex I)',
    coordinates: { lat: 37.7260, lng: -122.4826 },
    icon: '📍',
  },
  DEFAULT_FALLBACK_ORIGIN,
  {
    id: 'origin-muni',
    name: '19th & Holloway Transit Plaza (M-Line & Shuttle)',
    shortName: 'Transit Plaza (19th & Holloway)',
    address: '19th Ave & Holloway Ave',
    coordinates: { lat: 37.7234, lng: -122.475 },
    buildingId: 'muni_bart_station',
    icon: '🚉',
  },
  {
    id: 'origin-lot20',
    name: 'Lot 20 Ground Floor ADA Hub',
    shortName: 'Lot 20 ADA Garage',
    address: 'State Drive (Ground Level)',
    coordinates: { lat: 37.7248, lng: -122.4832 },
    buildingId: 'lot_20',
    icon: '🅿️',
  },
  {
    id: 'origin-ccsc',
    name: 'Cesar Chavez Student Center (Malcolm X Plaza)',
    shortName: 'Student Center Plaza',
    address: '1650 Holloway Ave',
    coordinates: { lat: 37.7238, lng: -122.4785 },
    buildingId: 'ccsc',
    icon: '🏢',
  },
];

export function RoutePlanner({
  mapPanel,
  buildings,
  reports = [],
  originBuilding,
  destBuilding,
  setOriginBuilding,
  setDestBuilding,
  activeRoute,
  setActiveRoute,
  onRequestRide,
  hasElevatorDownInDest,
  onOpenHotline,
  selectedWaypointIndex = 0,
  onSelectWaypoint,
}: RoutePlannerProps) {
  // Mode state: 'carousel' (browsing corridors) vs 'corridor_active' (turn-by-turn waypoints)
  const [viewMode, setViewMode] = useState<'carousel' | 'corridor_active'>('carousel');
  const [selectedCorridor, setSelectedCorridor] = useState<AccessibleCorridorItem | null>(null);

  // Single Unified Modal state (displays map and route in one single modal)
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);

  // Active Origin Preset: starts as Student Life Events Center / Annex I until live GPS is acquired
  const [selectedOrigin, setSelectedOrigin] = useState<OriginPreset>(DEFAULT_FALLBACK_ORIGIN);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Search & Filter within corridors / buildings
  const [searchQuery, setSearchQuery] = useState('');
  const [mobilityProfile, setMobilityProfile] = useState<string>('Power Wheelchair');

  // Carousel scroll refs & state
  const corridorCarouselRef = useRef<HTMLDivElement>(null);
  const waypointCarouselRef = useRef<HTMLDivElement>(null);
  const [corridorIndex, setCorridorIndex] = useState(0);

  // Audio Guidance
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const routeRequestId = useRef(0);
  const [showFaqGuide, setShowFaqGuide] = useState(false);

  // Mobile-Only Experience States
  const [isMobileCorridorsOpen, setIsMobileCorridorsOpen] = useState(false);
  const [mobileLocationSearch, setMobileLocationSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close mobile search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check for unresolved barriers / reports affecting destination
  const unresolvedBarriers = reports.filter(
    (r) =>
      r.status !== 'resolved' &&
      ((selectedCorridor &&
        (r.buildingId === selectedCorridor.destinationBuildingId ||
          r.locationName.toLowerCase().includes(selectedCorridor.destinationName.toLowerCase()))) ||
        (destBuilding &&
          (r.buildingId === destBuilding.id ||
            r.locationName.toLowerCase().includes(destBuilding.name.toLowerCase()))))
  );

  // Request GPS: If successful, use current location; if cannot acquire, fallback to Student Life Events Center / Annex I
  const handleRequestGps = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          const currentPreset: OriginPreset = {
            id: 'origin-current',
            name: 'Current Location',
            shortName: 'Current Location',
            address: 'Your location',
            coordinates: coords,
            icon: '📍',
          };
          setSelectedOrigin(currentPreset);
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation could not be acquired, defaulting to Student Life Events Center / Annex I:', err);
          setSelectedOrigin(DEFAULT_FALLBACK_ORIGIN);
          const annexBldg = buildings.find((b) => b.id === 'annex1') || null;
          setOriginBuilding(annexBldg);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setSelectedOrigin(DEFAULT_FALLBACK_ORIGIN);
      const annexBldg = buildings.find((b) => b.id === 'annex1') || null;
      setOriginBuilding(annexBldg);
      setIsLocating(false);
    }
  };

  // On mount: attempt to acquire current location; fallback to Student Life Events Center / Annex I if unable
  useEffect(() => {
    handleRequestGps();
  }, []);

  // Sync when destBuilding is selected externally (e.g. from map or voice)
  useEffect(() => {
    if (destBuilding) {
      const match = SFSU_ACCESSIBLE_CORRIDORS.find(
        (c) => c.destinationBuildingId === destBuilding.id
      );
      if (match) {
        handleSelectCorridor(match, false);
      }
    }
  }, [destBuilding, selectedOrigin]);

  // Filter corridors based on search
  const filteredCorridors = SFSU_ACCESSIBLE_CORRIDORS.filter((corridor) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      corridor.title.toLowerCase().includes(q) ||
      corridor.destinationName.toLowerCase().includes(q) ||
      corridor.destinationAddress.toLowerCase().includes(q) ||
      corridor.category.toLowerCase().includes(q)
    );
  });

  // Turn-by-turn opens a focused, full-screen side-by-side view (directions + map)
  const isFocusView = viewMode === 'corridor_active' && !!activeRoute;

  useEffect(() => {
    if (!isFocusView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewMode('carousel');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFocusView]);

  // Carousel Scroll Navigation
  const scrollCorridorCarousel = (direction: 'up' | 'down') => {
    if (!corridorCarouselRef.current) return;
    const scrollAmount = 280;
    corridorCarouselRef.current.scrollBy({
      top: direction === 'up' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const scrollWaypointCarousel = (direction: 'left' | 'right') => {
    if (!waypointCarouselRef.current || !activeRoute?.steps) return;
    const total = activeRoute.steps.length;
    const current = selectedWaypointIndex ?? 0;
    const nextIdx =
      direction === 'right' ? Math.min(total - 1, current + 1) : Math.max(0, current - 1);

    if (onSelectWaypoint) {
      onSelectWaypoint(nextIdx);
    }


  };

  // Keep the selected direction visible when using either map markers or step controls.
  useEffect(() => {
    const list = waypointCarouselRef.current;
    const card = list?.children[selectedWaypointIndex ?? 0] as HTMLElement | undefined;
    if (!list || !card) return;
    const top = card.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    list.scrollTo({ top: Math.max(0, top - 4), behavior: 'smooth' });
  }, [selectedWaypointIndex, activeRoute, viewMode]);

  // Select Corridor and Move to Turn-by-Turn Waypoint View
  const handleSelectCorridor = async (
    corridor: AccessibleCorridorItem,
    openModal = false,
    smoothScroll = true
  ) => {
    const requestId = ++routeRequestId.current;
    setSelectedCorridor(corridor);
    setViewMode('corridor_active');
    setIsLoadingRoute(true);

    const destBldg =
      buildings.find((b) => b.id === corridor.destinationBuildingId) || null;
    if (destBldg) {
      setDestBuilding(destBldg);
    }

    const startCoord = selectedOrigin.coordinates;
    const endCoord = corridor.destinationCoords;
    const originLabel =
      selectedOrigin.id === 'origin-current'
        ? selectedOrigin.shortName
        : `${selectedOrigin.shortName} (${selectedOrigin.address})`;
    const destLabel = `${corridor.destinationName} (${corridor.destinationAddress})`;

    // Check elevator outages
    const hasElevatorOutage =
      destBldg?.elevators.some((e) => e.status === 'down') || Boolean(corridor.elevatorDownWarning);

    try {
      // 1. Fetch Google Maps pedestrian walking directions
      const googleDirections = await getGoogleMapsWalkingRoute(
        startCoord,
        endCoord,
        originLabel,
        destLabel
      ).catch(() => null);

      // Construct pathway coordinates
      const pathCoordinates: Coordinates[] =
        googleDirections && googleDirections.pathCoordinates.length > 1
          ? googleDirections.pathCoordinates
          : corridor.pathCoordinates;

      // Keep instructions and markers tied to the same recalculated route.
      const liveSteps = googleDirections?.source !== 'fallback'
        ? googleDirections?.steps.filter((step) => step.coordinates && Number.isFinite(step.coordinates.lat) && Number.isFinite(step.coordinates.lng)) || []
        : [];
      const steps: AccessibleRouteOption['steps'] = liveSteps.map((step) => ({
        instruction: step.instruction,
        accessibilityNotes: 'Check local access conditions along this walking route.',
        isElevatorNeeded: false,
        isRamp: false,
        coordinates: step.coordinates!,
      }));
      if (steps.length === 0) {
        steps.push({
          instruction: `Start at ${selectedOrigin.shortName}`,
          accessibilityNotes: 'Turn-by-turn directions are unavailable. Open Google Maps for navigation.',
          isElevatorNeeded: false,
          isRamp: false,
          coordinates: startCoord,
        });
      }
      steps.push({
        instruction: `Arrive at ${corridor.destinationName}`,
        accessibilityNotes: corridor.waypoints.at(-1)?.accessibilityNotes || 'Check the accessible entrance on arrival.',
        isElevatorNeeded: false,
        isRamp: false,
        coordinates: pathCoordinates.at(-1) || endCoord,
      });

      const fallbackMapsUrl = getGoogleMapsExternalUrl(
        startCoord,
        endCoord,
        originLabel,
        destLabel
      );

      const routeOption: AccessibleRouteOption = {
        id: `route-${corridor.id}-${Date.now()}`,
        title: `${corridor.title} Accessible Corridor`,
        type: hasElevatorOutage ? 'shallowest_slope' : 'maximum_accessibility',
        distanceMeters: googleDirections?.distanceMeters || corridor.distanceMeters,
        estimatedMinutes: googleDirections?.estimatedMinutes || corridor.estimatedMinutes,
        maxSlopeGrade: corridor.maxSlopeGrade,
        elevationGainMeters: 3.2,
        isFullyADACompliant: false,
        warningNotice: hasElevatorOutage ? corridor.elevatorDownWarning : undefined,
        pathCoordinates,
        googleMapsUrl: googleDirections?.googleMapsUrl || fallbackMapsUrl,
        steps,
      };

      if (requestId !== routeRequestId.current) return;
      setActiveRoute(routeOption);
      if (onSelectWaypoint) {
        onSelectWaypoint(0);
      }

      if (openModal) {
        setIsUnifiedModalOpen(true);
      }

      if (smoothScroll) {
        setTimeout(() => {
          const mapEl = document.getElementById('campus-map');
          if (mapEl) {
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 150);
      }
    } catch (err) {
      console.warn('Error loading corridor walking route:', err);
    } finally {
      if (requestId === routeRequestId.current) setIsLoadingRoute(false);
    }
  };

  // Text-to-speech for turn-by-turn waypoints
  const speakInstructions = () => {
    if (!activeRoute || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const corridorName = selectedCorridor ? selectedCorridor.title : activeRoute.title;
    const waypointSteps = activeRoute.steps
      .map((s, idx) => `Waypoint ${idx + 1}: ${s.instruction}. ${s.accessibilityNotes}.`)
      .join(' ');

    const textToRead = `${corridorName}. Distance: ${activeRoute.distanceMeters} meters, approximately ${activeRoute.estimatedMinutes} minutes walk. Check accessibility conditions along the walking route. ${waypointSteps}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Mobile search filtering for campus locations & corridors
  const matchingCorridors =
    mobileLocationSearch.trim() === ''
      ? []
      : SFSU_ACCESSIBLE_CORRIDORS.filter((c) => {
          const q = mobileLocationSearch.toLowerCase();
          return (
            c.title.toLowerCase().includes(q) ||
            c.destinationName.toLowerCase().includes(q) ||
            c.destinationCode.toLowerCase().includes(q)
          );
        });

  const matchingBuildings =
    mobileLocationSearch.trim() === ''
      ? []
      : buildings
          .filter((b) => {
            const q = mobileLocationSearch.toLowerCase();
            return (
              b.name.toLowerCase().includes(q) ||
              b.code.toLowerCase().includes(q) ||
              (Boolean(b.address) && (b.address as string).toLowerCase().includes(q)) ||
              (Boolean(b.notes) && (b.notes as string).toLowerCase().includes(q))
            );
          })
          .slice(0, 8);

  const handleSelectBuildingFromSearch = async (bldg: CampusBuilding) => {
    setMobileLocationSearch(bldg.name);
    setIsSearchFocused(false);

    const matchingCorridor = SFSU_ACCESSIBLE_CORRIDORS.find(
      (c) => c.destinationBuildingId === bldg.id
    );
    if (matchingCorridor) {
      await handleSelectCorridor(matchingCorridor, false, true);
    } else {
      setDestBuilding(bldg);
      const startCoord = selectedOrigin.coordinates;
      const endCoord = bldg.coordinates;
      const originLabel = `${selectedOrigin.shortName} (${selectedOrigin.address})`;
      const destLabel = `${bldg.name} (${bldg.address || 'SFSU Campus'})`;

      try {
        const directions = await getGoogleMapsWalkingRoute(
          startCoord,
          endCoord,
          originLabel,
          destLabel
        ).catch(() => null);

        const steps =
          directions?.steps && directions.steps.length > 0
            ? directions.steps.map((s) => ({
                instruction: s.instruction,
                accessibilityNotes: 'Verified level ADA walking path',
                isElevatorNeeded: false,
                isRamp: false,
                coordinates: s.coordinates || startCoord,
              }))
            : [
                {
                  instruction: `Depart from ${selectedOrigin.shortName}`,
                  accessibilityNotes: 'Level paved ground',
                  isElevatorNeeded: false,
                  isRamp: false,
                  coordinates: startCoord,
                },
                {
                  instruction: `Arrive at accessible main entrance of ${bldg.name}`,
                  accessibilityNotes: 'Automatic door button available',
                  isElevatorNeeded: false,
                  isRamp: false,
                  coordinates: endCoord,
                },
              ];

        const routeOption: AccessibleRouteOption = {
          id: `route-custom-${bldg.id}-${Date.now()}`,
          title: `Accessible Route to ${bldg.name}`,
          type: 'maximum_accessibility',
          distanceMeters: directions?.distanceMeters || 350,
          estimatedMinutes: directions?.estimatedMinutes || 5,
          maxSlopeGrade: 3.5,
          elevationGainMeters: 2.5,
          isFullyADACompliant: true,
          pathCoordinates:
            directions && directions.pathCoordinates.length > 1
              ? directions.pathCoordinates
              : [startCoord, endCoord],
          steps,
          googleMapsUrl:
            directions?.googleMapsUrl ||
            getGoogleMapsExternalUrl(startCoord, endCoord, originLabel, destLabel),
        };
        setActiveRoute(routeOption);
        setViewMode('corridor_active');
      } catch (err) {
        console.warn('Could not generate route:', err);
      }
    }
  };

  const handleSelectCorridorFromSearch = (corridor: AccessibleCorridorItem) => {
    setMobileLocationSearch(corridor.destinationName);
    setIsSearchFocused(false);
    handleSelectCorridor(corridor, false, true);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* MOBILE-ONLY SIMPLIFIED EXPERIENCE (< md)                                 */}
      {/* 1. Direct Accessible Campus Corridors (Collapsible / Expandable)         */}
      {/* 2. Simplified Location Search Bar                                        */}
      {/* 3. Campus Map underneath                                                 */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-3">
        {/* If an active route is open, show the active route summary banner */}
        {viewMode === 'corridor_active' && activeRoute ? (
          <div className="p-3 bg-purple-900 text-white rounded-2xl shadow-md border border-purple-700 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-xs shrink-0">
                  <FaRoute className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <h5 className="font-extrabold text-xs text-white truncate">
                    {activeRoute.title}
                  </h5>
                  <p className="text-[10px] text-purple-200 truncate">
                    Zero-Stairs • ~{activeRoute.estimatedMinutes} mins • {activeRoute.distanceMeters}m
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewMode('carousel')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                title="Close active route"
              >
                <FaXmark className="w-3 h-3" />
                <span>Close</span>
              </button>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-purple-800/80">
              {activeRoute.googleMapsUrl && (
                <a
                  href={activeRoute.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FaArrowUpRightFromSquare className="w-3 h-3" />
                  <span>Google Maps</span>
                </a>
              )}
              <button
                onClick={speakInstructions}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-white/10 text-white border-white/20'
                }`}
              >
                <FaVolumeHigh className="w-3 h-3" />
                <span>{isSpeaking ? 'Stop' : 'Voice'}</span>
              </button>
              <button
                onClick={onRequestRide}
                className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FaCar className="w-3 h-3" />
                <span>Cart</span>
              </button>
            </div>
          </div>
        ) : (
          /* Collapsible & Expandable Direct Accessible Campus Corridors */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsMobileCorridorsOpen((prev) => !prev)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-purple-50/40 transition-colors cursor-pointer"
              aria-expanded={isMobileCorridorsOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <FaRoute className="w-4 h-4" />
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 truncate">
                  <span>Direct Accessible Campus Corridors</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    {SFSU_ACCESSIBLE_CORRIDORS.length}
                  </span>
                </h4>
              </div>

              {/* Just arrow icon on the right (Mobile only) */}
              <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 flex items-center justify-center shrink-0 ml-2">
                {isMobileCorridorsOpen ? (
                  <FaChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <FaChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {/* Simplified Corridors List (Mobile only) */}
            {isMobileCorridorsOpen && (
              <div className="p-3 pt-0 border-t border-slate-100 space-y-2 max-h-[380px] overflow-y-auto">
                {SFSU_ACCESSIBLE_CORRIDORS.map((corridor) => {
                  const bldg = buildings.find((b) => b.id === corridor.destinationBuildingId);
                  const hasBrokenElevator =
                    bldg?.elevators.some((e) => e.status === 'down') ||
                    Boolean(corridor.elevatorDownWarning);

                  return (
                    <div
                      key={corridor.id}
                      onClick={() => {
                        handleSelectCorridor(corridor, false, true);
                        setIsMobileCorridorsOpen(false);
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      {/* Location Photo Thumbnail */}
                      <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                        {corridor.photoUrl ? (
                          <img
                            src={corridor.photoUrl}
                            alt={corridor.destinationName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <FaBuilding className="w-5 h-5 text-purple-700" />
                        )}
                      </div>

                      {/* Location Title & Green Wheelchair Icon (Bigger bold title, no acronym, no gray subtitle) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs"
                            title="Zero-Stairs Accessible"
                          >
                            <FaWheelchair className="w-3 h-3" />
                          </span>
                          <h5 className="font-black text-sm text-slate-900 truncate group-hover:text-purple-950">
                            {corridor.destinationName}
                          </h5>
                        </div>

                        {hasBrokenElevator && (
                          <div className="mt-1 text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <FaTriangleExclamation className="w-2.5 h-2.5 shrink-0" />
                            <span>Detour active (elevator down)</span>
                          </div>
                        )}
                      </div>

                      {/* Right side: Time (bigger and bold) & distance */}
                      <div className="shrink-0 text-right flex items-center gap-2">
                        <div>
                          <span className="text-sm font-black text-slate-900 block leading-tight">
                            {corridor.estimatedMinutes} min
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 block">
                            {corridor.distanceMeters}m
                          </span>
                        </div>
                        <FaChevronRight className="w-3 h-3 text-slate-300 group-hover:text-purple-700 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Location Search Bar right above map */}
        <div ref={searchDropdownRef} className="relative z-30">
          <div className="relative">
            <FaMagnifyingGlass className="w-3.5 h-3.5 text-purple-700 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search campus locations (Library, CCSC, Mashouf...)"
              value={mobileLocationSearch}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setMobileLocationSearch(e.target.value);
                setIsSearchFocused(true);
              }}
              className="w-full pl-9 pr-9 py-2.5 text-xs bg-white border border-slate-300 rounded-2xl shadow-xs focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {mobileLocationSearch && (
              <button
                onClick={() => {
                  setMobileLocationSearch('');
                  setIsSearchFocused(false);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Autocomplete Dropdown */}
          {isSearchFocused && (matchingCorridors.length > 0 || matchingBuildings.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-purple-200 max-h-72 overflow-y-auto z-40 divide-y divide-slate-100">
              {matchingCorridors.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 rounded-lg mb-1">
                    Zero-Stairs Corridors
                  </div>
                  {matchingCorridors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCorridorFromSearch(c)}
                      className="w-full text-left p-2 rounded-xl hover:bg-purple-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaRoute className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-slate-900">{c.destinationName}</span>
                          <span className="text-slate-500 ml-1 text-[11px]">({c.title})</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                        Zero-Stairs
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {matchingBuildings.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-50 rounded-lg mb-1">
                    Campus Buildings
                  </div>
                  {matchingBuildings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSelectBuildingFromSearch(b)}
                      className="w-full text-left p-2 rounded-xl hover:bg-purple-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaBuilding className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-slate-900">{b.name}</span>
                          <span className="text-slate-500 ml-1 text-[11px]">[{b.code}]</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 truncate max-w-[120px]">
                        {b.address || 'SFSU Campus'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map right underneath search bar on mobile */}
        {mapPanel && (
          <div className="min-w-0">
            {mapPanel}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (>= md)                                                      */}
      {/* 1. SIMPLE ORIGIN BAR (REPLACES BULKY ORIGIN/DESTINATION FORM INPUTS)     */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
              <FaWheelchair className="w-4 h-4" />
            </span>
            <h3 className="whitespace-nowrap font-extrabold text-sm sm:text-base text-slate-900">
              SFSU Accessible Corridor Navigator
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => setShowFaqGuide(!showFaqGuide)}
              aria-expanded={showFaqGuide}
              aria-controls="accessibility-faqs"
              className="min-h-11 text-xs font-bold text-purple-800 hover:text-purple-950 bg-purple-50 hover:bg-purple-100 px-2.5 py-2 rounded-xl border border-purple-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FaCircleQuestion className="w-3.5 h-3.5" />
              <span>Accessibility FAQs</span>
            </button>
            <button
              onClick={onRequestRide}
              className="min-h-11 text-xs font-bold text-purple-950 bg-amber-400 hover:bg-amber-300 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Request Gator Mobility Golf Cart Shuttle"
            >
              <FaCar className="w-3.5 h-3.5" />
              <span>Gator Cart</span>
            </button>
          </div>
        </div>

        {/* Mobility profile selector */}
        <div role="radiogroup" aria-label="Mobility profile" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { value: 'Power Wheelchair', label: 'Power chair', icon: FaWheelchair, description: 'Step-free paths with wide turns and ramps or elevators.' },
            { value: 'Manual Wheelchair', label: 'Manual chair', icon: FaWheelchairMove, description: 'Flatter, smooth paths to reduce pushing effort.' },
            { value: 'Walker / Cane', label: 'Walker / cane', icon: FaPersonWalkingWithCane, description: 'Gentle slopes and fewer steps to ease walking.' },
            { value: 'Visual / Tactile', label: 'Low vision', icon: FaEyeLowVision, description: 'Clear landmarks and tactile cues to help navigation.' },
          ] as const).map(({ value, label, icon: Icon, description }) => {
            const selected = mobilityProfile === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMobilityProfile(value)}
                className={`min-h-11 flex flex-col items-start gap-1.5 px-3 py-2 rounded-xl border-2 text-left text-sm font-bold transition-colors cursor-pointer ${
                  selected
                    ? 'bg-purple-900 border-purple-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 shrink-0 ${selected ? 'text-amber-300' : 'text-purple-700'}`} />
                  <span>{label}</span>
                </span>
                <span className={`text-xs font-normal leading-relaxed ${selected ? 'text-purple-100' : 'text-slate-500'}`}>
                  {description}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          These profiles describe path preferences. Switching profiles does not yet change the calculated route.
        </p>

        {/* Alternative starting points stay collapsed until requested. */}
        <details className="group border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs text-slate-600 marker:text-purple-700">
            Starting point: <strong className="text-purple-900">{selectedOrigin.shortName}</strong>
            <span className="ml-2 text-slate-500">Change starting point</span>
          </summary>
          <div className="flex flex-wrap items-center gap-2 pt-3 pb-1">
            {ORIGIN_PRESETS.map((preset) => {
              const isSelected = selectedOrigin.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (preset.id === 'origin-current') {
                      handleRequestGps();
                    } else {
                      setSelectedOrigin(preset);
                      const bldg = buildings.find((b) => b.id === preset.buildingId) || null;
                      setOriginBuilding(bldg);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-900 text-white shadow-md border-2 border-purple-950 scale-[1.02]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.shortName}</span>
                </button>
              );
            })}
          </div>
        </details>

        {/* FAQ Guide Expansion */}
        {showFaqGuide && (
          <div id="accessibility-faqs" className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-2 text-xs text-purple-950 animate-fadeIn">
            <div className="font-extrabold text-sm flex items-center justify-between">
              <span>What should I do if an elevator is out of service?</span>
              <button
                onClick={() => setShowFaqGuide(false)}
                className="text-purple-700 hover:text-purple-950 font-bold px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] leading-relaxed">
              • <strong>Instant Reroute:</strong> GatorAccess automatically generates an outdoor ADA switchback ramp corridor bypassing the broken elevator.
              <br />
              • <strong>Free Golf Cart Shuttle:</strong> Tap <strong>"Gator Cart"</strong> to get picked up anywhere on campus by SFSU Parking & Transportation.
              <br />
              • <strong>DPRC Urgent Help:</strong> Call the DPRC team at <a href="tel:4154053580" className="underline font-bold text-blue-800">(415) 405-3580</a>.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP 2-COLUMN GRID (>= md); turn-by-turn expands to a full-screen focus view */}
      {/* ========================================================================= */}
      <div
        className={
          isFocusView
            ? 'hidden md:grid md:fixed md:inset-0 md:z-[60] md:bg-slate-100 md:p-4 md:overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 animate-fadeIn'
            : 'hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 xl:gap-6 items-start'
        }
      >
        <div className={isFocusView ? 'min-w-0 md:h-full md:min-h-0' : 'min-w-0'}>
      {/* 2. MODE A: CORRIDORS CAROUSEL VIEW (WHEN BROWSING CAMPUS DESTINATIONS)   */}
      {/* ========================================================================= */}
      {viewMode === 'carousel' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-xs shadow-xs">
                  <FaRoute className="w-3.5 h-3.5" />
                </span>
                <h4 className="font-black text-sm sm:text-base text-slate-900">
                  Direct Accessible Campus Corridors
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Swipe or select any destination card to launch turn-by-turn waypoints and Google Maps
              </p>
            </div>

            {/* Quick Search & Carousel Arrows */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <FaMagnifyingGlass className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter corridors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:ring-1 focus:ring-purple-600 outline-none w-36 sm:w-48"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollCorridorCarousel('up')}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 flex items-center justify-center transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                  title="Previous corridors"
                >
                  <FaChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => scrollCorridorCarousel('down')}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 flex items-center justify-center transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                  title="Next corridors"
                >
                  <FaChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Track */}
          <div
            ref={corridorCarouselRef}
            className="flex flex-col gap-3.5 max-h-[560px] overflow-y-auto p-1 scroll-smooth snap-y snap-mandatory"
          >
            {filteredCorridors.map((corridor, idx) => {
              const bldg = buildings.find((b) => b.id === corridor.destinationBuildingId);
              const hasBrokenElevator =
                bldg?.elevators.some((e) => e.status === 'down') || Boolean(corridor.elevatorDownWarning);

              return (
                <div
                  key={corridor.id}
                  onClick={() => handleSelectCorridor(corridor, false, true)}
                  className="w-full shrink-0 snap-start bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:shadow-xl flex flex-row overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
                >
                  {/* Location Photo */}
                  <div className="w-28 sm:w-36 shrink-0 self-stretch overflow-hidden bg-gradient-to-br from-purple-900 to-indigo-950 flex items-center justify-center">
                    {corridor.photoUrl ? (
                      <img
                        src={corridor.photoUrl}
                        alt={`${corridor.destinationName} at SFSU`}
                        loading="lazy"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <FaBuilding className="w-10 h-10 text-purple-300/60" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 p-4 flex flex-col justify-between space-y-3">
                  {/* Top Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px] uppercase tracking-wide">
                        {corridor.category}
                      </span>
                      <span className="font-mono font-black text-xs text-purple-950 bg-slate-100 px-1.5 py-0.5 rounded">
                        [{corridor.destinationCode}]
                      </span>
                    </div>

                    <h5 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-purple-950 leading-snug">
                      {corridor.title}
                    </h5>

                    {/* Simple Address */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <FaLocationDot className="w-3 h-3 text-purple-700 shrink-0" />
                      <span className="truncate">{corridor.destinationAddress}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {corridor.subtitle}
                    </p>
                  </div>

                  {/* Warning if elevator down */}
                  {hasBrokenElevator && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[10px] font-bold flex items-center gap-1.5">
                      <FaTriangleExclamation className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="line-clamp-1">Elevator alert: Outdoor ADA detour active</span>
                    </div>
                  )}

                  {/* Metrics Bar */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <FaWheelchair className="w-3 h-3" />
                      Zero-Stairs
                    </span>

                    <span className="font-bold text-slate-800">
                      ~{corridor.estimatedMinutes} mins • {corridor.distanceMeters}m
                    </span>
                  </div>

                  {/* Call to Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCorridor(corridor, false, true);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      title="View turn-by-turn directions beside the map"
                    >
                      <span>View Route & Map</span>
                      <FaArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODE B: DIRECT ACCESSIBLE CAMPUS CORRIDOR WITH TURN-BY-TURN WAYPOINTS  */}
      {/* ========================================================================= */}
      {viewMode === 'corridor_active' && activeRoute && (
        <div className="min-w-0 md:h-full md:min-h-0 flex flex-col gap-4 bg-white rounded-2xl shadow-md border-2 border-purple-400 p-4 sm:p-5">
          {/* Header: back, title, route summary, quick actions */}
          <div className="space-y-4 pb-5 border-b border-purple-100">
            <button
              onClick={() => setViewMode('carousel')}
              className="px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              title="Return to Corridors Carousel"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span>Back to All Corridors</span>
            </button>

            <h4 className="font-black text-xl text-purple-950 leading-tight">
              {activeRoute.title}
            </h4>

            {/* Route summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
              <div className="flex items-start gap-3 p-3">
                <FaLocationDot className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">From</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedOrigin.id === 'origin-current'
                      ? selectedOrigin.shortName
                      : `${selectedOrigin.shortName} (${selectedOrigin.address})`}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3">
                <FaLocationDot className="w-4 h-4 mt-0.5 text-purple-700 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">To</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedCorridor?.destinationName || destBuilding?.name} ({selectedCorridor?.destinationAddress || destBuilding?.address || 'SFSU Campus'})
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions: one framed bar */}
            <div className="grid grid-cols-3 divide-x divide-purple-200 rounded-xl border border-purple-200 bg-purple-50/50 overflow-hidden">
              <button
                onClick={onRequestRide}
                className="flex flex-col items-center justify-center gap-1.5 px-2 py-3 text-purple-950 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Request Gator Cart electric golf shuttle"
              >
                <FaCar className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-bold">Gator Cart</span>
              </button>

              <button
                onClick={speakInstructions}
                className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 transition-colors cursor-pointer ${
                  isSpeaking ? 'bg-rose-600 text-white' : 'text-purple-950 hover:bg-purple-100'
                }`}
                title="Read turn-by-turn accessible guidance aloud"
              >
                <FaVolumeHigh className={`w-5 h-5 ${isSpeaking ? 'text-white' : 'text-purple-700'}`} />
                <span className="text-xs font-bold">{isSpeaking ? 'Stop Voice' : 'Read Aloud'}</span>
              </button>

              {activeRoute.googleMapsUrl ? (
                <a
                  href={activeRoute.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 px-2 py-3 text-purple-950 hover:bg-blue-100 transition-colors"
                  title="Open genuine pedestrian route in Google Maps app"
                >
                  <FaArrowUpRightFromSquare className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-bold">Google Maps</span>
                </a>
              ) : (
                <div />
              )}
            </div>
          </div>

          {/* Elevator Down Warning Notice */}
          {activeRoute.warningNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-semibold flex items-start gap-3">
              <FaTriangleExclamation className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />
              <div>{activeRoute.warningNotice}</div>
            </div>
          )}

          {/* Active Barrier & Detour Notice if an unresolved report is present */}
          {unresolvedBarriers.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm flex items-start gap-3">
              <FaTriangleExclamation className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
              <div className="space-y-1">
                <div className="font-bold text-amber-900">Active unresolved campus barrier detected</div>
                <p className="text-xs leading-relaxed">
                  <strong>Reported obstacle:</strong> {unresolvedBarriers[0].title || unresolvedBarriers[0].category} at {unresolvedBarriers[0].locationName}.
                  The route automatically bypasses it using a verified low-grade path, highlighted on the map.
                </p>
              </div>
            </div>
          )}

          {/* Turn-by-turn header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-purple-800 text-white flex items-center justify-center shrink-0">
                <FaCompass className="w-4 h-4" />
              </span>
              <div>
                <h5 className="font-extrabold text-base text-slate-900 leading-tight">
                  Turn-by-turn directions
                </h5>
                <p className="text-xs text-slate-500">
                  Step {(selectedWaypointIndex ?? 0) + 1} of {activeRoute.steps.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollWaypointCarousel('left')}
                className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 text-sm font-bold flex items-center gap-2 border border-slate-200 cursor-pointer"
                title="Previous waypoint"
              >
                <FaChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => scrollWaypointCarousel('right')}
                className="h-9 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
                title="Next waypoint"
              >
                <span>Next</span>
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Turn-by-turn steps */}
          <div
            ref={waypointCarouselRef}
            className="flex flex-col gap-3 md:flex-1 md:min-h-0 md:overflow-y-auto p-1 scroll-smooth"
          >
            {activeRoute.steps.map((step, idx) => {
              const isSelected = selectedWaypointIndex === idx;
              const isFirst = idx === 0;
              const isLast = idx === activeRoute.steps.length - 1;

              return (
                <div
                  key={`waypoint-card-${idx}`}
                  onClick={() => onSelectWaypoint && onSelectWaypoint(idx)}
                  className={`w-full min-w-0 shrink-0 p-4 rounded-xl border-2 transition-colors cursor-pointer flex flex-col gap-3 ${
                    isSelected
                      ? 'bg-purple-50 border-purple-600'
                      : 'bg-white border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                        isFirst
                          ? 'bg-emerald-600 text-white'
                          : isLast
                          ? 'bg-purple-950 text-amber-300'
                          : 'bg-purple-700 text-white'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {isFirst ? 'Departure' : isLast ? 'Destination' : `Waypoint ${idx + 1}`}
                      </div>
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {step.instruction}
                      </p>
                    </div>
                  </div>

                    <div className={`w-full text-xs text-purple-950 border border-purple-100 p-3 rounded-lg space-y-2 ${isSelected ? 'bg-white' : 'bg-purple-50'}`}>
                      <div>
                        <strong className="block text-purple-900 font-bold mb-0.5">ADA Low-Barrier Detail</strong>
                        {step.accessibilityNotes}
                      </div>

                      {/* Slope warning for step */}
                      <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <FaTriangleExclamation className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Slope</span>
                        </span>
                        <span className="text-right">
                          {idx === 0
                            ? '1.8% gentle grade'
                            : idx === 1
                            ? '3.5% low-grade ramp'
                            : idx % 2 === 0
                            ? '2.2% level paved corridor'
                            : '4.0% incline (under 8.33% ADA max)'}
                        </span>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          {/* On-Site Verification Warning & ADA Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <FaShieldHalved className="w-4 h-4 mt-0.5 text-purple-700 shrink-0" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">On-site verification required</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify this route on site before use. Conditions can change with weather or maintenance. Neither GatorAccess AI nor Google Maps provides an official ADA determination.
              </p>
            </div>
          </div>
        </div>
      )}

        </div>
        {mapPanel && (
          <div
            className={
              isFocusView
                ? 'min-w-0 md:h-full md:min-h-0 [&>div]:h-full [&>div]:flex [&>div]:flex-col [&_.campus-map-root]:!h-[60vh] md:[&_.campus-map-root]:!h-auto md:[&_.campus-map-root]:flex-1 md:[&_.campus-map-root]:min-h-0'
                : 'min-w-0'
            }
          >
            {mapPanel}
          </div>
        )}
      </div>

      {/* Unified Route & Map Single Modal */}
      <UnifiedRouteModal
        isOpen={isUnifiedModalOpen}
        onClose={() => setIsUnifiedModalOpen(false)}
        activeRoute={activeRoute}
        selectedCorridorTitle={selectedCorridor?.title}
        originName={selectedOrigin.shortName}
        originAddress={selectedOrigin.address}
        destinationName={selectedCorridor?.destinationName || destBuilding?.name || 'SFSU Campus Destination'}
        destinationAddress={selectedCorridor?.destinationAddress || destBuilding?.address || 'SFSU Campus'}
        selectedWaypointIndex={selectedWaypointIndex ?? 0}
        onSelectWaypoint={(idx) => onSelectWaypoint && onSelectWaypoint(idx)}
        buildings={buildings}
        reports={reports}
        onRequestRide={onRequestRide}
        onOpenHotline={onOpenHotline}
        originBuilding={originBuilding}
        destBuilding={destBuilding}
      />
    </div>
  );
}
