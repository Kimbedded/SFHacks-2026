import React, { useState } from 'react';
import { IncidentClassification } from '../types';
import { SAMPLE_INCIDENTS } from '../data/sfData';
import {
  Sparkles,
  Upload,
  Camera,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  FileText,
  Filter,
  Layers,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface IncidentClassifierProps {
  onIncidentCreated?: (incident: IncidentClassification) => void;
}

export const IncidentClassifier: React.FC<IncidentClassifierProps> = () => {
  const [incidents, setIncidents] = useState<IncidentClassification[]>(SAMPLE_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentClassification>(SAMPLE_INCIDENTS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customLocation, setCustomLocation] = useState('SFSU Science Annex, 1600 Holloway Ave');
  const [customCategory, setCustomCategory] = useState<IncidentClassification['head1_category']>(
    'Urban Heat & Canopy'
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunInference = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);

      // Deterministic / realistic multi-head classification output based on category
      let urgencyScore = 7.8;
      let slaHours = 8;
      let agency: IncidentClassification['head4_routing']['targetAgency'] = 'SF Public Works';
      let carbonImpact = 85;
      let action = 'Field technician inspection scheduled';

      if (customCategory === 'Infrastructure & Drainage') {
        urgencyScore = 8.9;
        slaHours = 4;
        agency = 'SFPUC Water';
        carbonImpact = 65;
        action = 'Automated drainage clearing dispatched to street grid';
      } else if (customCategory === 'Urban Heat & Canopy') {
        urgencyScore = 6.4;
        slaHours = 24;
        agency = 'SF Public Works';
        carbonImpact = 210;
        action = 'Added to SFPulse High-Priority Urban Canopy Planting Queue';
      } else if (customCategory === 'Transit & Pedestrian') {
        urgencyScore = 8.5;
        slaHours = 2;
        agency = 'SFMTA (Transit)';
        carbonImpact = 55;
        action = 'Real-time Muni corridor notification broadcast to transit ops';
      } else if (customCategory === 'Waste & Composting') {
        urgencyScore = 5.2;
        slaHours = 12;
        agency = 'Recology Clean Team';
        carbonImpact = 40;
        action = 'Recology compost bin service route updated';
      }

      const newIncident: IncidentClassification = {
        id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: customTitle.trim() || 'Civic Environmental Anomaly Report',
        timestamp: 'Just now',
        location: customLocation.trim() || 'SFSU Campus / SF Metro',
        imageUrl: previewImage || undefined,
        imageThumbnail: previewImage ? '📸' : '🌿',
        head1_category: customCategory,
        head2_urgency: {
          score: urgencyScore,
          slaHours,
          level: urgencyScore > 8 ? 'Critical' : urgencyScore > 6 ? 'High' : 'Medium',
        },
        head3_impact: {
          carbonImpactKg: carbonImpact,
          affectedRadiusMeters: 180,
          heatMitigationScore: 8.7,
        },
        head4_routing: {
          targetAgency: agency,
          automatedAction: action,
          ticketId: `SF-AI-${Math.floor(10000 + Math.random() * 90000)}`,
        },
        confidence: 0.95,
        userSubmitted: true,
      };

      setIncidents([newIncident, ...incidents]);
      setSelectedIncident(newIncident);
      setCustomTitle('');
      setPreviewImage(null);

      // Celebration effect
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (err) {
        // Confetti fallback
      }
    }, 1200);
  };

  const filteredIncidents = incidents.filter(
    (inc) => filterCategory === 'all' || inc.head1_category === filterCategory
  );

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 p-5 rounded-2xl border border-indigo-500/20 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              Multi-Head AI Incident & Urban Vision Classifier
            </h2>
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
              v2.6 Edge-Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Inspired by Kimbedded&apos;s multi-head classification architecture: parses urban imagery
            into 4 simultaneous civic intelligence heads (Category, Urgency SLA, Carbon Impact, and
            Department Dispatch).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-mono">Total Reports</div>
            <div className="font-bold text-white text-sm">{incidents.length}</div>
          </div>
          <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-mono">Mean Dispatch SLA</div>
            <div className="font-bold text-emerald-400 text-sm">4.8 hrs</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Submission & Pre-loaded Scenarios */}
        <div className="lg:col-span-5 space-y-4">
          {/* Submission Form Card */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Submit Photo / Sensor Telemetry</span>
            </h3>

            <form onSubmit={handleRunInference} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Incident Title or Observation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broken water conduit or excessive asphalt heat"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 rounded-lg text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Location in San Francisco
                </label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 rounded-lg text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Initial Hypothesis Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-950 rounded-lg text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Urban Heat & Canopy">Urban Heat & Canopy Deficit</option>
                  <option value="Infrastructure & Drainage">Infrastructure & Drainage</option>
                  <option value="Waste & Composting">Waste & Composting Contamination</option>
                  <option value="Transit & Pedestrian">Transit & Pedestrian Obstruction</option>
                  <option value="Air Quality & Emissions">Air Quality & Local Emissions</option>
                </select>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Upload Image or Select Sensor Snapshot
                </label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-3 text-center transition-colors bg-slate-950/40">
                  {previewImage ? (
                    <div className="space-y-2">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="max-h-36 mx-auto rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="text-[11px] text-rose-400 hover:underline"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-2">
                      <Upload className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                      <span className="text-xs text-slate-300 font-medium block">
                        Drop image here or click to browse
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        JPEG, PNG, WebP (Field camera or IoT snapshot)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Zap className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Multi-Head Vision Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Run AI Classification Pipeline</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Filter & Historical Incident Feed */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Recent Classifications ({filteredIncidents.length})</span>
              </h3>

              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Infrastructure & Drainage">Drainage</option>
                  <option value="Urban Heat & Canopy">Heat Island</option>
                  <option value="Transit & Pedestrian">Transit</option>
                  <option value="Waste & Composting">Waste</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredIncidents.map((inc) => {
                const isSelected = inc.id === selectedIncident?.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono text-indigo-300 font-semibold">{inc.id}</span>
                      <span>{inc.timestamp}</span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate mb-1">
                      {inc.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate max-w-[160px]">{inc.location}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          inc.head2_urgency.level === 'Critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : inc.head2_urgency.level === 'High'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {inc.head2_urgency.level}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Head Detailed Output Inspector */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-5">
              {/* Header Details */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Ticket {selectedIncident.id}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {selectedIncident.timestamp}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{selectedIncident.title}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-indigo-400">📍</span> {selectedIncident.location}
                </p>
              </div>

              {/* The 4 Inference Heads Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Head 1: Category & Classification */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Head 1: Category</span>
                    <span className="text-emerald-400 font-bold">
                      {Math.round(selectedIncident.confidence * 100)}% Conf.
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    {selectedIncident.head1_category}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Semantic scene segmentation tagged municipal asset & environmental threat.
                  </p>
                </div>

                {/* Head 2: Severity & Priority SLA */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Head 2: Urgency & SLA</span>
                    <span className="text-amber-400 font-bold">
                      Score {selectedIncident.head2_urgency.score}/10
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        selectedIncident.head2_urgency.level === 'Critical'
                          ? 'text-rose-400'
                          : selectedIncident.head2_urgency.level === 'High'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {selectedIncident.head2_urgency.level} Priority
                    </span>
                    <span className="text-xs text-slate-400">
                      ({selectedIncident.head2_urgency.slaHours}h target dispatch)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Algorithmic SLA calculated from pedestrian density & flood/fire risk factors.
                  </p>
                </div>

                {/* Head 3: Carbon & Environmental Impact */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                    <span>Head 3: Climate & Carbon Impact</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {selectedIncident.head3_impact.carbonImpactKg} kg
                    </span>
                    <span className="text-xs text-slate-400">CO2e mitigation potential</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Radius: ~{selectedIncident.head3_impact.affectedRadiusMeters}m</span>
                    <span className="text-emerald-400 font-medium">
                      Eco-Score: {selectedIncident.head3_impact.heatMitigationScore}/10
                    </span>
                  </div>
                </div>

                {/* Head 4: Agency Routing & Dispatch */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                    <span>Head 4: Municipal Dispatch</span>
                  </div>
                  <div className="text-sm font-bold text-sky-400">
                    {selectedIncident.head4_routing.targetAgency}
                  </div>
                  <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800 font-mono">
                    {selectedIncident.head4_routing.automatedAction}
                  </div>
                </div>
              </div>

              {/* Automated Dispatch Status Box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Work Order Dispatched to {selectedIncident.head4_routing.targetAgency}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Work Order ID: <span className="font-mono text-slate-200">{selectedIncident.head4_routing.ticketId}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const dataStr =
                      'data:text/json;charset=utf-8,' +
                      encodeURIComponent(JSON.stringify(selectedIncident, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute('href', dataStr);
                    downloadAnchor.setAttribute(
                      'download',
                      `${selectedIncident.id}-report.json`
                    );
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
                >
                  Download JSON
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              Select an incident from the feed to inspect AI classification heads.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
