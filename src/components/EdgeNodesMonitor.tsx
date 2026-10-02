import React, { useState, useEffect } from 'react';
import { EdgeSensorNode } from '../types';
import { INITIAL_EDGE_NODES } from '../data/sfData';
import { Radio, Wifi, BatteryCharging, Battery, AlertTriangle, RefreshCw, Cpu, Activity, ShieldCheck } from 'lucide-react';

export const EdgeNodesMonitor: React.FC = () => {
  const [nodes, setNodes] = useState<EdgeSensorNode[]>(INITIAL_EDGE_NODES);
  const [selectedNode, setSelectedNode] = useState<EdgeSensorNode>(INITIAL_EDGE_NODES[0]);
  const [isSimulatingSpike, setIsSimulatingSpike] = useState(false);

  // Live streaming effect simulating micro-fluctuations in edge sensors
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => {
          // slight random jitter on live readings
          const tempDelta = (Math.random() - 0.5) * 0.2;
          const pmDelta = (Math.random() - 0.5) * 0.4;
          const noiseDelta = (Math.random() - 0.5) * 1.5;

          const updatedReadings = {
            ...n.readings,
            temperature: Number((n.readings.temperature + tempDelta).toFixed(1)),
            pm25: Math.max(1, Number((n.readings.pm25 + pmDelta).toFixed(1))),
            noiseDb: Math.max(30, Math.round(n.readings.noiseDb + noiseDelta)),
          };

          return {
            ...n,
            lastPingSecs: Math.floor(Math.random() * 5) + 1,
            readings: updatedReadings,
          };
        })
      );
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const triggerSpikeSimulation = () => {
    setIsSimulatingSpike(true);
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            anomalyDetected: 'Simulated PM2.5 Thermal Inversion Spike (+34 μg/m³)',
            readings: {
              ...n.readings,
              pm25: Number((n.readings.pm25 + 34).toFixed(1)),
              temperature: Number((n.readings.temperature + 4.5).toFixed(1)),
            },
          };
        }
        return n;
      })
    );

    setTimeout(() => {
      setIsSimulatingSpike(false);
    }, 4000);
  };

  const clearAnomaly = () => {
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, anomalyDetected: undefined } : n))
    );
  };

  return (
    <div className="space-y-6">
      {/* Edge Header */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 p-5 rounded-2xl border border-cyan-500/20 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              Embedded IoT & LoRaWAN Edge Sensor Network
            </h2>
            <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
              US915 MHz Channel 0-7
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Real-time telemetry streaming from microcontroller stations (ESP32-S3, Nordic nRF9160,
            Raspberry Pi Gateway) deployed across San Francisco and the SFSU campus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerSpikeSimulation}
            disabled={isSimulatingSpike}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Micro-Spike</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fleet List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between px-1">
            <span>Active Edge Nodes ({nodes.length})</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All Units Synchronized
            </span>
          </div>

          <div className="space-y-2.5">
            {nodes.map((n) => {
              const isSelected = n.id === selectedNode.id;

              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedNode(n)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      {n.id}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      Ping {n.lastPingSecs}s ago
                    </span>
                  </div>

                  <div className="font-bold text-white text-xs mb-1 truncate">{n.name}</div>
                  <div className="text-[11px] text-slate-400 truncate mb-2">{n.location}</div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300 font-mono">
                      {n.protocol}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      {n.isSolarCharging ? (
                        <BatteryCharging className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Battery className="w-3 h-3 text-slate-400" />
                      )}
                      {n.batteryPct}%
                    </span>
                    <span className="font-mono text-slate-400">{n.rssi} dBm</span>
                  </div>

                  {n.anomalyDetected && (
                    <div className="mt-2 text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded p-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{n.anomalyDetected}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Telemetry Inspector (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {selectedNode.hardware}
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Activity className="w-3.5 h-3.5" /> Telemetry Stream Active
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{selectedNode.name}</h3>
            <p className="text-xs text-slate-400">{selectedNode.location}</p>
          </div>

          {/* Anomaly banner if detected */}
          {selectedNode.anomalyDetected && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Anomaly Flag:</strong> {selectedNode.anomalyDetected}
                </span>
              </div>
              <button
                onClick={clearAnomaly}
                className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 text-[10px] font-bold border border-rose-500/40"
              >
                Clear / Recalibrate
              </button>
            </div>
          )}

          {/* Real-time Telemetry Sensor Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* PM2.5 */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Particulate PM2.5</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {selectedNode.readings.pm25}{' '}
                <span className="text-xs font-normal text-slate-400">μg/m³</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Laser optical sensor</div>
            </div>

            {/* Temperature */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Ambient Temp</div>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {selectedNode.readings.temperature}{' '}
                <span className="text-xs font-normal text-slate-400">°F</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">BME688 calibrated</div>
            </div>

            {/* Humidity */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Rel. Humidity</div>
              <div className="text-xl font-bold font-mono text-blue-300 mt-1">
                {selectedNode.readings.humidity}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fog & marine buffer</div>
            </div>

            {/* CO2 */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Carbon Dioxide</div>
              <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
                {selectedNode.readings.co2}{' '}
                <span className="text-xs font-normal text-slate-400">ppm</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Photoacoustic NDIR</div>
            </div>

            {/* VOC Index */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">VOC Gas Index</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                {selectedNode.readings.vocIndex}
                <span className="text-xs font-normal text-slate-400"> / 500</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">MOx Gas array</div>
            </div>

            {/* Ambient Noise */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Acoustic Noise</div>
              <div className="text-xl font-bold font-mono text-purple-300 mt-1">
                {selectedNode.readings.noiseDb}{' '}
                <span className="text-xs font-normal text-slate-400">dBA</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">I2S MEMS microphone</div>
            </div>
          </div>

          {/* Raw Edge Serial Hex / Packet Stream */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-900 pb-1">
              <span>Edge Packet Buffer (Hex Payload)</span>
              <span>Freq: 915.2 MHz • Spreading Factor: SF7</span>
            </div>
            <p className="text-slate-400 text-[11px] truncate">
              [LORA_RX] DEV_EUI=70B3D57ED00612F1 • FCNT=0x04F2 • RSSI={selectedNode.rssi}dBm • SNR=9.2dB
            </p>
            <p className="text-emerald-400 text-[11px] truncate">
              PAYLOAD: 01 67 02 {Math.round(selectedNode.readings.temperature * 10).toString(16).padStart(4, '0')} 02 68 {selectedNode.readings.humidity.toString(16).padStart(2, '0')} 03 02 {Math.round(selectedNode.readings.pm25).toString(16).padStart(4, '0')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
