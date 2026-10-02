import React, { useState } from 'react';
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
} from 'lucide-react';

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
  const [filter, setFilter] = useState<'all' | 'down' | 'operational'>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'critical' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all elevators with building details
  const allElevators = buildings.flatMap((b) =>
    b.elevators.map((elev) => ({
      ...elev,
      buildingName: b.name,
      buildingCode: b.code,
      buildingId: b.id,
    }))
  );

  const filteredElevators = allElevators.filter((e) => {
    if (filter === 'down') return e.status === 'down' || e.status === 'maintenance' || e.status === 'intermittent';
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

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'critical') return r.urgency === 'critical';
    if (reportFilter === 'active') return r.status !== 'resolved';
    return true;
  });

  const brokenCount = allElevators.filter((e) => e.status !== 'operational').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-xl border border-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-amber-400 text-purple-950 font-bold text-xs">
              LIVE TELEMETRY
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Campus Vertical Circulation & Facilities Work Orders
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-purple-200">
            Real-time status of all {allElevators.length} SFSU passenger lifts, accessible ramps, and open facilities repairs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] text-purple-200 uppercase font-semibold">Offline Elevators</div>
            <div className="text-lg font-black text-rose-400">{brokenCount} / {allElevators.length}</div>
          </div>

          <button
            onClick={onRequestRide}
            className="px-3.5 py-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <span>Cart Shuttle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section 1: Elevators Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
              🛗
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">SFSU Elevator Health Matrix</h3>
              <p className="text-xs text-slate-500">
                Click "Simulate Outage" to toggle elevator state and test dynamic campus rerouting.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search building..."
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

        {/* Elevators Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredElevators.map((elev) => {
            const isDown = elev.status === 'down';
            const isIntermittent = elev.status === 'intermittent';

            return (
              <div
                key={elev.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDown
                    ? 'border-rose-300 bg-rose-50/40'
                    : isIntermittent
                    ? 'border-amber-300 bg-amber-50/40'
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
                        : isIntermittent
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
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

                {/* Simulation Control */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Demo Control:</span>
                  <button
                    onClick={() => onToggleElevator(elev.id, elev.status)}
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

      {/* Section 2: Active Facilities Work Orders & Community Reports */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Official SFSU Facilities Services Work Order Queue
              </h3>
              <p className="text-xs text-slate-500">
                Automated triage feed grouped by urgency and verified by student community upvotes.
              </p>
            </div>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setReportFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                reportFilter === 'all' ? 'bg-purple-700 text-white' : 'text-slate-600'
              }`}
            >
              All Reports ({reports.length})
            </button>
            <button
              onClick={() => setReportFilter('critical')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                reportFilter === 'critical' ? 'bg-rose-600 text-white' : 'text-slate-600'
              }`}
            >
              Critical Urgency
            </button>
          </div>
        </div>

        {/* Reports Feed */}
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-white transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        report.urgency === 'critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : report.urgency === 'high'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      {report.urgency} Priority
                    </span>

                    <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {report.facilitiesWorkOrderId}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-500">
                      Status: <span className="text-purple-950 uppercase font-bold">{report.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{report.title}</h4>
                  <p className="text-xs text-slate-600">{report.description}</p>
                </div>

                {/* Upvote / Confirm Button */}
                <button
                  onClick={() => onUpvoteReport(report.id)}
                  className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-slate-300 hover:border-purple-400 rounded-lg text-xs font-bold text-purple-900 flex items-center gap-1.5 transition-transform active:scale-95 shrink-0 shadow-2xs"
                  title="Confirm this hazard to escalate Facilities priority"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-purple-600" />
                  <span>Confirm Hazard ({report.upvotes})</span>
                </button>
              </div>

              {/* Photo Evidence if present */}
              {report.photoUrl && (
                <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200">
                  <img
                    src={report.photoUrl}
                    alt="Hazard evidence"
                    className="w-16 h-16 rounded-md object-cover border"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">Photo Evidence Attached</div>
                    <div className="text-[11px] text-slate-500">
                      Location: <span className="font-semibold text-slate-700">{report.locationName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Detour Advice */}
              {report.aiAnalysis && (
                <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200 text-xs text-purple-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>DPRC Recommended Bypass Route:</span>
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    {report.aiAnalysis.suggestedDetour}
                  </p>
                </div>
              )}

              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Reported by {report.reporterName || 'Anonymous SFSU Student'} • {report.reportedAt}</span>
                <span>Last status sync: {report.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
