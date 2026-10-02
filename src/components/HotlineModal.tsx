import React from 'react';
import { HOTLINES } from '../data/sfsuCampusData';
import { Phone, X, AlertCircle, HeartHandshake, Shield, Sparkles, Navigation } from 'lucide-react';

interface HotlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestRide: () => void;
}

export function HotlineModal({ isOpen, onClose, onRequestRide }: HotlineModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-purple-100">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-5 rounded-t-2xl flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                SFSU Accessibility Hotlines
              </h2>
              <p className="text-xs text-purple-200">
                Direct lines for mobility, safety escorts & mental health
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-purple-200 hover:text-white transition-colors"
            aria-label="Close hotline directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action: Request Gator Cart Ride */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-amber-50 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-purple-950">Elevator broken or steep path?</div>
              <div className="text-xs text-purple-800">Gator Mobility can pick you up in an accessible golf cart</div>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onRequestRide();
            }}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow transition-all hover:scale-105 active:scale-95"
          >
            Request Cart
          </button>
        </div>

        {/* Hotlines List */}
        <div className="p-5 space-y-4">
          {HOTLINES.map((hotline) => (
            <div
              key={hotline.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-purple-50/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{hotline.name}</span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      {hotline.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{hotline.description}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <span className="text-purple-700">📍</span> {hotline.location}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">{hotline.displayPhone}</span>
                <a
                  href={`tel:${hotline.phone.replace(/[^0-9]/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Now
                </a>
              </div>
            </div>
          ))}

          {/* TTY & Relay Notice */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
            <AlertCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Telecommunications Relay (TTY):</span> Dial 711
              for California Relay Service. For visual communication or text alerts, select the Visual
              Accessibility mode in the top bar.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
}
