import React, { useState, useMemo } from 'react';
import { SimulationParams } from '../types';
import { Sliders, RefreshCw, Zap, Award, Sparkles, TrendingDown, DollarSign, Droplets } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ClimateSimulator: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    canopyTreesCount: 8500,
    solarPanelsMw: 45,
    muniTransitBoostPct: 35,
    coolPavementsPct: 20,
    compostDiversionRate: 75,
  });

  // Calculate dynamic simulation results
  const results = useMemo(() => {
    // Temperature drop: trees + cool pavements
    const treeCooling = (params.canopyTreesCount / 10000) * 0.8;
    const pavementCooling = (params.coolPavementsPct / 50) * 1.4;
    const tempDrop = Number((treeCooling + pavementCooling).toFixed(2));

    // CO2 reduction (Metric Tons / year)
    // 1 tree ≈ 22kg CO2/year -> 1,000 trees ≈ 22 tons
    const treeCo2 = (params.canopyTreesCount * 0.022);
    // 1 MW solar ≈ 850 tons CO2 avoided
    const solarCo2 = params.solarPanelsMw * 850;
    // Transit boost avoids car trips: 1% boost ≈ 420 tons CO2
    const transitCo2 = params.muniTransitBoostPct * 420;
    // Compost diversion methane prevention: 1% above 50% ≈ 310 tons
    const compostCo2 = (params.compostDiversionRate - 50) * 310;
    const totalCo2 = Math.round(treeCo2 + solarCo2 + transitCo2 + compostCo2);

    // Healthcare / Respiratory Savings ($)
    const healthcareSavings = Math.round(totalCo2 * 68 + tempDrop * 1400000);

    // Stormwater runoff retained (gallons)
    // 1 tree absorbs ~1,200 gallons / year
    const stormwater = Math.round(params.canopyTreesCount * 1200);

    // Letter grade
    let grade = 'B';
    if (totalCo2 > 65000 && tempDrop > 1.8) grade = 'A+';
    else if (totalCo2 > 50000 || tempDrop > 1.4) grade = 'A';
    else if (totalCo2 > 35000) grade = 'B+';
    else if (totalCo2 > 20000) grade = 'B';
    else grade = 'C';

    return {
      tempDrop,
      totalCo2,
      healthcareSavings,
      stormwater,
      grade,
    };
  }, [params]);

  const applyPreset = (presetName: string) => {
    if (presetName === 'sf2030') {
      setParams({
        canopyTreesCount: 18000,
        solarPanelsMw: 95,
        muniTransitBoostPct: 65,
        coolPavementsPct: 35,
        compostDiversionRate: 90,
      });
    } else if (presetName === 'coolCollegiate') {
      // Focus on SFSU & Mission corridor
      setParams({
        canopyTreesCount: 12000,
        solarPanelsMw: 70,
        muniTransitBoostPct: 40,
        coolPavementsPct: 45,
        compostDiversionRate: 85,
      });
    } else if (presetName === 'aggressive') {
      setParams({
        canopyTreesCount: 25000,
        solarPanelsMw: 120,
        muniTransitBoostPct: 90,
        coolPavementsPct: 50,
        compostDiversionRate: 95,
      });
    }

    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } catch (e) {}
  };

  const resetParams = () => {
    setParams({
      canopyTreesCount: 8500,
      solarPanelsMw: 45,
      muniTransitBoostPct: 35,
      coolPavementsPct: 20,
      compostDiversionRate: 75,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 p-5 rounded-2xl border border-emerald-500/20 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              What-If San Francisco Climate Action Simulator
            </h2>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              SF General Plan Model
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Model targeted civic interventions across San Francisco. Explore projected microclimate
            cooling, annual CO2 drawdown, municipal healthcare cost savings, and stormwater capture.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset('sf2030')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 border border-emerald-500/40 transition-all"
          >
            SF 2030 Plan
          </button>
          <button
            onClick={() => applyPreset('coolCollegiate')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 border border-blue-500/40 transition-all"
          >
            SFSU & Mission Cool
          </button>
          <button
            onClick={() => applyPreset('aggressive')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 border border-purple-500/40 transition-all"
          >
            Net-Zero Max
          </button>
          <button
            onClick={resetParams}
            title="Reset to default"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Input Panel (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Civic Intervention Controls</span>
          </h3>

          {/* Slider 1: Canopy Trees */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Urban Canopy Trees Planted
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {params.canopyTreesCount.toLocaleString()} trees
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25000"
              step="500"
              value={params.canopyTreesCount}
              onChange={(e) =>
                setParams({ ...params, canopyTreesCount: Number(e.target.value) })
              }
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Current SF Baseline</span>
              <span>10,000 Goal</span>
              <span>25,000 Max Canopy</span>
            </div>
          </div>

          {/* Slider 2: Microgrid Solar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Rooftop & Microgrid Solar Capacity
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {params.solarPanelsMw} MW Installed
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={params.solarPanelsMw}
              onChange={(e) =>
                setParams({ ...params, solarPanelsMw: Number(e.target.value) })
              }
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10 MW</span>
              <span>75 MW Target</span>
              <span>150 MW Grid Max</span>
            </div>
          </div>

          {/* Slider 3: Muni Transit Boost */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Muni Zero-Emission Transit Frequency Boost
              </span>
              <span className="font-mono text-sky-400 font-bold">
                +{params.muniTransitBoostPct}% Service
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={params.muniTransitBoostPct}
              onChange={(e) =>
                setParams({ ...params, muniTransitBoostPct: Number(e.target.value) })
              }
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Normal Frequency</span>
              <span>+50% High Capacity</span>
              <span>+100% Rapid Express</span>
            </div>
          </div>

          {/* Slider 4: Cool Pavements */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Cool Pavement & High-Albedo Street Coating
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {params.coolPavementsPct}% Road Surface
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="2"
              value={params.coolPavementsPct}
              onChange={(e) =>
                setParams({ ...params, coolPavementsPct: Number(e.target.value) })
              }
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0% Asphalt only</span>
              <span>25% SOMA & Mission alleys</span>
              <span>50% Citywide arterial</span>
            </div>
          </div>

          {/* Slider 5: Compost Diversion Rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Organic Waste & Compost Diversion Rate
              </span>
              <span className="font-mono text-emerald-300 font-bold">
                {params.compostDiversionRate}% Diversion
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="98"
              step="1"
              value={params.compostDiversionRate}
              onChange={(e) =>
                setParams({ ...params, compostDiversionRate: Number(e.target.value) })
              }
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>50% Baseline</span>
              <span>80% SF Recology Goal</span>
              <span>98% Zero Waste</span>
            </div>
          </div>
        </div>

        {/* Projected Impact Dashboard (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Projected Climate Impact</span>
              </h3>
              <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-amber-300 font-bold font-mono text-xs">
                City Grade: {results.grade}
              </div>
            </div>

            {/* Metric 1: Temp Drop */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <TrendingDown className="w-4 h-4" /> Microclimate Heat Drop
                </span>
                <span className="text-[10px] font-mono text-slate-500">Avg across SF</span>
              </div>
              <div className="text-2xl font-black text-sky-300 font-mono">
                -{results.tempDrop}°F
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Reduces peak asphalt surface temperatures up to 14°F in high-density areas.
              </p>
            </div>

            {/* Metric 2: CO2 Drawdown */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-4 h-4" /> Annual CO2 Mitigation
                </span>
                <span className="text-[10px] font-mono text-slate-500">Metric Tons / yr</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {results.totalCo2.toLocaleString()} MT
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Equivalent to taking {Math.round(results.totalCo2 / 4.6).toLocaleString()} gasoline
                passenger vehicles off Bay Area roads permanently.
              </p>
            </div>

            {/* Metric 3: Healthcare Savings */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <DollarSign className="w-4 h-4" /> Healthcare Cost Savings
                </span>
                <span className="text-[10px] font-mono text-slate-500">Estimated Annual</span>
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                ${(results.healthcareSavings / 1000000).toFixed(2)}M / yr
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                From reduced asthma hospitalizations, cardiovascular strain, and heat emergency visits.
              </p>
            </div>

            {/* Metric 4: Stormwater Retention */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Droplets className="w-4 h-4" /> Stormwater Absorbed
                </span>
                <span className="text-[10px] font-mono text-slate-500">Gal / year</span>
              </div>
              <div className="text-lg font-bold text-blue-300 font-mono">
                {(results.stormwater / 1000000).toFixed(2)} Million Gallons
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
