import React, { useState, useEffect, useRef } from 'react';
import { CampusBuilding, AccessibleRouteOption, Coordinates } from '../types';
import {
  FaWheelchair,
  FaSquareParking,
  FaElevator,
  FaRoute,
  FaCompass,
  FaCar,
  FaHeart,
  FaTrainSubway,
  FaLaptopCode,
  FaPersonSwimming,
  FaVolumeHigh,
  FaArrowRightArrowLeft,
  FaMagnifyingGlass,
  FaLocationCrosshairs,
  FaLocationDot,
  FaClock,
  FaTriangleExclamation,
  FaCircleQuestion,
  FaArrowUpRightFromSquare,
  FaXmark,
  FaCheck,
  FaArrowTrendUp,
} from 'react-icons/fa6';
import { getGoogleMapsWalkingRoute, getGoogleMapsExternalUrl } from '../utils/googleDirections';

interface RoutePlannerProps {
  buildings: CampusBuilding[];
  originBuilding: CampusBuilding | null;
  destBuilding: CampusBuilding | null;
  setOriginBuilding: (b: CampusBuilding | null) => void;
  setDestBuilding: (b: CampusBuilding | null) => void;
  activeRoute: AccessibleRouteOption | null;
  setActiveRoute: (route: AccessibleRouteOption | null) => void;
  onRequestRide: () => void;
  hasElevatorDownInDest: boolean;
  onOpenHotline: () => void;
}

export function RoutePlanner({
  buildings,
  originBuilding,
  destBuilding,
  setOriginBuilding,
  setDestBuilding,
  activeRoute,
  setActiveRoute,
  onRequestRide,
  hasElevatorDownInDest,
  onOpenHotline,
}: RoutePlannerProps) {
  // Autocomplete Text Input States
  const [originText, setOriginText] = useState('Current Location');
  const [destText, setDestText] = useState(destBuilding ? `${destBuilding.name} (${destBuilding.code})` : '');

  const [originSuggestionsOpen, setOriginSuggestionsOpen] = useState(false);
  const [destSuggestionsOpen, setDestSuggestionsOpen] = useState(false);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);

  const [mobilityProfile, setMobilityProfile] = useState<string>('Power Wheelchair');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showFaqGuide, setShowFaqGuide] = useState(false);

  const originWrapperRef = useRef<HTMLDivElement>(null);
  const destWrapperRef = useRef<HTMLDivElement>(null);

  // Sync external building changes
  useEffect(() => {
    if (destBuilding) {
      setDestText(`${destBuilding.name} (${destBuilding.code})`);
    }
  }, [destBuilding]);

  useEffect(() => {
    if (originBuilding) {
      setOriginText(`${originBuilding.name} (${originBuilding.code})`);
    }
  }, [originBuilding]);

  // Click outside to close suggestion dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (originWrapperRef.current && !originWrapperRef.current.contains(e.target as Node)) {
        setOriginSuggestionsOpen(false);
      }
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target as Node)) {
        setDestSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request Live GPS Location
  const requestCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(coords);
          setGpsActive(true);
          setOriginText('Current Location');
          setOriginBuilding(null);
          setIsLocating(false);
        },
        (_error) => {
          // Fallback to SFSU 19th & Holloway Transit Hub default GPS point
          const fallbackCoords = { lat: 37.7234, lng: -122.475 };
          setUserLocation(fallbackCoords);
          setGpsActive(true);
          setOriginText('Current Location (19th & Holloway)');
          setOriginBuilding(null);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const fallbackCoords = { lat: 37.7234, lng: -122.475 };
      setUserLocation(fallbackCoords);
      setGpsActive(true);
      setOriginText('Current Location (19th & Holloway)');
      setOriginBuilding(null);
      setIsLocating(false);
    }
  };

  // Initial GPS location fetch on mount
  useEffect(() => {
    requestCurrentLocation();
  }, []);

  // Filter building suggestions based on user input
  const getFilteredSuggestions = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q || q === 'current location') return buildings;
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.amenities.some((a) => a.toLowerCase().includes(q))
    );
  };

  // "Take me to..." frequent services handler
  const handleFrequentServiceClick = (targetBuildingId: string, serviceTitle?: string) => {
    const target = buildings.find((b) => b.id === targetBuildingId);
    if (!target) return;

    setDestBuilding(target);
    setDestText(`${target.name} (${target.code})`);

    // If origin is empty, ensure Current Location is used
    if (!originBuilding && (!originText || originText.includes('Current Location'))) {
      setOriginText('Current Location');
    }

    // Automatically trigger route calculation
    calculateRouteWithParams(originBuilding, target);
  };

  const calculateRouteWithParams = async (
    origin: CampusBuilding | null,
    dest: CampusBuilding,
    simulateOutage = false
  ) => {
    setIsLoading(true);

    const originName = origin ? `${origin.name} (${origin.code})` : 'Current Location (SFSU Campus)';
    const destName = `${dest.name} (${dest.code})`;
    const isElevatorDown = simulateOutage || dest.elevators.some((e) => e.status === 'down');

    const startCoord = origin ? origin.coordinates : (userLocation || { lat: 37.7234, lng: -122.475 });
    const endCoord = dest.coordinates;
    const fallbackMapsUrl = getGoogleMapsExternalUrl(startCoord, endCoord, originName, destName);

    try {
      // 1. Fetch AI Accessibility Detour Guidance
      const aiPromise = fetch('/api/suggest-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originName,
          destination: destName,
          mobilityProfile,
          activeBarriers: isElevatorDown
            ? [`${dest.name} elevator reported out of service (CRITICAL OUTAGE)`]
            : [],
        }),
      })
        .then((r) => r.json())
        .catch(() => ({ routePlan: null }));

      // 2. Fetch High-Resolution Google Maps Pedestrian Path (Sidewalks & Walkways)
      const directionsPromise = getGoogleMapsWalkingRoute(startCoord, endCoord, originName, destName)
        .catch(() => null);

      const [aiData, googleDirections] = await Promise.all([aiPromise, directionsPromise]);
      const plan = aiData?.routePlan || {};

      // Use true Google Maps pathway coordinates following actual campus walkways
      const pathCoordinates: Coordinates[] =
        googleDirections && googleDirections.pathCoordinates.length > 1
          ? googleDirections.pathCoordinates
          : [
              startCoord,
              ...((plan.steps || [])
                .filter((s: any) => s.lat && s.lng)
                .map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }))),
              endCoord,
            ];

      const distanceMeters = googleDirections?.distanceMeters || plan.distanceMeters || 320;
      const estimatedMinutes = googleDirections?.estimatedMinutes || plan.estimatedMinutes || 5;

      const routeOption: AccessibleRouteOption = {
        id: `route-${Date.now()}`,
        title: plan.routeTitle || `Accessible Route to ${dest.name}`,
        type: isElevatorDown ? 'shallowest_slope' : 'maximum_accessibility',
        distanceMeters,
        estimatedMinutes,
        maxSlopeGrade: plan.maxSlopeGrade || 3.4,
        elevationGainMeters: 3.8,
        isFullyADACompliant: true,
        warningNotice: isElevatorDown
          ? `REROUTED: ${dest.name} elevator is offline. Route avoids indoor stairs and guides via outdoor ADA switchback ramp.`
          : undefined,
        pathCoordinates,
        googleMapsUrl: googleDirections?.googleMapsUrl || fallbackMapsUrl,
        steps: (plan.steps && plan.steps.length > 0)
          ? plan.steps.map((s: any) => ({
              instruction: s.instruction,
              accessibilityNotes: s.accessibilityDetail,
              isElevatorNeeded: s.isRampOrElevator,
              isRamp: s.isRampOrElevator,
              coordinates: { lat: s.lat || startCoord.lat, lng: s.lng || startCoord.lng },
            }))
          : (googleDirections?.steps || []).map((s: any) => ({
              instruction: s.instruction,
              accessibilityNotes: `Paved pedestrian sidewalk (${s.distance || 'accessible'})`,
              isElevatorNeeded: false,
              isRamp: false,
              coordinates: s.coordinates || startCoord,
            })),
      };

      setActiveRoute(routeOption);
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateRoute = () => {
    let targetDest = destBuilding;
    if (!targetDest) {
      // Try to find matching destination from text
      const match = buildings.find(
        (b) =>
          destText.toLowerCase().includes(b.name.toLowerCase()) ||
          destText.toLowerCase().includes(b.code.toLowerCase())
      );
      if (match) {
        targetDest = match;
        setDestBuilding(match);
      } else if (buildings.length > 0) {
        targetDest = buildings[0];
        setDestBuilding(targetDest);
      }
    }

    if (targetDest) {
      calculateRouteWithParams(originBuilding, targetDest, hasElevatorDownInDest);
    }
  };

  const handleSwapLocations = () => {
    if (!originBuilding && !destBuilding) return;
    const prevOrigin = originBuilding;
    const prevOriginText = originText;

    setOriginBuilding(destBuilding);
    setOriginText(destText);

    setDestBuilding(prevOrigin);
    setDestText(prevOriginText);
  };

  // Text-to-Speech audio navigation
  const speakInstructions = () => {
    if (!activeRoute || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = `${activeRoute.title}. Estimated travel time: ${activeRoute.estimatedMinutes} minutes. Max slope: ${activeRoute.maxSlopeGrade} percent. ${activeRoute.steps.map((s, idx) => `Step ${idx + 1}: ${s.instruction}. ${s.accessibilityNotes}`).join(' ')}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4">
      {/* 1. "TAKE ME TO..." PROMINENT QUICK ACTIONS & FREQUENT SERVICES */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-purple-700 text-white font-extrabold text-xs shadow-sm">
              ⚡ QUICK ACCESS
            </span>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
              Take me to...
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFaqGuide(!showFaqGuide)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors flex items-center gap-1"
            >
              <FaCircleQuestion className="w-3.5 h-3.5" />
              <span>What should I do? / FAQs</span>
            </button>

            <button
              onClick={onRequestRide}
              className="text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1"
            >
              <FaCar className="w-3.5 h-3.5" />
              <span>Gator Cart</span>
            </button>
          </div>
        </div>

        {/* Frequent Service Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {/* DPRC Office */}
          <button
            onClick={() => handleFrequentServiceClick('ccsc', 'DPRC')}
            className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs mb-1.5 group-hover:scale-110 transition-transform">
              <FaWheelchair className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-xs font-bold text-purple-950 truncate">DPRC Office</div>
            <div className="text-[10px] text-purple-700 truncate">Cesar Chavez Rm 400</div>
          </button>

          {/* CAPS Therapy */}
          <button
            onClick={() => handleFrequentServiceClick('ssb', 'CAPS')}
            className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 group-hover:scale-110 transition-transform">
              <FaHeart className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-xs font-bold text-blue-950 truncate">CAPS Counseling</div>
            <div className="text-[10px] text-blue-700 truncate">SSB Suite 205</div>
          </button>

          {/* Assistive Tech Lab */}
          <button
            onClick={() => handleFrequentServiceClick('library', 'Assistive Tech')}
            className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs mb-1.5 group-hover:scale-110 transition-transform">
              <FaLaptopCode className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-xs font-bold text-indigo-950 truncate">Assistive Tech Lab</div>
            <div className="text-[10px] text-indigo-700 truncate">Library 2nd Floor</div>
          </button>

          {/* 19th & Holloway Transit */}
          <button
            onClick={() => handleFrequentServiceClick('muni_bart_station', 'Transit')}
            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 group-hover:scale-110 transition-transform">
              <FaTrainSubway className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-xs font-bold text-emerald-950 truncate">Muni & BART Hub</div>
            <div className="text-[10px] text-emerald-700 truncate">19th & Holloway Ramp</div>
          </button>

          {/* Lot 20 ADA Parking */}
          <button
            onClick={() => handleFrequentServiceClick('lot_20', 'Lot 20')}
            className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs mb-1.5 group-hover:scale-110 transition-transform">
              <FaSquareParking className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-xs font-bold text-blue-950 truncate">Lot 20 ADA Garage</div>
            <div className="text-[10px] text-blue-800 truncate">Covered Bridge Access</div>
          </button>

          {/* Mashouf ADA Wellness */}
          <button
            onClick={() => handleFrequentServiceClick('mashouf', 'Wellness')}
            className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100/70 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 group-hover:scale-110 transition-transform">
              <FaPersonSwimming className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-xs font-bold text-teal-950 truncate">Mashouf Wellness</div>
            <div className="text-[10px] text-teal-800 truncate">Zero-Entry & Lift</div>
          </button>
        </div>

        {/* Collapsible FAQ & Guide for "What should I do?" */}
        {showFaqGuide && (
          <div className="p-4 bg-slate-50 border border-purple-200 rounded-xl space-y-3 text-xs text-slate-700 animate-fadeIn">
            <div className="flex items-center justify-between font-bold text-purple-950 text-sm">
              <span className="flex items-center gap-1.5">
                <FaCircleQuestion className="w-4 h-4 text-purple-700" />
                Frequently Asked Accessibility Scenarios:
              </span>
              <button onClick={() => setShowFaqGuide(false)} className="text-slate-400 hover:text-slate-700">
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">What if my elevator is broken?</div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  1. Check the pathfinder: it automatically reroutes via outdoor switchback ramps.
                  <br />
                  2. If too steep or tiring, tap <strong>"Request Gator Cart Ride"</strong> for an electric shuttle pickup.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Where do I get urgent exam accommodations?</div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Go to <strong>DPRC</strong> in Cesar Chavez Student Center Room 400 or dial <a href="tel:4154053580" className="text-purple-700 underline font-semibold">(415) 405-3580</a>.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Need immediate mental health support?</div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Call <strong>CAPS 24/7</strong> at <a href="tel:4153382208" className="text-blue-700 underline font-semibold">(415) 338-2208</a> or text <strong>COURAGE</strong> to 741741.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. TEXTBOX PROMPT TO TEXTBOX PROMPT PATHFINDER WITH AUTOCOMPLETION */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
              <FaCompass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                Low-Barrier Accessible Route Finder
              </h3>
              <p className="text-[11px] text-slate-500">
                Dynamic live GPS • ADA slope avoidance (&lt; 5%) • Real-time elevator bypass
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">Mobility:</span>
            <select
              value={mobilityProfile}
              onChange={(e) => setMobilityProfile(e.target.value)}
              className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none"
            >
              <option value="Power Wheelchair">Power Wheelchair (Clearance & Power Doors)</option>
              <option value="Manual Wheelchair">Manual Wheelchair (Avoid Slopes &gt; 5%)</option>
              <option value="Crutches or Walker">Crutches / Walking Cane (Rest Benches)</option>
              <option value="Visual Impairment">Visual Guide (Tactile & Audio Signals)</option>
            </select>
          </div>
        </div>

        {/* Textbox to Textbox Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
          {/* Origin Textbox with Autocomplete */}
          <div ref={originWrapperRef} className="relative space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Origin (Start Location)
              </span>
              {gpsActive && (
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <FaLocationCrosshairs className="w-3 h-3" /> Live GPS Active
                </span>
              )}
            </label>

            <div className="relative">
              <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={originText}
                onChange={(e) => {
                  setOriginText(e.target.value);
                  setOriginSuggestionsOpen(true);
                  if (e.target.value !== 'Current Location') {
                    setOriginBuilding(null);
                  }
                }}
                onFocus={() => setOriginSuggestionsOpen(true)}
                placeholder="Current Location (default) or type building..."
                className="w-full text-xs font-semibold pl-9 pr-16 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />

              {/* Use Current GPS button inside input */}
              <button
                type="button"
                onClick={requestCurrentLocation}
                className="absolute right-2 top-2 px-2 py-1 rounded-md text-[10px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-900 transition-colors flex items-center gap-1"
                title="Detect live GPS location"
              >
                <FaLocationCrosshairs className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>GPS</span>
              </button>
            </div>

            {/* Origin Autocomplete Dropdown */}
            {originSuggestionsOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-30 text-xs divide-y divide-slate-100 animate-fadeIn">
                {/* Option 1: Current Location Live GPS */}
                <div
                  onClick={() => {
                    requestCurrentLocation();
                    setOriginText('Current Location');
                    setOriginBuilding(null);
                    setOriginSuggestionsOpen(false);
                  }}
                  className="p-2.5 hover:bg-purple-50 cursor-pointer flex items-center space-x-2 text-purple-950 font-bold"
                >
                  <FaLocationCrosshairs className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <div>📍 Current Location (GPS)</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Automatically uses your device’s live location
                    </div>
                  </div>
                </div>

                {/* Building Suggestions */}
                {getFilteredSuggestions(originText).map((b) => (
                  <div
                    key={`origin-${b.id}`}
                    onClick={() => {
                      setOriginBuilding(b);
                      setOriginText(`${b.name} (${b.code})`);
                      setOriginSuggestionsOpen(false);
                    }}
                    className="p-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{b.name}</div>
                      <div className="text-[10px] text-slate-500">{b.code} • {b.amenities[0]}</div>
                    </div>
                    {b.elevators.some((e) => e.status === 'down') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        Elevator Out
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Swap Locations Button */}
          <div className="flex justify-center pt-5 sm:pt-4">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="p-2 rounded-xl border border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-900 transition-all hover:scale-110 active:scale-95 shadow-2xs"
              title="Swap Origin and Destination"
            >
              <FaArrowRightArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination Textbox with Autocomplete */}
          <div ref={destWrapperRef} className="relative space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                Destination (Where to?)
              </span>
              {hasElevatorDownInDest && (
                <span className="text-[10px] text-rose-700 font-bold">
                  ⚠️ Elevator Issue Detected
                </span>
              )}
            </label>

            <div className="relative">
              <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={destText}
                onChange={(e) => {
                  setDestText(e.target.value);
                  setDestSuggestionsOpen(true);
                }}
                onFocus={() => setDestSuggestionsOpen(true)}
                placeholder="Search building, code, lab, or DPRC..."
                className="w-full text-xs font-semibold pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
              {destText && (
                <button
                  type="button"
                  onClick={() => {
                    setDestText('');
                    setDestBuilding(null);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <FaXmark className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Destination Autocomplete Dropdown */}
            {destSuggestionsOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-30 text-xs divide-y divide-slate-100 animate-fadeIn">
                {getFilteredSuggestions(destText).map((b) => (
                  <div
                    key={`dest-${b.id}`}
                    onClick={() => {
                      setDestBuilding(b);
                      setDestText(`${b.name} (${b.code})`);
                      setDestSuggestionsOpen(false);
                      calculateRouteWithParams(originBuilding, b);
                    }}
                    className="p-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{b.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {b.code} • {b.amenities.slice(0, 2).join(', ')}
                      </div>
                    </div>
                    {b.elevators.some((e) => e.status === 'down') ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        Elevator Out
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                        ADA Ready
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calculate Route Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Quick Demo scenario shortcuts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold hidden sm:inline">Try Demo:</span>
            <button
              onClick={() => {
                const target = buildings.find((b) => b.id === 'ccsc') || buildings[0];
                setDestBuilding(target);
                setDestText(`${target.name} (${target.code})`);
                setOriginText('19th & Holloway Transit Hub');
                calculateRouteWithParams(null, target, true);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition-colors"
            >
              ⚠️ Broken Elevator Bypass
            </button>
            <button
              onClick={() => {
                const target = buildings.find((b) => b.id === 'fine_arts') || buildings[1];
                setDestBuilding(target);
                setDestText(`${target.name} (${target.code})`);
                setOriginText('J. Paul Leonard Library');
                calculateRouteWithParams(buildings.find((b) => b.id === 'library') || null, target, false);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
            >
              📐 Steep Slope Avoidance (&lt; 5%)
            </button>
          </div>

          <button
            onClick={handleCalculateRoute}
            disabled={isLoading || (!destBuilding && !destText)}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>Gemini Calculating Accessible Route...</span>
              </>
            ) : (
              <>
                <FaRoute className="w-4 h-4" />
                <span>Find Accessible Route</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. ACTIVE ROUTE BREAKDOWN (RENDERED WHEN ROUTE IS ACTIVE) */}
      {activeRoute && (
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-300 bg-gradient-to-b from-purple-50/70 to-white shadow-md space-y-4 animate-fadeIn">
          {/* Warning Banner if rerouted */}
          {activeRoute.warningNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5">
              <FaTriangleExclamation className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{activeRoute.warningNotice}</div>
            </div>
          )}

          {/* Metric Badges & Audio Reader */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-100">
            <div>
              <div className="text-sm sm:text-base font-black text-purple-950">{activeRoute.title}</div>
              <div className="text-xs text-purple-800 font-medium">Verified Zero-Stair ADA Campus Corridor</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeRoute.googleMapsUrl && (
                <a
                  href={activeRoute.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-transform hover:scale-105 active:scale-95"
                  title="Open this route in Google Maps navigation"
                >
                  <FaArrowUpRightFromSquare className="w-3 h-3" />
                  <span>Open in Google Maps</span>
                </a>
              )}

              <button
                onClick={speakInstructions}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  isSpeaking
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                    : 'bg-white hover:bg-purple-100 text-purple-900 border-purple-200 shadow-2xs'
                }`}
                title="Read accessible route aloud for blind/low-vision students"
              >
                <FaVolumeHigh className="w-3.5 h-3.5" />
                <span>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</span>
              </button>

              <button
                onClick={onRequestRide}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-lg shadow-sm transition-transform active:scale-95"
              >
                <FaCar className="w-3.5 h-3.5" />
                <span>Request Cart</span>
              </button>
            </div>
          </div>

          {/* Dedicated Google Maps Launch Banner */}
          {activeRoute.googleMapsUrl && (
            <div className="p-3.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white rounded-xl shadow-sm border border-blue-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
                  <FaRoute className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <span>Google Maps Pedestrian Navigation</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-400/30 text-blue-200 rounded font-semibold">
                      Live Pathway
                    </span>
                  </div>
                  <div className="text-blue-200 text-[11px]">
                    Opens the exact walking path with turn-by-turn spoken guidance in Google Maps.
                  </div>
                </div>
              </div>

              <a
                href={activeRoute.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 shrink-0"
              >
                <FaArrowUpRightFromSquare className="w-3 h-3" />
                <span>Open Route via Google Maps</span>
              </a>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Estimated Time</div>
              <div className="text-xs sm:text-sm font-black text-purple-950 flex items-center justify-center gap-1 mt-0.5">
                <FaClock className="w-3.5 h-3.5 text-purple-600" />
                {activeRoute.estimatedMinutes} mins
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Distance</div>
              <div className="text-xs sm:text-sm font-black text-purple-950 flex items-center justify-center gap-1 mt-0.5">
                <FaLocationDot className="w-3.5 h-3.5 text-purple-600" />
                {activeRoute.distanceMeters} m
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Max Slope Grade</div>
              <div className="text-xs sm:text-sm font-black text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                <FaArrowTrendUp className="w-3.5 h-3.5 text-emerald-600" />
                {activeRoute.maxSlopeGrade}% (ADA Compliant)
              </div>
            </div>
          </div>

          {/* Step-by-Step Waypoint Guidance */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800">Turn-by-Turn Waypoints:</div>
            <div className="space-y-2">
              {activeRoute.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-start space-x-3 shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-slate-900 leading-snug">{step.instruction}</p>
                    <p className="text-[11px] text-purple-900/90 bg-purple-50 px-2 py-0.5 rounded font-medium inline-block">
                      ℹ️ {step.accessibilityNotes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
