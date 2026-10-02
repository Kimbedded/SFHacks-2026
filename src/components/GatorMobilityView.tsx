import React, { useState } from 'react';
import { CampusBuilding, AssistanceRequest } from '../types';
import {
  FaWheelchair,
  FaCar,
  FaHeart,
  FaPhone,
  FaClock,
  FaLocationDot,
  FaCircleCheck,
  FaShieldHalved,
} from 'react-icons/fa6';

interface GatorMobilityViewProps {
  buildings: CampusBuilding[];
  onOpenHotline: () => void;
}

export function GatorMobilityView({ buildings, onOpenHotline }: GatorMobilityViewProps) {
  const [pickupLocation, setPickupLocation] = useState('19th Ave & Holloway Transit Hub');
  const [dropoffLocation, setDropoffLocation] = useState(buildings[0] ? `${buildings[0].name} (${buildings[0].code})` : 'Lot 20 ADA Garage Elevator Bridge');
  const [mobilityNeeds, setMobilityNeeds] = useState('Wheelchair Accessible Ramp Cart');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');

  const [activeRequest, setActiveRequest] = useState<AssistanceRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestRide = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const simulatedRequest: AssistanceRequest = {
        id: `req-${Date.now()}`,
        requesterName: requesterName || 'Gator Student',
        requesterPhone: requesterPhone || '(415) 555-0100',
        mobilityNeeds,
        serviceType: 'gator_mobility_cart',
        pickupLocation,
        dropoffLocation,
        status: 'in_transit',
        etaMinutes: 4,
        vehicleAssigned: 'Gator Cart #3 (Electric 6-Seater with Flip-Down ADA Ramp)',
        driverName: 'Sammy R. (Gator Mobility Operations)',
        requestedAt: 'Just now',
        notes: '',
      };

      setActiveRequest(simulatedRequest);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="w-full min-w-0 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-purple-950 text-white p-6 rounded-2xl shadow-sm border border-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="p-1 rounded-md bg-amber-400 text-purple-950 font-bold text-xs flex items-center gap-1">
              <FaWheelchair className="w-3 h-3 text-purple-950" />
              FREE ON-CAMPUS SERVICE
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Rides & support
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-purple-200">
            Request an accessible campus ride, talk to a counselor, or arrange a safety escort.
          </p>
        </div>

        <button
          onClick={onOpenHotline}
          className="px-4 py-2.5 bg-purple-700/80 hover:bg-purple-600 text-white font-bold text-xs rounded-xl border border-purple-400/40 shadow-sm transition-transform active:scale-95 shrink-0 flex items-center gap-2"
        >
          <FaPhone className="w-3.5 h-3.5 text-amber-300" />
          <span>Call DPRC Hotline</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-stretch">
        {/* Left Column: Gator Mobility Shuttle Dispatch */}
        <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-violet-200 border-t-4 border-t-violet-600 p-5 sm:p-6 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <FaCar className="w-5 h-5 text-purple-800" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                <span>Request a campus ride</span>
                <FaWheelchair className="w-3.5 h-3.5 text-blue-600" />
              </h3>
              <p className="text-xs text-slate-500">
                Accessible cart rides between campus locations.
              </p>
            </div>
          </div>

          {activeRequest ? (
            <div role="status" aria-live="polite" className="p-5 rounded-2xl bg-gradient-to-b from-purple-50 to-white border-2 border-purple-300 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-700 text-white uppercase tracking-wider flex items-center gap-1">
                  <FaCircleCheck className="w-3 h-3 text-emerald-400" />
                  Demo ride confirmed
                </span>
                <span className="text-xs font-mono font-bold text-purple-900 flex items-center gap-1">
                  <FaClock className="w-3 h-3 text-purple-600" />
                  ETA ~{activeRequest.etaMinutes} mins
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black text-slate-900">{activeRequest.vehicleAssigned}</div>
                <div className="text-xs text-slate-600">
                  Driver: <span className="font-bold text-purple-950">{activeRequest.driverName}</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-purple-100 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Pickup: <strong>{activeRequest.pickupLocation}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Dropoff: <strong>{activeRequest.dropoffLocation}</strong></span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium flex items-center gap-2">
                <FaWheelchair className="w-4 h-4 text-purple-900 shrink-0" />
                <span>This is a demo request. To arrange a real ride, call mobility dispatch.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="tel:4153381441"
                  className="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl text-center shadow-sm flex items-center justify-center gap-1.5"
                >
                  <FaPhone className="w-3 h-3" />
                  <span>Call mobility dispatch</span>
                </a>
                <button
                  onClick={() => setActiveRequest(null)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel / New Ride
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequestRide} className="space-y-4 text-sm">
              <p className="text-xs text-slate-500">Demo booking · Call mobility dispatch to arrange a real ride.</p>
              <div>
                <label htmlFor="pickupLocation" className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <FaLocationDot className="w-3 h-3 text-emerald-600" />
                  Pickup Point
                </label>
                <select id="pickupLocation"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-medium"
                >
                  <option value="19th Ave & Holloway Transit Hub">19th Ave & Holloway Transit Hub (Muni M-Ocean View)</option>
                  <option value="Lot 20 Parking Garage Level 1 ADA Stalls">Lot 20 Parking Garage (ADA Stalls & Bridge)</option>
                  <option value="North State Drive ADA Surface Lot">North State Drive ADA Surface Stalls</option>
                  <option value="Cesar Chavez Student Center Plaza">Cesar Chavez Student Center Plaza</option>
                  <option value="J. Paul Leonard Library North Entrance">J. Paul Leonard Library North Entrance</option>
                  <option value="Mashouf Wellness Center">Mashouf Wellness Center Front Entrance</option>
                  <option value="Thornton Hall East Wing">Thornton Hall East Wing</option>
                </select>
              </div>

              <div>
                <label htmlFor="dropoffLocation" className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <FaLocationDot className="w-3 h-3 text-amber-600" />
                  Destination
                </label>
                <select id="dropoffLocation"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-medium"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={`${b.name} (${b.code})`}>
                      {b.name} [{b.code}]
                    </option>
                  ))}
                  <option value="Lot 20 ADA Garage Elevator Bridge">Lot 20 ADA Garage Bridge</option>
                  <option value="19th & Holloway Transit Platform">19th & Holloway Transit Platform</option>
                </select>
              </div>

              <div>
                <label htmlFor="mobilityNeeds" className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <FaWheelchair className="w-3 h-3 text-blue-600" />
                  Accessibility needs
                </label>
                <select id="mobilityNeeds"
                  value={mobilityNeeds}
                  onChange={(e) => setMobilityNeeds(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-medium"
                >
                  <option value="Wheelchair Accessible Ramp Cart">Power Wheelchair / Manual Wheelchair Flip-Ramp Cart</option>
                  <option value="Standard Low-Floor Golf Cart">Standard Low-Floor Golf Cart (Walking Injury / Sprain)</option>
                  <option value="Accessible Parking Lot 20 Shuttle">ADA Parking Lot 20 to Class Transfer</option>
                  <option value="Visually Impaired Sighted Guide">Sighted Guide + Physical Escort</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="requesterName" className="block text-slate-700 font-bold mb-1">Your Name</label>
                  <input id="requesterName"
                    type="text"
                    required
                    placeholder="e.g. Jordan K."
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="requesterPhone" className="block text-slate-700 font-bold mb-1">Phone (optional)</label>
                  <input id="requesterPhone"
                    type="tel"
                    placeholder="(415) 555-0100"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-purple-900 hover:bg-purple-800 text-amber-300 font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <FaCar className="w-4 h-4" />
                <span>{isSubmitting ? 'Requesting Shuttle...' : 'Request ride'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: CAPS Therapy & Safety Escort Services */}
        <div className="min-w-0 grid grid-cols-1 lg:grid-rows-2 gap-6 items-stretch">
          {/* CAPS Urgent Emotional / Accessibility Support */}
          <div className="min-w-0 w-full h-full flex flex-col gap-4 bg-white rounded-2xl shadow-sm border border-blue-200 border-t-4 border-t-blue-600 p-5 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <FaHeart className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Counseling support</h3>
                <p className="text-xs text-slate-500">
                  Free psychological services and neurodivergent accommodations for enrolled SFSU students.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2 text-slate-700">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <FaShieldHalved className="w-3.5 h-3.5 text-blue-700" />
                <span>24/7 Urgent Crisis Hotline: (415) 338-2208</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                If navigating campus barriers is causing overwhelming sensory stress, panic, or anxiety, CAPS crisis counselors are on-call 24 hours a day.
              </p>
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <a
                href="tel:4153382208"
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <FaPhone className="w-3 h-3" />
                <span>Call CAPS 24/7</span>
              </a>
              <a
                href="https://caps.sfsu.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl text-center"
              >
                Book Appointment
              </a>
            </div>
          </div>

          {/* UPD 24/7 Physical Safety Escort */}
          <div className="min-w-0 w-full h-full flex flex-col gap-4 bg-white rounded-2xl shadow-sm border border-amber-200 border-t-4 border-t-amber-500 p-5 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <FaShieldHalved className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Campus safety escort</h3>
                <p className="text-xs text-slate-500">
                  Uniformed community service specialists walk or roll with you anywhere on campus after dark.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">Direct Dispatch: (415) 338-5200</div>
              <div className="text-[11px] text-slate-600">
                Service is available 365 days a year from sunset to sunrise, and during heavy campus construction detours.
              </div>
            </div>

            <a
              href="tel:4153385200"
              className="mt-auto w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl text-center shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <FaPhone className="w-3 h-3" />
              <span>Call Safety Escort Dispatch (UPD)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
