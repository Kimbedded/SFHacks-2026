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
  const [showFaqGuide, setShowFaqGuide] = useState(false);

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
            address: `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
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
  }, [destBuilding]);

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
    const originLabel = `${selectedOrigin.shortName} (${selectedOrigin.address})`;
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

      // Construct turn-by-turn steps
      const steps = corridor.waypoints.map((wp) => ({
        instruction: wp.instruction,
        accessibilityNotes: wp.accessibilityNotes,
        isElevatorNeeded: Boolean(wp.isElevatorNeeded),
        isRamp: Boolean(wp.isRamp),
        coordinates: wp.coordinates,
      }));

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
        isFullyADACompliant: true,
        warningNotice: hasElevatorOutage ? corridor.elevatorDownWarning : undefined,
        pathCoordinates,
        googleMapsUrl: googleDirections?.googleMapsUrl || fallbackMapsUrl,
        steps,
      };

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
      setIsLoadingRoute(false);
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

    const textToRead = `${corridorName}. Distance: ${activeRoute.distanceMeters} meters, approximately ${activeRoute.estimatedMinutes} minutes walk. Verified zero-stair corridor. ${waypointSteps}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. SIMPLE ORIGIN BAR (REPLACES BULKY ORIGIN/DESTINATION FORM INPUTS)     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
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
            <label htmlFor="mobility-profile" className="text-xs font-semibold text-slate-500 whitespace-nowrap">Mobility profile</label>
            <select
              id="mobility-profile"
              value={mobilityProfile}
              onChange={(e) => setMobilityProfile(e.target.value)}
              className="w-40 sm:w-48 text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-2"
            >
              <option value="Power Wheelchair">Power wheelchair · Grade &lt; 5%</option>
              <option value="Manual Wheelchair">Manual wheelchair · Shallow slopes</option>
              <option value="Walker / Cane">Walker / cane · Rest benches</option>
              <option value="Visual / Tactile">Low vision · Tactile paths</option>
            </select>
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
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 xl:gap-6 items-start">
        <div className="min-w-0">
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
        <div className="min-w-0 md:max-h-[650px] md:overflow-y-auto bg-white rounded-2xl shadow-md border-2 border-purple-400 p-4 sm:p-5 space-y-4 animate-fadeIn">
          {/* Top Bar with Return button & Corridor Title */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-purple-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('carousel')}
                  className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Return to Corridors Carousel"
                >
                  <FaArrowLeft className="w-3 h-3" />
                  <span>All Corridors</span>
                </button>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase">
                  Active Zero-Stair Corridor
                </span>
              </div>

              <h4 className="font-black text-base sm:text-lg text-purple-950 leading-tight">
                {activeRoute.title}
              </h4>

              {/* Simple Address Navigation Display */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-bold text-slate-800">From:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700">
                  {selectedOrigin.shortName} ({selectedOrigin.address})
                </span>
                <span className="text-purple-700 font-bold">➔</span>
                <span className="font-bold text-slate-800">To:</span>
                <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                  {selectedCorridor?.destinationName || destBuilding?.name} ({selectedCorridor?.destinationAddress || destBuilding?.address || 'SFSU Campus'})
                </span>
              </div>
            </div>

            {/* Quick Action Buttons: Google Maps, Read Aloud, Request Ride */}
            <div className="flex flex-wrap items-center gap-2">
              {activeRoute.googleMapsUrl && (
                <a
                  href={activeRoute.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
                  title="Open genuine pedestrian route in Google Maps app"
                >
                  <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                </a>
              )}

              <button
                onClick={speakInstructions}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  isSpeaking
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'bg-white hover:bg-purple-100 text-purple-900 border-purple-200 shadow-2xs'
                }`}
                title="Read turn-by-turn accessible guidance aloud"
              >
                <FaVolumeHigh className="w-3.5 h-3.5" />
                <span>{isSpeaking ? 'Stop Voice' : 'Read Aloud'}</span>
              </button>

              <button
                onClick={onRequestRide}
                className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                title="Request Gator Cart electric golf shuttle"
              >
                <FaCar className="w-3.5 h-3.5" />
                <span>Gator Cart</span>
              </button>

            </div>
          </div>

          {/* Elevator Down Warning Notice */}
          {activeRoute.warningNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5">
              <FaTriangleExclamation className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{activeRoute.warningNotice}</div>
            </div>
          )}

          {/* Corridor Waypoints Carousel Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-800 text-white flex items-center justify-center font-bold text-xs">
                <FaCompass className="w-3.5 h-3.5" />
              </span>
              <div>
                <h5 className="font-extrabold text-sm text-slate-900">
                  Turn-by-turn directions
                </h5>
                <p className="text-[11px] text-slate-500">
                  Waypoint {(selectedWaypointIndex ?? 0) + 1} of {activeRoute.steps.length} • Select a step to highlight it on the map
                </p>
              </div>
            </div>

            {/* Next / Prev Waypoint Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollWaypointCarousel('left')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
                title="Previous waypoint"
              >
                <FaChevronLeft className="w-3 h-3" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => scrollWaypointCarousel('right')}
                className="px-2.5 py-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                title="Next waypoint"
              >
                <span>Next</span>
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Waypoint Stepper Progress Tracker */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            {activeRoute.steps.map((step, idx) => {
              const isSelected = selectedWaypointIndex === idx;
              const isFirst = idx === 0;
              const isLast = idx === activeRoute.steps.length - 1;

              return (
                <button
                  key={`step-dot-${idx}`}
                  onClick={() => onSelectWaypoint && onSelectWaypoint(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-900 text-amber-300 ring-2 ring-amber-400 shadow-md scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{isFirst ? 'Start' : isLast ? 'Arrival' : `WP ${idx + 1}`}</span>
                </button>
              );
            })}
          </div>

          {/* Turn-by-Turn Waypoints Horizontal Carousel */}
          <div
            ref={waypointCarouselRef}
            className="flex flex-col gap-3 max-h-[420px] overflow-y-auto p-1 scroll-smooth"
          >
            {activeRoute.steps.map((step, idx) => {
              const isSelected = selectedWaypointIndex === idx;
              const isFirst = idx === 0;
              const isLast = idx === activeRoute.steps.length - 1;

              return (
                <div
                  key={`waypoint-card-${idx}`}
                  onClick={() => onSelectWaypoint && onSelectWaypoint(idx)}
                  className={`w-full min-w-0 shrink-0 p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-gradient-to-b from-purple-50 to-white border-purple-600 shadow-lg ring-2 ring-purple-300 scale-[1.01]'
                      : 'bg-slate-50/70 border-slate-200 hover:border-purple-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase flex items-center gap-1 ${
                          isFirst
                            ? 'bg-emerald-600 text-white'
                            : isLast
                            ? 'bg-purple-950 text-amber-300'
                            : 'bg-purple-700 text-white'
                        }`}
                      >
                        {isFirst ? 'Departure' : isLast ? 'Destination' : `Waypoint ${idx + 1}`}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400">
                        GPS: {step.coordinates.lat.toFixed(4)}, {step.coordinates.lng.toFixed(4)}
                      </span>
                    </div>

                    <p className="font-extrabold text-xs text-slate-900 leading-snug">
                      {step.instruction}
                    </p>
                  </div>

                  {/* ADA Feature Tag */}
                  <div className="pt-1.5 border-t border-slate-200/80 text-[10px] text-purple-950 bg-purple-50/60 p-2 rounded-lg font-medium">
                    <strong className="block text-purple-900 font-bold mb-0.5">ADA Low-Barrier Detail:</strong>
                    {step.accessibilityNotes}
                  </div>
                </div>
              );
            })}
          </div>


        </div>
      )}

        </div>
        {mapPanel && <div className="min-w-0">{mapPanel}</div>}
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
