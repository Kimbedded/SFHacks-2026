import React, { useState } from 'react';
import { TransitAlert } from '../types';
import { Train, Bus, AlertCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface TransitAlertsBannerProps {
  alerts: TransitAlert[];
}

export function TransitAlertsBanner({ alerts }: TransitAlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const activeIssueAlerts = alerts.filter((a) => a.status !== 'accessible');

  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-b border-indigo-800/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="flex items-center space-x-1 shrink-0 px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold">
            <Train className="w-3.5 h-3.5" />
            <span>SFSU Transit & BART</span>
          </div>

          <div className="truncate text-slate-300">
            <span className="font-semibold text-amber-300 mr-1.5">
              {activeIssueAlerts.length > 0 ? 'Transit Advisory:' : 'Live Status:'}
            </span>
            <span>{alerts[0].headline} — {alerts[0].details}</span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 ml-2 px-2 py-1 rounded hover:bg-white/10 text-indigo-200 hover:text-white flex items-center gap-1 font-medium transition-colors"
        >
          <span>{alerts.length} Lines</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-indigo-900/80 bg-slate-950/90 px-4 py-3 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between text-xs space-y-2"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {alert.service.includes('BART') ? (
                      <Bus className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Train className="w-3.5 h-3.5 text-red-400" />
                    )}
                    {alert.service}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.status === 'accessible'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {alert.status === 'accessible' ? 'ADA Ready' : 'Notice'}
                  </span>
                </div>
                <div className="font-semibold text-slate-200 text-[11px]">{alert.stopName}</div>
                <p className="text-slate-400 text-[11px] mt-1">{alert.details}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-amber-200/90 bg-amber-950/20 p-1.5 rounded">
                <span className="font-semibold">Accessibility Guidance: </span>
                {alert.alternativeGuidance}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
