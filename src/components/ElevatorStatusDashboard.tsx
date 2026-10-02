import React, { useState, useEffect } from 'react';
import { CampusBuilding, AccessibilityReport } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  Building,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  Layers,
  Wrench,
  Clock,
  ArrowRight,
  Flame,
  PlusCircle,
  ShieldCheck,
  Radio,
  FileText,
} from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'down' | 'operational'>('all');
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'active' | 'resolved'>('all');
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

  const filteredElevators = allElevators.filter((e) => {
    if (filter === 'down') return e.status === 'down';
    if (filter === 'operational') return e.status === 'operational';
    if (searchQuery) {
      return (
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.buildingCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const filteredFacilities = facilitiesTickets.filter((f) => {
    if (facilityFilter === 'active') return f.status !== 'resolved';
    if (facilityFilter === 'resolved') return f.status === 'resolved';
    if (searchQuery) {
      return (
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.facilityType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const brokenCount = allElevators.filter((e) => e.status !== 'operational').length;

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
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-xl border border-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-amber-400 text-purple-950 font-bold text-xs flex items-center gap-1">
              <Radio className="w-3 h-3 text-purple-950 animate-pulse" />
              LIVE TELEMETRY
            </span>
            <span className="p-1 rounded-md bg-purple-800/80 text-amber-300 font-bold text-xs flex items-center gap-1 border border-purple-600">
              <Flame className="w-3 h-3 text-amber-400" />
              FIREBASE FIRESTORE SYNCED
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Campus Facilities & Vertical Mobility Pipeline
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-purple-200">
            Real-time status of all {allElevators.length} SFSU elevators, power doors, ADA ramps, and automated Facilities work orders.
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
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl p-2 gap-2 shadow-sm">
        <button
          onClick={() => setActiveSubTab('elevators')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeSubTab === 'elevators'
              ? 'bg-purple-900 text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-base">🛗</span>
          <span>SFSU Elevator Fleet ({allElevators.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('facilities')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeSubTab === 'facilities'
              ? 'bg-purple-900 text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Facilities Work Orders ({facilitiesTickets.length})</span>
        </button>
      </div>

      {/* TAB 1: ELEVATORS MATRIX */}
      {activeSubTab === 'elevators' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">SFSU Elevator Health Matrix</h3>
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Firestore Realtime
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Click "Simulate Outage" to toggle an elevator; updates propagate to all connected student devices via Firebase.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search elevator..."
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

          {/* Elevators Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredElevators.map((elev) => {
              const isDown = elev.status === 'down';

              return (
                <div
                  key={elev.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDown
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200 bg-white hover:border-purple-300'
                  }`}
                >
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
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {elev.status}
                    </span>
                  </div>

                  <div className="my-2.5 pt-2 border-t border-slate-100 text-xs space-y-1">
                    <div className="text-slate-600">
                      <span className="font-semibold text-slate-700">Floors: </span>
                      {elev.floorsServed}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700">Checked: </span>
                      {elev.lastChecked}
                    </div>

                    {elev.alternativePath && (
                      <div className="p-2 rounded bg-slate-100/70 border border-slate-200 text-[11px] text-slate-700 mt-2">
                        <span className="font-bold text-purple-900">Bypass Route: </span>
                        {elev.alternativePath}
                      </div>
                    )}
                  </div>

                  {/* Firebase Mutation Control */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">Telemetry:</span>
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
                  SFSU Facilities Services Work Order Feed
                </h3>
                <span className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">
                  Scalable Firestore Subcollections
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track physical repair statuses for power automated push-doors, ramps, and ADA tactile assets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreatingTicket(!isCreatingTicket)}
                className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Log Facility Work Order</span>
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
                  Active Repairs
                </button>
              </div>
            </div>
          </div>

          {/* New Ticket Form Modal/Drawer */}
          {isCreatingTicket && (
            <form
              onSubmit={handleCreateFacilityTicket}
              className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-700" />
                  Dispatch SFSU Facilities Work Order to Firestore
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
                  {isSubmitting ? 'Submitting to Firestore...' : 'Create Facilities Work Order'}
                </button>
              </div>
            </form>
          )}

          {/* Work Orders List */}
          <div className="space-y-3">
            {filteredFacilities.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-300 shadow-sm transition-all"
              >
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
                      {ticket.priority.replace('_', ' ')}
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
                  <div className="flex items-center gap-3">
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
                    <ThumbsUp className="w-3.5 h-3.5 text-purple-700" />
                    <span>Confirm / Upvote ({ticket.upvotes || 0})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Reports from Students */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Community Verified Campus Barriers ({reports.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">Auto-prioritized by student upvotes</span>
        </div>

        <div className="space-y-3">
          {reports.map((rep) => (
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
                <ThumbsUp className="w-3.5 h-3.5 text-purple-700" />
                <span>Verify ({rep.upvotes})</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
