import React from 'react';
import { X, Award, Cpu, Sparkles, MapPin, ExternalLink, Github, Heart } from 'lucide-react';

interface HackathonInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HackathonInfoModal: React.FC<HackathonInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">SF Hacks 2026</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                GDG AI Hackathon
              </span>
            </div>
            <p className="text-xs text-slate-400">
              San Francisco State University (SFSU) • Student Life Events Center
            </p>
          </div>
        </div>

        {/* Project Description */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>SFPulse AI</strong> is a full-stack civic intelligence and urban microclimate sensing platform built for <strong>SF Hacks 2026</strong>. By combining distributed IoT edge telemetry (ESP32-S3 / LoRaWAN) with multi-head AI vision classification, SFPulse empowers San Francisco to monitor localized heat island anomalies, air quality pockets, and municipal infrastructure threats in real time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Cpu className="w-4 h-4" />
                <span>Embedded IoT Sensing</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Emulates LoRaWAN 915MHz sensor nodes monitoring PM2.5, ambient microclimate temperatures, and stormwater runoffs across 10 San Francisco districts.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Multi-Head AI Vision</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Inspired by Kimbedded&apos;s machine learning architectures: simultaneously outputs semantic category, emergency dispatch SLA, carbon mitigation score, and agency work orders.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <MapPin className="w-4 h-4" />
              <span>SFSU Campus & Bay Area Focus</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Features custom vector cartography of the 7x7 mile San Francisco peninsula with real-time fog layer modeling, Twin Peaks gateway radius, and What-If climate action simulations.
            </p>
          </div>
        </div>

        {/* Footer & Credits */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Repository:</span>
            <span className="font-mono text-slate-200 font-semibold">Kimbedded / SFHacks-2026</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30"
          >
            Explore Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
