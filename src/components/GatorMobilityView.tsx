import React, { useState } from 'react';
import { CampusBuilding, AssistanceRequest } from '../types';
import {
  Car,
  Heart,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  Shield,
  MessageSquare,
  AlertCircle,
  Sparkles,
  ArrowRight,
  LifeBuoy,
} from 'lucide-react';

interface GatorMobilityViewProps {
  buildings: CampusBuilding[];
  onOpenHotline: () => void;
}

export function GatorMobilityView({ buildings, onOpenHotline }: GatorMobilityViewProps) {
  const [pickupLocation, setPickupLocation] = useState('19th Ave & Holloway Transit Hub');
  const [dropoffLocation, setDropoffLocation] = useState('Cesar Chavez Student Center Plaza');
  const [mobilityNeeds, setMobilityNeeds] = useState('Wheelchair Accessible Ramp Cart');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [notes, setNotes] = useState('');

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
        notes,
      };

      setActiveRequest(simulatedRequest);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-6 rounded-2xl shadow-xl border border-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-400 text-purple-950 font-bold text-xs">
              FREE ON-CAMPUS SERVICE
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Gator Mobility Cart Shuttle & CAPS Mental Health
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-purple-200">
            If an elevator is broken or a ramp is too steep, Gator Mobility picks you up anywhere on campus and drives you directly to your class.
          </p>
        </div>

        <button
          onClick={onOpenHotline}
          className="px-4 py-2.5 bg-purple-700/80 hover:bg-purple-600 text-white font-bold text-xs rounded-xl border border-purple-400/40 shadow-sm transition-transform active:scale-95 shrink-0 flex items-center gap-2"
        >
          <Phone className="w-4 h-4 text-amber-300" />
          <span>Call DPRC Hotline</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Gator Mobility Shuttle Dispatch */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Request Gator Cart Pickup</h3>
              <p className="text-xs text-slate-500">
                Direct electric golf cart ride across SFSU campus for students with temporary or permanent mobility needs.
              </p>
            </div>
          </div>

          {activeRequest ? (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-50 to-white border-2 border-purple-300 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-700 text-white uppercase tracking-wider">
                  Vehicle Dispatched
                </span>
                <span className="text-xs font-mono font-bold text-purple-900">
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

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                💡 Driver is on their way. Look for the purple & gold electric cart with the wheelchair accessibility emblem.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="tel:4153381441"
                  className="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl text-center shadow-sm"
                >
                  Call Driver Directly
                </a>
                <button
                  onClick={() => setActiveRequest(null)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  New Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequestRide} className="space-y-4">
              {/* Pickup Location */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Pickup Location on Campus</label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g. 19th & Holloway Muni stop, Library North Ramp, Lot 20 Bridge"
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  required
                />
              </div>

              {/* Dropoff Location */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Campus Destination</label>
                <select
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobility Support Needed */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Mobility Equipment / Support</label>
                <select
                  value={mobilityNeeds}
                  onChange={(e) => setMobilityNeeds(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value="Wheelchair Accessible Ramp Cart">Wheelchair Accessible (Flip-down ramp cart)</option>
                  <option value="Standard Cart (Injured leg / Crutches)">Standard Cart (Injured leg / Post-surgery / Crutches)</option>
                  <option value="Guide Dog & Human Escort">Guide Dog & Human Sighted Guide</option>
                  <option value="Exhaustion / Medical Fatigue">Exhaustion / Medical Fatigue / Heat Sensitivity</option>
                </select>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Your Name</label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="e.g. Jordan"
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone for SMS ETA</label>
                  <input
                    type="tel"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="(415) 555-0100"
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Car className="w-4 h-4" />
                <span>{isSubmitting ? 'Dispatching Cart...' : 'Dispatch Gator Mobility Cart'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: CAPS Therapy & Mental Health Direct Access */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                CAPS Therapy & Crisis Support
              </h3>
              <p className="text-xs text-slate-500">
                Direct, confidential access to SFSU Counseling & Psychological Services. No judgment, immediate care.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Primary Action Card: 24/7 Crisis Hotline */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  CAPS 24/7 Crisis Counseling
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900 uppercase">
                  Available 24/7
                </span>
              </div>
              <p className="text-xs text-blue-900/90 leading-relaxed">
                Connect with a licensed therapist immediately for crisis intervention, anxiety, panic, or overwhelming campus stress.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-950">(415) 338-2208</span>
                <a
                  href="tel:4153382208"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-transform active:scale-95"
                >
                  Call Counselor Now
                </a>
              </div>
            </div>

            {/* Crisis Text Line */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-purple-700" />
                  Crisis Text Line (Free & Confidential)
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">SMS Support</span>
              </div>
              <p className="text-xs text-slate-600">
                If speaking out loud is difficult or overstimulating, text with a trained crisis counselor anytime.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-800">Text COURAGE to 741741</span>
                <a
                  href="sms:741741?body=COURAGE"
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  Start Texting
                </a>
              </div>
            </div>

            {/* Walk-in Location Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-700" />
                <span>CAPS Walk-In Clinic Location:</span>
              </div>
              <p>
                Student Services Building (SSB), Room 205. Monday – Friday, 8:00 AM – 5:00 PM.
              </p>
              <p className="text-[11px] text-purple-900 font-semibold pt-1">
                ♿ Fully wheelchair accessible via SSB main elevators.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
