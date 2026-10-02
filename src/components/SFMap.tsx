import React, { useState } from 'react';
import { NeighborhoodData, NeighborhoodId } from '../types';
import { Wind, Sun, CloudRain, ShieldCheck, AlertCircle, Eye, Layers } from 'lucide-react';

interface SFMapProps {
  neighborhoods: NeighborhoodData[];
  selectedId: NeighborhoodId;
  onSelect: (id: NeighborhoodId) => void;
  metricMode: 'aqi' | 'temp' | 'canopy' | 'solar';
  setMetricMode: (m: 'aqi' | 'temp' | 'canopy' | 'solar') => void;
}

export const SFMap: React.FC<SFMapProps> = ({
  neighborhoods,
  selectedId,
  onSelect,
  metricMode,
  setMetricMode,
}) => {
  const [showFogLayer, setShowFogLayer] = useState(true);
  const [showRadar, setShowRadar] = useState(true);

  const selectedNeighborhood = neighborhoods.find((n) => n.id === selectedId);

  const getMetricColor = (n: NeighborhoodData) => {
    switch (metricMode) {
      case 'aqi':
        if (n.aqi <= 30) return '#10b981'; // green
        if (n.aqi <= 50) return '#3b82f6'; // blue
        if (n.aqi <= 75) return '#f59e0b'; // amber
        return '#ef4444'; // red
      case 'temp':
        if (n.tempF < 60) return '#38bdf8'; // cool cyan
        if (n.tempF < 68) return '#60a5fa'; // mild blue
        if (n.tempF < 72) return '#fbbf24'; // warm amber
        return '#f97316'; // orange/hot
      case 'canopy':
        if (n.canopyCoveragePct > 35) return '#059669'; // deep forest
        if (n.canopyCoveragePct > 20) return '#10b981'; // medium green
        return '#d97706'; // low canopy / amber
      case 'solar':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  };

  const getMetricBadge = (n: NeighborhoodData) => {
    switch (metricMode) {
      case 'aqi':
        return `AQI ${n.aqi}`;
      case 'temp':
        return `${n.tempF}°F`;
      case 'canopy':
        return `${n.canopyCoveragePct}% Tree`;
      case 'solar':
        return `${n.solarOutputKw} kW`;
    }
  };

  return (
    <div className="relative bg-slate-900/60 rounded-2xl border border-slate-800 p-4 overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>SF Peninsula Sensor Grid</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Telemetry 915MHz
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Interactive microclimate, air quality & heat island map across San Francisco
          </p>
        </div>

        {/* Metric Layer Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMetricMode('aqi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              metricMode === 'aqi'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Air Quality (AQI)
          </button>
          <button
            onClick={() => setMetricMode('temp')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              metricMode === 'temp'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Microclimate (°F)
          </button>
          <button
            onClick={() => setMetricMode('canopy')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              metricMode === 'canopy'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tree Canopy
          </button>
          <button
            onClick={() => setMetricMode('solar')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              metricMode === 'solar'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Solar Output
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFogLayer(!showFogLayer)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              showFogLayer
                ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Marine Fog</span>
          </button>
          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              showRadar
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Wind className="w-3 h-3" />
            <span>Radar Sweep</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full aspect-[4/3] max-h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center">
        <svg
          viewBox="0 0 800 650"
          className="w-full h-full object-contain select-none"
        >
          <defs>
            {/* Water gradient */}
            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#081829" />
              <stop offset="100%" stopColor="#0d2b45" />
            </linearGradient>

            {/* Land gradient */}
            <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#172033" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Marine fog gradient */}
            <radialGradient id="fogGrad" cx="20%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#cbd5e1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* Twin Peaks Elevation Rings */}
            <radialGradient id="peaksGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
            </radialGradient>

            {/* Radar sweep gradient */}
            <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Pacific Ocean & Bay Background */}
          <rect width="800" height="650" fill="url(#oceanGrad)" />

          {/* Grid lines */}
          <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.4">
            <line x1="100" y1="0" x2="100" y2="650" />
            <line x1="200" y1="0" x2="200" y2="650" />
            <line x1="300" y1="0" x2="300" y2="650" />
            <line x1="400" y1="0" x2="400" y2="650" />
            <line x1="500" y1="0" x2="500" y2="650" />
            <line x1="600" y1="0" x2="600" y2="650" />
            <line x1="700" y1="0" x2="700" y2="650" />
            <line x1="0" y1="100" x2="800" y2="100" />
            <line x1="0" y1="200" x2="800" y2="200" />
            <line x1="0" y1="300" x2="800" y2="300" />
            <line x1="0" y1="400" x2="800" y2="400" />
            <line x1="0" y1="500" x2="800" y2="500" />
            <line x1="0" y1="600" x2="800" y2="600" />
          </g>

          {/* Ocean waves / Coastline Water Labels */}
          <text x="50" y="320" fill="#38bdf8" opacity="0.3" fontSize="13" fontWeight="bold" letterSpacing="3">
            PACIFIC OCEAN
          </text>
          <text x="660" y="380" fill="#38bdf8" opacity="0.3" fontSize="13" fontWeight="bold" letterSpacing="3">
            SAN FRANCISCO BAY
          </text>
          <text x="320" y="50" fill="#38bdf8" opacity="0.25" fontSize="11" fontWeight="bold" letterSpacing="2">
            GOLDEN GATE STRAIT
          </text>

          {/* San Francisco Peninsula Landmass Path */}
          <path
            d="
              M 140,630
              L 140,360
              Q 140,240 180,180
              L 230,120
              Q 260,90 320,110
              Q 410,130 520,140
              Q 590,160 640,220
              Q 660,250 630,300
              L 600,340
              Q 620,380 630,440
              L 610,510
              Q 630,550 610,630
              Z
            "
            fill="url(#landGrad)"
            stroke="#334155"
            strokeWidth="2.5"
          />

          {/* Golden Gate Park Green Belt */}
          <rect
            x="160"
            y="320"
            width="230"
            height="36"
            rx="8"
            fill="#065f46"
            opacity="0.6"
            stroke="#047857"
            strokeWidth="1"
          />
          <text x="210" y="342" fill="#6ee7b7" fontSize="10" opacity="0.8" fontWeight="600">
            Golden Gate Park
          </text>

          {/* Presidio Green Area */}
          <path
            d="M 230,125 Q 310,115 360,140 L 330,195 Q 260,195 230,160 Z"
            fill="#065f46"
            opacity="0.5"
            stroke="#047857"
            strokeWidth="1"
          />
          <text x="260" y="155" fill="#6ee7b7" fontSize="10" opacity="0.8" fontWeight="600">
            Presidio
          </text>

          {/* Lake Merced Water Body (Near SFSU) */}
          <ellipse
            cx="210"
            cy="565"
            rx="32"
            ry="20"
            fill="#0d2b45"
            stroke="#38bdf8"
            strokeWidth="1"
            opacity="0.8"
          />
          <text x="180" y="598" fill="#38bdf8" fontSize="9" opacity="0.7">
            Lake Merced
          </text>

          {/* Twin Peaks Elevation contours */}
          <ellipse cx="350" cy="410" rx="60" ry="45" fill="url(#peaksGrad)" />
          <ellipse cx="350" cy="410" rx="35" ry="25" fill="#334155" opacity="0.6" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <text x="325" y="415" fill="#94a3b8" fontSize="9" fontWeight="600" opacity="0.8">
            Twin Peaks (922 ft)
          </text>

          {/* Golden Gate Bridge representation */}
          <line x1="280" y1="80" x2="310" y2="110" stroke="#ef4444" strokeWidth="3" strokeDasharray="4 2" />
          <text x="240" y="70" fill="#f87171" fontSize="9" fontWeight="bold">
            Golden Gate Bridge
          </text>

          {/* Bay Bridge representation */}
          <line x1="590" y1="250" x2="720" y2="210" stroke="#94a3b8" strokeWidth="3" strokeDasharray="4 2" />
          <text x="640" y="220" fill="#cbd5e1" fontSize="9" fontWeight="bold">
            Bay Bridge
          </text>

          {/* Marine Fog Layer (Karl the Fog simulation) */}
          {showFogLayer && (
            <ellipse
              cx="190"
              cy="340"
              rx="180"
              ry="260"
              fill="url(#fogGrad)"
              className="pointer-events-none transition-opacity duration-1000"
            />
          )}

          {/* LoRaWAN Radar Sweep from Twin Peaks Gateway */}
          {showRadar && (
            <g transform="translate(350, 410)" className="pointer-events-none">
              <circle r="180" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.25" strokeDasharray="5 5" />
              <circle r="300" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.15" />
              <g className="animate-radar">
                <path d="M 0 0 L 260 0 A 260 260 0 0 1 184 184 Z" fill="url(#radarSweep)" />
              </g>
            </g>
          )}

          {/* Major SF Street Grids */}
          {/* Market Street Diagonal */}
          <line x1="360" y1="400" x2="590" y2="230" stroke="#3b82f6" strokeWidth="2.5" opacity="0.35" />
          {/* 19th Avenue */}
          <line x1="220" y1="280" x2="210" y2="570" stroke="#64748b" strokeWidth="1.5" opacity="0.3" />
          {/* Van Ness Avenue */}
          <line x1="430" y1="160" x2="430" y2="400" stroke="#64748b" strokeWidth="1.5" opacity="0.25" />

          {/* Neighborhood Nodes */}
          {neighborhoods.map((n) => {
            const isSelected = n.id === selectedId;
            const nodeColor = getMetricColor(n);
            const badgeText = getMetricBadge(n);

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={() => onSelect(n.id)}
                className="cursor-pointer group"
              >
                {/* Highlight ring if selected */}
                {isSelected && (
                  <circle
                    r="24"
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="2"
                    className="animate-ping opacity-60"
                  />
                )}

                {/* Base Outer Glow */}
                <circle
                  r={isSelected ? 18 : 13}
                  fill={nodeColor}
                  opacity={isSelected ? 0.35 : 0.2}
                  className="transition-all duration-300 group-hover:scale-125"
                />

                {/* Core Marker */}
                <circle
                  r={isSelected ? 9 : 7}
                  fill={nodeColor}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-300 shadow-lg"
                />

                {/* Pulsing center dot for SFSU (Hackathon venue) */}
                {n.id === 'sfsu' && (
                  <circle r="3.5" fill="#ffffff" className="animate-pulse" />
                )}

                {/* Label Box */}
                <g transform="translate(14, -14)">
                  <rect
                    x="-4"
                    y="-12"
                    width={n.id === 'sfsu' ? 140 : 105}
                    height="24"
                    rx="5"
                    fill="#0f172a"
                    stroke={isSelected ? nodeColor : '#334155'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                    opacity="0.9"
                  />
                  <text
                    x="2"
                    y="4"
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight={isSelected ? 'bold' : '600'}
                  >
                    {n.name.split('&')[0]}
                  </text>
                  <text
                    x={n.id === 'sfsu' ? 100 : 75}
                    y="4"
                    fill={nodeColor}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    {badgeText}
                  </text>
                  {n.id === 'sfsu' && (
                    <text x="134" y="4" fill="#fbbf24" fontSize="8">
                      ★
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* SFSU Hackathon Venue Pin badge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 backdrop-blur-md shadow-lg">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          <span className="text-slate-300 font-medium">
            ★ <strong className="text-white">SFSU Annex Hub</strong> (SF Hacks 2026 Headquarters)
          </span>
        </div>
      </div>

      {/* Selected Neighborhood Quick Card */}
      {selectedNeighborhood && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {selectedNeighborhood.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {selectedNeighborhood.category}
              </span>
              {selectedNeighborhood.id === 'sfsu' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  SF Hacks 2026 Host
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              {selectedNeighborhood.notes}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Air Quality</div>
              <div className="font-bold text-sm text-emerald-400 flex items-center gap-1">
                AQI {selectedNeighborhood.aqi}
                <span className="text-[10px] font-normal text-slate-400">({selectedNeighborhood.aqiStatus})</span>
              </div>
            </div>

            <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Microclimate</div>
              <div className="font-bold text-sm text-sky-400 flex items-center gap-1">
                {selectedNeighborhood.tempF}°F
                <span className="text-[10px] font-normal text-slate-400">
                  ({selectedNeighborhood.heatIslandDeltaF > 0 ? `+${selectedNeighborhood.heatIslandDeltaF}` : selectedNeighborhood.heatIslandDeltaF}°F island)
                </span>
              </div>
            </div>

            <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Canopy Cover</div>
              <div className="font-bold text-sm text-emerald-400">
                {selectedNeighborhood.canopyCoveragePct}%
              </div>
            </div>

            <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Solar / Sensors</div>
              <div className="font-bold text-sm text-amber-400">
                {selectedNeighborhood.solarOutputKw} kW <span className="text-slate-400 text-xs font-normal">({selectedNeighborhood.activeSensors} nodes)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
