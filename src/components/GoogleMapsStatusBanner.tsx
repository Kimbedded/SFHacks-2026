import React, { useState, useEffect } from 'react';
import {
  GoogleMapsErrorInfo,
  getLastGmpError,
  isApiKeyConfigured,
  GOOGLE_MAPS_ERRORS,
} from '../utils/googleMapsConfig';
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  HelpCircle,
  CheckCircle2,
  Key,
} from 'lucide-react';

export function GoogleMapsStatusBanner() {
  const [errorInfo, setErrorInfo] = useState<GoogleMapsErrorInfo | null>(getLastGmpError());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const hasConfiguredKey = isApiKeyConfigured();

  useEffect(() => {
    const handleGmpError = (event: Event) => {
      const customEvent = event as CustomEvent<GoogleMapsErrorInfo>;
      if (customEvent.detail) {
        setErrorInfo(customEvent.detail);
        setIsDismissed(false);
      }
    };

    window.addEventListener('gmp-error', handleGmpError);
    return () => {
      window.removeEventListener('gmp-error', handleGmpError);
    };
  }, []);

  if (isDismissed) return null;

  // Case 1: Runtime Google Maps Error (ApiProjectMapError, Billing, Referrer, etc.)
  if (errorInfo) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-950 backdrop-blur-sm px-4 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-start md:items-center gap-2.5">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-800 shrink-0 mt-0.5 md:mt-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs md:text-sm">
              <span className="font-extrabold text-amber-900 mr-2">
                Google Maps Notice: {errorInfo.title}
              </span>
              <span className="text-amber-800 hidden sm:inline">
                {errorInfo.summary}
              </span>
              <span className="ml-2 font-medium text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full text-[11px]">
                Offline Radar View Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0 self-end md:self-auto">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 font-bold text-amber-900 hover:text-amber-950 underline px-2 py-1 rounded hover:bg-amber-500/10 transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Hide Fix Steps</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Troubleshooting Guide</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-amber-800 hover:text-amber-950 rounded hover:bg-amber-500/10 transition-colors"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Resolution Panel */}
        {isExpanded && (
          <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-amber-500/20 text-xs text-amber-900 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
            <div className="md:col-span-2 space-y-2">
              <p className="font-semibold text-slate-800">
                {errorInfo.details}
              </p>
              <div className="space-y-1.5 bg-white/70 rounded-xl p-3 border border-amber-300/40">
                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                  How to resolve this issue:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  {errorInfo.steps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="bg-purple-900/10 rounded-xl p-3 border border-purple-300/30 flex flex-col justify-between gap-2">
              <div>
                <span className="font-bold text-purple-950 block text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-purple-700" />
                  Offline Campus Barrier Radar
                </span>
                <p className="text-[11px] text-slate-700 leading-normal">
                  No features are broken! The app is displaying the vector Campus Barrier Radar with SF State buildings, elevators, power doors, and student barrier reports.
                </p>
              </div>

              {errorInfo.docsLink && (
                <a
                  href={errorInfo.docsLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-center justify-center shadow-sm"
                >
                  <span>{errorInfo.docsLink.label}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Case 2: No API Key Configured (First load or demo mode)
  if (!hasConfiguredKey) {
    return (
      <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-950 px-4 py-2 text-xs transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-purple-900 text-amber-300 font-bold text-[10px] tracking-wide shrink-0">
              Demo / Offline Mode
            </span>
            <span className="text-slate-700 text-xs">
              Using sample SF State campus barrier data. Live Google Maps tiles can be activated by adding a{' '}
              <code className="px-1 py-0.5 bg-indigo-100 rounded text-purple-900 font-mono font-bold">
                GOOGLE_MAPS_API_KEY
              </code>
              .
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-indigo-700 hover:text-indigo-900 font-bold underline transition-colors flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              <span>{isExpanded ? 'Hide Setup' : 'API Key Setup Guide'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-indigo-100"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Setup Drawer */}
        {isExpanded && (
          <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-indigo-200 text-slate-700 space-y-2 animate-fadeIn">
            <p className="text-xs">
              To connect real Google Maps tiles without committing secrets to source code:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                <span className="font-bold text-purple-900 block mb-1">1. Google Cloud Project</span>
                <span>Create a project, enable billing, and enable <strong>Maps JavaScript API</strong> (and Routes API for directions).</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                <span className="font-bold text-purple-900 block mb-1">2. Add Secret in AI Studio</span>
                <span>Open AI Studio <strong>Settings &gt; Secrets</strong>, create a secret named <code className="font-mono bg-slate-100 px-1">GOOGLE_MAPS_API_KEY</code>, and paste your key.</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                <span className="font-bold text-purple-900 block mb-1">3. Refresh Application</span>
                <span>The app will automatically detect your key and render full interactive Google Maps satellite and road layers.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
