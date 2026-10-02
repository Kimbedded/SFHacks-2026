import React, { useState } from 'react';
import { HOTLINES } from '../data/sfsuCampusData';
import { 
  Phone, 
  X, 
  AlertCircle, 
  HeartHandshake, 
  Shield, 
  Sparkles, 
  Navigation, 
  MessageSquare, 
  Clock, 
  MapPin, 
  ExternalLink 
} from 'lucide-react';

interface HotlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestRide: () => void;
}

export function HotlineModal({ isOpen, onClose, onRequestRide }: HotlineModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'campus_mobility' | 'mental_health_caps' | 'crisis_hotline'>('all');

  if (!isOpen) return null;

  const filteredHotlines = HOTLINES.filter((h) => {
    if (selectedCategory === 'all') return true;
    return (h as any).category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-purple-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-5 rounded-t-2xl flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                SFSU DPRC &amp; CAPS Hotlines
              </h2>
              <p className="text-xs text-purple-200">
                Official campus accessibility, crisis counselors &amp; 24/7 mental health hotlines
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
        <div className="p-4 bg-gradient-to-r from-purple-50 via-amber-50 to-purple-50 border-b border-purple-100 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow shrink-0">
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
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow transition-all hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
          >
            Request Cart
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-purple-800 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Contacts ({HOTLINES.length})
          </button>
          <button
            onClick={() => setSelectedCategory('campus_mobility')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === 'campus_mobility'
                ? 'bg-purple-800 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            DPRC &amp; Mobility
          </button>
          <button
            onClick={() => setSelectedCategory('mental_health_caps')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === 'mental_health_caps'
                ? 'bg-purple-800 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            CAPS &amp; SAFE Place
          </button>
          <button
            onClick={() => setSelectedCategory('crisis_hotline')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === 'crisis_hotline'
                ? 'bg-purple-800 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            24/7 Crisis &amp; Text Lines
          </button>
        </div>

        {/* Hotlines List */}
        <div className="p-5 space-y-3.5 flex-1 overflow-y-auto">
          {filteredHotlines.map((hotline: any) => {
            const isTextHotline = Boolean(hotline.smsTarget);
            const is988 = hotline.id === 'lifeline_988';
            const isCaps = hotline.id === 'caps';

            return (
              <div
                key={hotline.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCaps
                    ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                    : is988
                    ? 'border-purple-300 bg-purple-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-purple-50/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{hotline.name}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      isCaps 
                        ? 'bg-blue-100 text-blue-900 border-blue-200' 
                        : is988
                        ? 'bg-purple-100 text-purple-900 border-purple-200'
                        : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {hotline.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{hotline.description}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                    {hotline.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-700 shrink-0" />
                        <span>{hotline.location}</span>
                      </span>
                    )}
                    {hotline.hours && (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{hotline.hours}</span>
                      </span>
                    )}
                    {hotline.ttyPhone && (
                      <span className="font-mono text-purple-900 font-semibold">
                        TTY/TTD: {hotline.ttyPhone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-800">{hotline.displayPhone}</span>
                    {hotline.email && (
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        • {hotline.email}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hotline.smsTarget && (
                      <a
                        href={`sms:${hotline.smsTarget}?body=HOME`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Text HOME</span>
                      </a>
                    )}

                    <a
                      href={`tel:${hotline.phone.replace(/[^0-9]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{is988 ? 'Call 988' : 'Call Now'}</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Official CAPS Page Link & TTY Relay Notice */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span>Verified from SFSU CAPS Official Directory</span>
              </span>
              <a
                href="https://caps.sfsu.edu/Resources/Resources"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
              >
                <span>caps.sfsu.edu</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Counseling &amp; Psychological Services (CAPS) is located at the Gator Student Health Center, 3rd Floor (730 Font Blvd). Phone: (415) 338-2208 (24/7). TTY: Dial 711 for California Relay Service.
            </p>
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
