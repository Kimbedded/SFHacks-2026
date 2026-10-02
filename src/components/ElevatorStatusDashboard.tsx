import React, { useState, useEffect } from 'react';
import { CampusBuilding, AccessibilityReport } from '../types';
import {
  FaElevator,
  FaWheelchair,
  FaSquareParking,
  FaWrench,
  FaFire,
  FaTowerBroadcast,
  FaArrowRight,
  FaMagnifyingGlass,
  FaPlus,
  FaThumbsUp,
  FaTriangleExclamation,
  FaBuilding,
  FaClock,
} from 'react-icons/fa6';
import {
  subscribeToElevators,
  subscribeToFacilities,
  updateElevatorStatus,
  createFacilityTicket,
  upvoteFacilityTicket,
  FirebaseElevator,
  FirebaseFacilityTicket,
  seedElevatorsIfEmpty,
  seedFacilitiesIfEmpty,
} from '../firebase/elevatorFacilityService';
import { getElevatorPhoto, getFacilityPhoto } from '../data/facilityPhotos';

interface ElevatorStatusDashboardProps {
  buildings: CampusBuilding[];
  reports: AccessibilityReport[];
  onToggleElevator: (elevatorId: string, currentStatus: string) => void;
  onUpvoteReport: (reportId: string) => void;
  onRequestRide: () => void;
}

export function ElevatorStatusDashboard({
  buildings,
  reports,
  onToggleElevator,
  onUpvoteReport,
  onRequestRide,
}: ElevatorStatusDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'elevators' | 'facilities'>('elevators');
  const [filter, setFilter] = useState<'all' | 'down' | 'operational'>('down');
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time Firebase state
  const [firebaseElevators, setFirebaseElevators] = useState<FirebaseElevator[]>([]);
  const [facilitiesTickets, setFacilitiesTickets] = useState<FirebaseFacilityTicket[]>([]);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(true);
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New ticket form state
  const [newTitle, setNewTitle] = useState('');
  const [newBuildingId, setNewBuildingId] = useState(buildings[0]?.id || 'ccsc');
  const [newType, setNewType] = useState<FirebaseFacilityTicket['facilityType']>('power_door');
  const [newPriority, setNewPriority] = useState<FirebaseFacilityTicket['priority']>('high');
  const [newDescription, setNewDescription] = useState('');

  // Subscribe to Firestore collections
  useEffect(() => {
    seedElevatorsIfEmpty().catch(console.warn);
    seedFacilitiesIfEmpty().catch(console.warn);

    const unsubElevators = subscribeToElevators(
      (elevs) => {
        setFirebaseElevators(elevs);
        setIsFirebaseSynced(true);
      },
      () => setIsFirebaseSynced(false)
    );

    const unsubFacilities = subscribeToFacilities(
      (tickets) => {
        setFacilitiesTickets(tickets);
      },
      () => setIsFirebaseSynced(false)
    );

    return () => {
      unsubElevators();
      unsubFacilities();
    };
  }, []);

  // Merge building metadata with Firestore live status if available
  const allElevators = buildings.flatMap((b) =>
    b.elevators.map((elev) => {
      const fbMatch = firebaseElevators.find((fb) => fb.id === elev.id);
      const isOperational = fbMatch ? fbMatch.isOperational : elev.status === 'operational';

      return {
        ...elev,
        status: isOperational ? 'operational' : 'down',
        statusReason: fbMatch?.statusReason || elev.statusReason,
        lastChecked: fbMatch?.lastChecked ? new Date(fbMatch.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : elev.lastChecked,
        buildingName: b.name,
        buildingCode: b.code,
        buildingId: b.id,
      };
    })
  );

  const query = searchQuery.trim().toLowerCase();
  const isActiveTicket = (ticket: FirebaseFacilityTicket) =>
    ticket.status !== 'resolved' && ticket.status !== 'operational';
  const priorityRank = { urgent_accessibility: 0, high: 1, medium: 2, low: 3 };
  const filteredElevators = allElevators.filter((e) =>
    (filter === 'all' || (filter === 'down' ? e.status === 'down' : e.status === 'operational')) &&
    [e.name, e.buildingName, e.buildingCode].some((value) => value.toLowerCase().includes(query))
  ).sort((a, b) => Number(a.status === 'operational') - Number(b.status === 'operational') || a.buildingName.localeCompare(b.buildingName));
  const filteredFacilities = facilitiesTickets.filter((ticket) =>
    (facilityFilter === 'all' || (facilityFilter === 'active' ? isActiveTicket(ticket) : !isActiveTicket(ticket))) &&
    [ticket.title, ticket.buildingName, ticket.facilityType.replace(/_/g, ' ')].some((value) => value.toLowerCase().includes(query))
  ).sort((a, b) => Number(!isActiveTicket(a)) - Number(!isActiveTicket(b)) || priorityRank[a.priority] - priorityRank[b.priority] || (b.upvotes || 0) - (a.upvotes || 0));
  const facilityCategories: { type: FirebaseFacilityTicket['facilityType']; label: string }[] = [
    { type: 'power_door', label: 'Automatic doors' },
    { type: 'elevator', label: 'Elevators' },
    { type: 'lift', label: 'Wheelchair lifts' },
    { type: 'ramp', label: 'Ramps & handrails' },
    { type: 'accessible_restroom', label: 'Accessible restrooms' },
    { type: 'braille_beacon', label: 'Wayfinding & tactile aids' },
  ];
  const facilityGroups = facilityCategories.map((category) => ({
    ...category, tickets: filteredFacilities.filter((ticket) => ticket.facilityType === category.type),
  })).filter((group) => group.tickets.length > 0).sort((a, b) =>
    Number(!isActiveTicket(a.tickets[0])) - Number(!isActiveTicket(b.tickets[0])) ||
    priorityRank[a.tickets[0].priority] - priorityRank[b.tickets[0].priority]
  );
  const brokenCount = allElevators.filter((e) => e.status !== 'operational').length;
  const activeRepairCount = facilitiesTickets.filter(isActiveTicket).length;
  const activeReports = reports.filter((report) => report.status !== 'resolved').sort((a, b) =>
    ({ critical: 0, high: 1, medium: 2, low: 3 }[a.urgency] - { critical: 0, high: 1, medium: 2, low: 3 }[b.urgency]) || b.upvotes - a.upvotes
  );

  const handleToggleFbElevator = async (elevatorId: string, currentStatus: string) => {
    const isNowOperational = currentStatus !== 'operational';
    try {
      await updateElevatorStatus(
        elevatorId,
        isNowOperational,
        isNowOperational ? 'Marked operational via telemetry matrix' : 'Reported out of service (sensor trigger)'
      );
    } catch (err) {
      console.warn('Fallback to local prop handler:', err);
    }
    onToggleElevator(elevatorId, currentStatus);
  };

  const handleCreateFacilityTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const targetBldg = buildings.find((b) => b.id === newBuildingId);

    try {
      await createFacilityTicket({
        facilityType: newType,
        buildingId: newBuildingId,
        buildingName: targetBldg?.name || 'SFSU Campus',
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: 'work_order_dispatched',
        priority: newPriority,
      });

      setNewTitle('');
      setNewDescription('');
      setIsCreatingTicket(false);
    } catch (err) {
      console.error('Error logging facility ticket to Firestore:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvoteFacility = async (ticketId: string, upvotes: number = 0) => {
    try {
      await upvoteFacilityTicket(ticketId, upvotes);
    } catch (err) {
      console.error('Error upvoting facility ticket:', err);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-xl border border-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Facilities status
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-purple-200">
            {brokenCount} elevator outages · {activeRepairCount} active repairs. Access issues appear first.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] text-purple-200 uppercase font-semibold">Elevator Outages</div>
            <div className="text-lg font-black text-rose-400">{brokenCount} / {allElevators.length}</div>
          </div>

          <button
            onClick={onRequestRide}
            className="px-3.5 py-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <span>Gator Shuttle</span>
            <FaArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-t-2xl p-2 gap-2 shadow-sm">
        <button
          onClick={() => setActiveSubTab('elevators')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeSubTab === 'elevators'
              ? 'bg-purple-900 text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FaElevator className="w-4 h-4 text-amber-300" />
          <span>Elevators · {brokenCount} outages</span>
        </button>

        <button
          onClick={() => setActiveSubTab('facilities')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeSubTab === 'facilities'
              ? 'bg-purple-900 text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FaWrench className="w-3.5 h-3.5 text-amber-400" />
          <span>Other facilities · {activeRepairCount} repairs</span>
        </button>
      </div>

      {/* TAB 1: ELEVATORS MATRIX */}
      {activeSubTab === 'elevators' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">{filter === 'down' ? 'Elevator outages' : filter === 'operational' ? 'Working elevators' : 'All elevators'}</h3>
              </div>
              <p className="text-xs text-slate-500">
                Check affected buildings and alternative routes before you travel.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search elevators"
                  placeholder="Search building or elevator"
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filter === 'all' ? 'bg-purple-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('down')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filter === 'down' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Outages ({brokenCount})
                </button>
                <button
                  onClick={() => setFilter('operational')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filter === 'operational' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Operational
                </button>
              </div>
            </div>
          </div>

          {filteredElevators.length === 0 && <p className="p-6 text-center text-sm text-slate-500">{searchQuery ? 'No elevators match your search.' : filter === 'down' ? 'No elevator outages reported.' : 'No elevators in this category.'}</p>}
          {/* Elevators Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredElevators.map((elev, elevIdx) => {
              const isDown = elev.status === 'down';

              return (
                <div
                  key={elev.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isDown
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="h-28 bg-gradient-to-br from-purple-900 to-indigo-950 flex items-center justify-center">
                    <img
                      src={getElevatorPhoto(elevIdx)}
                      alt={`${elev.name} elevator`}
                      loading="lazy"
                      className={`w-full h-full object-cover object-center ${isDown ? 'grayscale-[40%]' : ''}`}
                    />
                  </div>
                  <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                        {elev.buildingCode}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{elev.name}</h4>
                      <p className="text-xs text-slate-500">{elev.buildingName}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                        isDown
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isDown ? 'Out of service' : 'Operational'}
                    </span>
                  </div>

                  {isDown && elev.statusReason && <p className="mt-3 text-xs font-medium text-rose-800">{elev.statusReason}</p>}
                  <div className="my-2.5 pt-2 border-t border-slate-100 text-xs space-y-1">
                    <div className="text-slate-600">
                      <span className="font-semibold text-slate-700">Floors: </span>
                      {elev.floorsServed}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700">Checked: </span>
                      {elev.lastChecked}
                    </div>

                    {isDown && elev.alternativePath && (
                      <div className="p-2 rounded bg-slate-100/70 border border-slate-200 text-[11px] text-slate-700 mt-2">
                        <span className="font-bold text-purple-900">Bypass Route: </span>
                        {elev.alternativePath}
                      </div>
                    )}
                  </div>

                  {/* Firebase Mutation Control */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Demo status control</span>
                    <button
                      onClick={() => handleToggleFbElevator(elev.id, elev.status)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                        isDown
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                      }`}
                    >
                      {isDown ? 'Mark Operational' : 'Simulate Outage'}
                    </button>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FACILITIES WORK ORDERS PIPELINE */}
      {activeSubTab === 'facilities' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Repairs by category
                </h3>

              </div>
              <p className="text-xs text-slate-500">
                Access-blocking issues first, followed by high, medium, and low priority repairs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsCreatingTicket(!isCreatingTicket)}
                className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <FaPlus className="w-3.5 h-3.5" />
                <span>Report an issue</span>
              </button>

              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setFacilityFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    facilityFilter === 'all' ? 'bg-purple-700 text-white' : 'text-slate-600'
                  }`}
                >
                  All ({facilitiesTickets.length})
                </button>
                <button
                  onClick={() => setFacilityFilter('active')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    facilityFilter === 'active' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Active ({activeRepairCount})
                </button>
                <button onClick={() => setFacilityFilter('resolved')} aria-pressed={facilityFilter === 'resolved'} className={`px-2.5 py-1 rounded-md ${facilityFilter === 'resolved' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>Working / resolved</button>
              </div>
            </div>
          </div>
          <input aria-label="Search facilities" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search building or facility" className="w-full sm:max-w-sm px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50" />

          {/* New Ticket Form Modal/Drawer */}
          {isCreatingTicket && (
            <form
              onSubmit={handleCreateFacilityTicket}
              className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                  <FaWrench className="w-4 h-4 text-purple-700" />
                  Report a facility issue
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingTicket(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Facility Asset Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="power_door">Power Automated Door / Push Plate</option>
                    <option value="elevator">Elevator / Wheelchair Lift</option>
                    <option value="ramp">ADA Ramp / Handrail</option>
                    <option value="accessible_restroom">Accessible Restroom</option>
                    <option value="braille_beacon">Auditory / Tactile Wayfinding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Campus Building</label>
                  <select
                    value={newBuildingId}
                    onChange={(e) => setNewBuildingId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="urgent_accessibility">Urgent Accessibility (Blocks Access)</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West entrance automatic door button unresponsive"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide location details (floor, wing, specific door) to assist technicians..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs rounded-lg shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit issue'}
                </button>
              </div>
            </form>
          )}

          {/* Work Orders List */}
          <div className="space-y-3">
            {filteredFacilities.length === 0 && <p className="p-6 text-center text-sm text-slate-500">{searchQuery ? 'No facilities match your search.' : facilityFilter === 'active' ? 'No active facility repairs.' : 'No facilities in this category.'}</p>}
            {facilityGroups.map((group) => (
              <section key={group.type} className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700">{group.label} <span className="text-slate-400">({group.tickets.length})</span></h4>
                {group.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-xl border border-slate-200 bg-white hover:border-purple-300 shadow-sm transition-all flex overflow-hidden"
              >
                <div className="w-24 sm:w-36 shrink-0 self-stretch bg-gradient-to-br from-purple-900 to-indigo-950 flex items-center justify-center">
                  {getFacilityPhoto(ticket.facilityType) ? (
                    <img
                      src={getFacilityPhoto(ticket.facilityType)}
                      alt={ticket.facilityType.replace(/_/g, ' ')}
                      loading="lazy"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <FaBuilding className="w-8 h-8 text-purple-300/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono font-bold text-xs">
                      {ticket.workOrderNumber || 'SFSU-WO-PENDING'}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900">{ticket.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ticket.priority === 'urgent_accessibility'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : ticket.priority === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ticket.priority === 'urgent_accessibility' ? 'Blocks access' : `${ticket.priority} priority`}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : ticket.status === 'parts_on_order'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-purple-100 text-purple-800 border border-purple-300'
                      }`}
                    >
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2">{ticket.description}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-700">📍 {ticket.buildingName}</span>
                    <span>•</span>
                    <span className="capitalize">Category: {ticket.facilityType.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Logged: {new Date(ticket.reportedAt).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => handleUpvoteFacility(ticket.id, ticket.upvotes || 0)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-900 font-semibold text-slate-700 transition-colors"
                  >
                    <FaThumbsUp className="w-3.5 h-3.5 text-purple-700" />
                    <span>Confirm / Upvote ({ticket.upvotes || 0})</span>
                  </button>
                </div>
                </div>
              </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Community Reports from Students */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaTriangleExclamation className="w-4 h-4 text-amber-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Student-reported barriers ({activeReports.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">Urgency, then confirmations</span>
        </div>

        <div className="space-y-3">
          {activeReports.map((rep) => (
            <div
              key={rep.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{rep.locationName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {rep.barrierType}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{rep.description}</p>
              </div>

              <button
                onClick={() => onUpvoteReport(rep.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:border-purple-400 hover:text-purple-900 shadow-sm shrink-0 transition-colors"
              >
                <FaThumbsUp className="w-3.5 h-3.5 text-purple-700" />
                <span>Verify ({rep.upvotes})</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
