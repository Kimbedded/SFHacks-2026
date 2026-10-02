import React, { useState } from 'react';
import { NeighborhoodId, NeighborhoodData } from './types';
import { SF_NEIGHBORHOODS } from './data/sfData';
import { Header } from './components/Header';
import { SFMap } from './components/SFMap';
import { NeighborhoodCards } from './components/NeighborhoodCards';
import { IncidentClassifier } from './components/IncidentClassifier';
import { ClimateSimulator } from './components/ClimateSimulator';
import { EdgeNodesMonitor } from './components/EdgeNodesMonitor';
import { HackathonInfoModal } from './components/HackathonInfoModal';
import { Activity, Radio, Trees, Sparkles, MapPin } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'classifier' | 'simulator' | 'iot'>('map');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<NeighborhoodId>('sfsu');
  const [metricMode, setMetricMode] = useState<'aqi' | 'temp' | 'canopy' | 'solar'>('aqi');
  const [isHackathonModalOpen, setIsHackathonModalOpen] = useState(false);
  const [neighborhoods] = useState<NeighborhoodData[]>(SF_NEIGHBORHOODS);

  const handleExportData = () => {
    const exportPayload = {
      project: 'SFPulse AI - SFHacks 2026',
      hackathon: 'SF Hacks 2026 x GDG AI Hackathon',
      venue: 'San Francisco State University (SFSU)',
      timestamp: new Date().toISOString(),
      neighborhoodsTelemetry: neighborhoods,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sfhacks-2026-sfpulse-telemetry.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenHackathonModal={() => setIsHackathonModalOpen(true)}
        onExportData={handleExportData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: SF Pulse Map & Neighborhood Grid */}
        {activeTab === 'map' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Interactive Vector Map */}
            <SFMap
              neighborhoods={neighborhoods}
              selectedId={selectedNeighborhoodId}
              onSelect={setSelectedNeighborhoodId}
              metricMode={metricMode}
              setMetricMode={setMetricMode}
            />

            {/* Neighborhood Cards Grid */}
            <NeighborhoodCards
              neighborhoods={neighborhoods}
              selectedId={selectedNeighborhoodId}
              onSelect={setSelectedNeighborhoodId}
            />
          </div>
        )}

        {/* Tab 2: AI Multi-Head Classifier */}
        {activeTab === 'classifier' && (
          <div className="animate-in fade-in duration-300">
            <IncidentClassifier />
          </div>
        )}

        {/* Tab 3: Climate Simulator */}
        {activeTab === 'simulator' && (
          <div className="animate-in fade-in duration-300">
            <ClimateSimulator />
          </div>
        )}

        {/* Tab 4: IoT Edge Sensor Fleet */}
        {activeTab === 'iot' && (
          <div className="animate-in fade-in duration-300">
            <EdgeNodesMonitor />
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">SFPulse AI</span>
            <span>•</span>
            <span>SF Hacks 2026 GDG AI Hackathon</span>
            <span>•</span>
            <span className="text-slate-400">San Francisco State University</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHackathonModalOpen(true)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Project Details
            </button>
            <span>•</span>
            <button
              onClick={handleExportData}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Download Telemetry
            </button>
          </div>
        </div>
      </footer>

      {/* Info Modal */}
      <HackathonInfoModal
        isOpen={isHackathonModalOpen}
        onClose={() => setIsHackathonModalOpen(false)}
      />
    </div>
  );
}

export default App;
