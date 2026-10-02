import React, { useState } from 'react';
import { NeighborhoodData, NeighborhoodId } from '../types';
import { Search, Flame, Trees, Sun, AlertTriangle, ArrowUpRight, Gauge } from 'lucide-react';

interface NeighborhoodCardsProps {
  neighborhoods: NeighborhoodData[];
  selectedId: NeighborhoodId;
  onSelect: (id: NeighborhoodId) => void;
}

export const NeighborhoodCards: React.FC<NeighborhoodCardsProps> = ({
  neighborhoods,
  selectedId,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'aqi' | 'temp' | 'canopy'>('aqi');

  const filtered = neighborhoods
    .filter(
      (n) =>
        n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.notes.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'aqi') return a.aqi - b.aqi;
      if (sortBy === 'temp') return b.tempF - a.tempF;
      if (sortBy === 'canopy') return b.canopyCoveragePct - a.canopyCoveragePct;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-4">
      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search SF zones or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 rounded-lg text-xs text-slate-200 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <span className="text-slate-400 text-xs">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="aqi">Best Air Quality (Lowest AQI)</option>
            <option value="temp">Warmest Microclimate (°F)</option>
            <option value="canopy">Highest Tree Canopy (%)</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Neighborhood Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((n) => {
          const isSelected = n.id === selectedId;

          return (
            <div
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              {/* Corner accent for SFSU */}
              {n.id === 'sfsu' && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-bold text-[9px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  SF Hacks Hub
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    {n.name}
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400">{n.category}</p>
                </div>
              </div>

              {/* Metric stats grid */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-emerald-400" /> AQI
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">{n.aqi}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        n.aqi < 35 ? 'bg-emerald-400' : n.aqi < 55 ? 'bg-blue-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (n.aqi / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-sky-400" /> Temp
                    </span>
                    <span className="font-mono text-sky-300 font-semibold">{n.tempF}°F</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {n.heatIslandDeltaF > 0 ? `+${n.heatIslandDeltaF}` : n.heatIslandDeltaF}°F vs avg
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Trees className="w-3 h-3 text-emerald-500" /> Canopy
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">{n.canopyCoveragePct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, n.canopyCoveragePct * 1.5)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> Solar
                    </span>
                    <span className="font-mono text-amber-300 font-semibold">{n.solarOutputKw} kW</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {n.activeSensors} sensor nodes
                  </div>
                </div>
              </div>

              {/* Alert or note */}
              {n.recentAlert ? (
                <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md p-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
                  <span className="truncate">{n.recentAlert}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                  {n.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
