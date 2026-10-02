import React, { useState } from 'react';
import { FaWandMagicSparkles, FaPaperPlane, FaSpinner, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { SFSU_ACCESSIBLE_CORRIDORS } from '../data/sfsuCampusData';

export const NAVIGATOR_CONDITIONS = [
  { id: 'zero_stairs', label: 'Zero stairs' },
  { id: 'gentle_slopes', label: 'Gentle slopes (<5%)' },
  { id: 'avoid_elevators', label: 'Avoid elevators' },
  { id: 'power_doors', label: 'Power-door entrances' },
  { id: 'shortest_walk', label: 'Shortest walk' },
];

export interface NavigatorOriginOption {
  id: string;
  name: string;
  shortName: string;
  icon: string;
}

export interface NavigatorResponse {
  action: 'navigate' | 'ask_places';
  corridorId?: string;
  originId?: string;
  mobilityProfile?: string;
  conditions: string[];
  reply: string;
  places: { title: string; uri?: string }[];
}

interface NavigatorPromptProps {
  origins: NavigatorOriginOption[];
  selectedOriginId: string;
  mobilityProfile: string;
  userLocation: { lat: number; lng: number } | null;
  onResult: (result: NavigatorResponse, appliedConditions: string[]) => void;
}

const SUGGESTIONS = [
  'Get me to the DPRC, I use a manual chair',
  'Nearest step-free coffee shop',
  'Library from the transit plaza, no elevators',
];

export function NavigatorPrompt({ origins, selectedOriginId, mobilityProfile, userLocation, onResult }: NavigatorPromptProps) {
  const [text, setText] = useState('');
  const [originId, setOriginId] = useState<string>('');
  const [corridorId, setCorridorId] = useState<string>('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<NavigatorResponse | null>(null);

  const toggleCondition = (id: string) =>
    setConditions((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const canSend = !loading && (text.trim().length > 0 || corridorId !== '');

  const submit = async () => {
    if (!canSend) return;
    const corridor = SFSU_ACCESSIBLE_CORRIDORS.find((c) => c.id === corridorId);
    const origin = origins.find((o) => o.id === originId);
    const parts = [text.trim() || (corridor ? `Take me to ${corridor.title}` : '')];
    if (corridor) parts.push(`Destination: ${corridor.id}.`);
    if (origin) parts.push(`Start from: ${origin.id}.`);
    if (conditions.length) parts.push(`Required conditions: ${conditions.join(', ')}.`);

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/navigator/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: parts.join(' '),
          origins: origins.filter((o) => o.id !== 'origin-current').map((o) => ({ id: o.id, name: o.name })),
          currentOriginId: originId || selectedOriginId,
          currentProfile: mobilityProfile,
          userLocation: userLocation || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
      setResponse(data);
      // Fixed selections are always honored in addition to what Gemini inferred.
      const applied = Array.from(new Set([...conditions, ...(data.conditions || [])]));
      onResult(data, applied);
      setText('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const chip = (selected: boolean) =>
    `min-h-9 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
      selected
        ? 'bg-purple-900 border-purple-900 text-white'
        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50'
    }`;

  return (
    <section aria-label="Ask GatorAI to plan a route" className="rounded-2xl border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FaWandMagicSparkles aria-hidden="true" className="w-4 h-4 text-purple-700" />
        <h4 className="font-black text-sm text-slate-900">Ask GatorAI</h4>
        <span className="text-[11px] text-slate-500">Describe where you need to go, or pick from the options below.</span>
      </div>

      <div className="rounded-xl border border-slate-300 bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-200">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          maxLength={400}
          aria-label="Describe your route or ask about nearby places"
          placeholder='e.g. "Take me to the library, avoid steep ramps" or "step-free restroom near Thornton Hall"'
          className="w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setText(s)} className="text-[11px] text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-full px-2 py-1 cursor-pointer">
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send to GatorAI"
            className="min-h-9 min-w-9 shrink-0 rounded-lg bg-purple-900 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? <FaSpinner className="w-3.5 h-3.5 animate-spin" /> : <FaPaperPlane className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-1">Starting point</div>
          <div className="flex flex-wrap gap-1.5">
            {origins.filter((o) => o.id !== 'origin-current').map((o) => (
              <button key={o.id} type="button" aria-pressed={originId === o.id} onClick={() => setOriginId(originId === o.id ? '' : o.id)} className={chip(originId === o.id)}>
                {o.icon} {o.shortName}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-1">Destination</div>
          <div className="flex flex-wrap gap-1.5">
            {SFSU_ACCESSIBLE_CORRIDORS.map((c) => (
              <button key={c.id} type="button" aria-pressed={corridorId === c.id} onClick={() => setCorridorId(corridorId === c.id ? '' : c.id)} className={chip(corridorId === c.id)}>
                {c.title}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-1">Conditions</div>
          <div className="flex flex-wrap gap-1.5">
            {NAVIGATOR_CONDITIONS.map((c) => (
              <button key={c.id} type="button" aria-pressed={conditions.includes(c.id)} onClick={() => toggleCondition(c.id)} className={chip(conditions.includes(c.id))}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite">
        {error && <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {response && !error && (
          <div className="text-xs text-slate-800 bg-white border border-purple-200 rounded-lg px-3 py-2 space-y-1.5">
            <p>{response.reply}</p>
            {response.places.length > 0 && (
              <ul className="space-y-1">
                {response.places.map((p) => (
                  <li key={p.title}>
                    {p.uri ? (
                      <a href={p.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-blue-800 underline">
                        {p.title} <FaArrowUpRightFromSquare className="w-2.5 h-2.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="font-bold">{p.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
