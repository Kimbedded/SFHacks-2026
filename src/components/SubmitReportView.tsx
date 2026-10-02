import React, { useState, useRef } from 'react';
import { CampusBuilding, AIAnalysisResult, HazardCategory } from '../types';
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Phone,
  RefreshCw,
} from 'lucide-react';

interface SubmitReportViewProps {
  buildings: CampusBuilding[];
  onReportSubmitted: (newReport: any) => void;
  onRequestRide: () => void;
  prefillLocation?: { name: string; buildingId?: string };
}

// 4 realistic test demo samples for hackathon evaluation
const DEMO_PRESETS = [
  {
    title: 'Broken Elevator Atrium Display',
    category: 'broken_elevator' as HazardCategory,
    locationName: 'Cesar Chavez Student Center North Wing',
    buildingId: 'ccsc',
    description: 'Elevator door stuck open on Floor 2 with blinking error E-19. Button panel unlit.',
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Steep Amphitheater Ramp Grade',
    category: 'steep_slope' as HazardCategory,
    locationName: 'Fine Arts West Sloped Walkway',
    buildingId: 'fine_arts',
    description: 'Ramp slope feels excessively steep and slippery in the morning fog. Wheelchair anti-tippers hit concrete.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Fallen Tree Branch Blocking Quad Ramp',
    category: 'obstructed_path' as HazardCategory,
    locationName: 'Between Malcolm X Plaza & Library North Lawn',
    buildingId: 'library',
    description: 'Storm debris and construction fencing blocking the wheelchair ramp towards Peet’s.',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156f?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Disabled Blue Push-Plate Opener',
    category: 'broken_power_door' as HazardCategory,
    locationName: 'J. Paul Leonard Library Main Entrance',
    buildingId: 'library',
    description: 'Exterior ADA power-door actuator button does not trigger sliding doors.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
  },
];

export function SubmitReportView({
  buildings,
  onReportSubmitted,
  onRequestRide,
  prefillLocation,
}: SubmitReportViewProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [locationName, setLocationName] = useState(prefillLocation?.name || '');
  const [selectedBuildingId, setSelectedBuildingId] = useState(prefillLocation?.buildingId || '');
  const [category, setCategory] = useState<HazardCategory>('obstructed_path');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load a demo preset
  const handleSelectPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setLocationName(preset.locationName);
    setSelectedBuildingId(preset.buildingId);
    setDescription(preset.description);
    setPhotoPreview(preset.imageUrl);
    setPhotoBase64(null); // will use image URL or text description for analysis
    setSubmittedTicket(null);
    setAiAnalysis(null);

    // Automatically trigger AI analysis
    runAiAnalysis({
      textDescription: `${preset.title}: ${preset.description}`,
      locationName: preset.locationName,
      imageUrl: preset.imageUrl,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result);
      setSubmittedTicket(null);

      // Auto analyze uploaded photo
      runAiAnalysis({
        textDescription: description || 'Hazard photo uploaded by student',
        locationName: locationName || 'SFSU Campus',
        imageBase64: result,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const runAiAnalysis = async (params: {
    textDescription?: string;
    locationName?: string;
    imageBase64?: string;
    mimeType?: string;
    imageUrl?: string;
  }) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      const response = await fetch('/api/analyze-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textDescription: params.textDescription || description,
          locationName: params.locationName || locationName,
          imageBase64: params.imageBase64 || photoBase64,
          mimeType: params.mimeType || photoMime,
        }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
        if (!title && data.analysis.detectedHazard) {
          setTitle(data.analysis.detectedHazard);
        }
      }
    } catch (err) {
      console.error('AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !description) return;

    setIsSubmitting(true);
    try {
      const building = buildings.find((b) => b.id === selectedBuildingId);
      const coords = building ? building.coordinates : { lat: 37.7238, lng: -122.4785 };

      const payload = {
        title: title || aiAnalysis?.detectedHazard || 'Accessibility Hazard',
        description,
        category,
        locationName: locationName || building?.name || 'SFSU Campus',
        buildingId: selectedBuildingId,
        coordinates: coords,
        urgency: aiAnalysis?.suggestedPriority || 'high',
        photoUrl: photoPreview,
        aiAnalysis,
        reporterName: reporterName || 'SFSU Student',
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setSubmittedTicket(data.report);
        onReportSubmitted(data.report);
      }
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-6 rounded-2xl shadow-xl border border-purple-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-400 text-purple-950 font-bold">
                <Camera className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                Live Barrier Scanner & Work Order Dispatch
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-purple-200 leading-relaxed max-w-2xl">
              Snap or upload a photo of stairs, blocked ramps, broken elevators, or locked doors.
              Gemini AI calculates slope grade, assesses ADA compliance, and creates an official SFSU Facilities repair order.
            </p>
          </div>

          <button
            onClick={onRequestRide}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <span>Need A Ride Now?</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Demo Strip for Judges */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-700" />
            Quick Demo Presets (Instant Multimodal AI Testing):
          </span>
          <span className="text-[11px] text-purple-700 font-semibold">1-Click Test</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DEMO_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50/50 text-left transition-all hover:scale-[1.02] active:scale-95 group shadow-2xs"
            >
              <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-slate-200 relative">
                <img
                  src={preset.imageUrl}
                  alt={preset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                  {preset.category.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="font-bold text-xs text-slate-900 group-hover:text-purple-950 truncate">
                {preset.title}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{preset.locationName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Photo Upload & Camera */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Photo Evidence (Gemini Vision Analysis)
            </label>

            {/* Photo Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full h-64 rounded-2xl border-2 border-dashed border-purple-300 hover:border-purple-600 bg-purple-50/30 hover:bg-purple-50/60 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-4 transition-all group"
            >
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Hazard Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-2">
                    <Camera className="w-5 h-5" /> Change Photo
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-purple-950">Tap to snap or upload hazard photo</div>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Gemini AI will inspect the photo to measure ramp slope %, detect blocked paths, and diagnose elevator error codes.
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Re-analyze button if photo exists */}
            {photoPreview && (
              <button
                type="button"
                onClick={() =>
                  runAiAnalysis({
                    textDescription: description,
                    locationName,
                    imageBase64: photoBase64 || undefined,
                  })
                }
                disabled={isAnalyzing}
                className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Re-Analyze with Gemini AI</span>
              </button>
            )}
          </div>

          {/* Right Column: Location & Issue Details */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Hazard Information
            </label>

            {/* Campus Building Autocomplete / Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">SFSU Building / Area</label>
              <select
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  const b = buildings.find((item) => item.id === e.target.value);
                  if (b) setLocationName(b.name);
                }}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
              >
                <option value="">Select building or campus landmark...</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Exact Specific Location Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Specific Location / Spot</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-700 absolute left-3 top-3" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. North Atrium Elevator, Malcolm X Plaza ramp, 3rd floor restroom"
                  className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Hazard Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Hazard Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HazardCategory)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
              >
                <option value="broken_elevator">Broken Elevator / Vertical Lift</option>
                <option value="obstructed_path">Obstructed Pathway / Fallen Object / Construction</option>
                <option value="steep_slope">Steep Slope / Non-ADA Ramp Grade</option>
                <option value="locked_door">Locked ADA Entrance / Heavy Manual Door</option>
                <option value="broken_power_door">Broken Blue ADA Power-Plate Opener</option>
                <option value="restroom_inaccessible">Inaccessible Restroom / Broken Grab Bar</option>
                <option value="auditory_visual_alert">Auditory / Visual Alert Failure</option>
                <option value="construction_detour">Construction Detour Missing Accessible Signage</option>
                <option value="other">Other Barrier</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description (Natural Language)</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you see without worrying about technical terms. e.g. Elevator is stuck on 2nd floor, or ramp is way too steep for my wheelchair."
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* AI Analysis Live Card */}
        {isAnalyzing && (
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center space-x-3 text-xs text-purple-900">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <span className="font-bold">Gemini Multimodal AI is inspecting your report...</span>
              <p className="text-[11px] text-purple-700">
                Measuring ramp slope angle, evaluating ADA Title II compliance, and formulating Facilities Work Order...
              </p>
            </div>
          </div>
        )}

        {aiAnalysis && !isAnalyzing && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border-2 border-purple-300 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-black text-purple-950 uppercase tracking-wide">
                  Gemini AI ADA Diagnostic & Facilities Draft
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  aiAnalysis.suggestedPriority === 'critical'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                Suggested Priority: {aiAnalysis.suggestedPriority}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Detected Barrier</span>
                <div className="font-bold text-slate-900">{aiAnalysis.detectedHazard}</div>
                <p className="text-[11px] text-slate-600">{aiAnalysis.hazardDescription}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">ADA Compliance Code</span>
                <div className="font-bold text-purple-950 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>{aiAnalysis.adaCodeReference || 'ADA Title II Section 35.150'}</span>
                </div>
                {aiAnalysis.slopeGradePercentage !== null && aiAnalysis.slopeGradePercentage !== undefined && (
                  <div className="text-[11px] font-extrabold text-rose-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Estimated Slope: {aiAnalysis.slopeGradePercentage}% (ADA Max is 8.33%)</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-600">
                  Trade: <span className="font-semibold">{aiAnalysis.suggestedWorkOrderType}</span> ({aiAnalysis.estimatedFixEffort})
                </div>
              </div>
            </div>

            {/* Suggested Alternative Detour */}
            <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Recommended Accessible Alternative Detour:</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                {aiAnalysis.suggestedDetour}
              </p>
            </div>
          </div>
        )}

        {/* Successful Submission Ticket Modal / Box */}
        {submittedTicket && (
          <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-black text-sm text-emerald-950">
                    SFSU Facilities Work Order Dispatched!
                  </h3>
                  <div className="font-mono text-xs font-bold text-emerald-800">
                    Ticket #{submittedTicket.facilitiesWorkOrderId}
                  </div>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-600 text-white shadow-sm">
                Status: Triaged & Assigned
              </span>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              Thank you for keeping SF State accessible. Your report has been dispatched to SFSU Facilities Services Corporation Yard and logged with DPRC. Real-time status updates will appear on the Elevators & Work Orders board.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onRequestRide}
                className="py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
              >
                <span>Request Gator Mobility Pickup</span>
              </button>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Reports are shared in real-time with SFSU DPRC & Facilities Dispatch.
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting || isAnalyzing}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Dispatching Work Order...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Submit to SFSU Facilities Queue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
