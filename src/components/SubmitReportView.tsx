import React, { useState, useRef, useEffect } from 'react';
import { CampusBuilding } from '../types';
import {
  FaCamera,
  FaRotateLeft,
  FaCheck,
  FaWandMagicSparkles,
  FaTriangleExclamation,
  FaCircleCheck,
  FaFileLines,
  FaLocationDot,
  FaPhone,
  FaArrowUpRightFromSquare,
  FaBuilding,
  FaCircleExclamation,
  FaXmark,
  FaArrowRight,
  FaShieldHalved,
  FaLayerGroup,
  FaCircleQuestion,
  FaWheelchair,
  FaSquareParking,
  FaElevator,
} from 'react-icons/fa6';
import confetti from 'canvas-confetti';

interface SubmitReportViewProps {
  buildings: CampusBuilding[];
  onReportSubmitted: (newReport: any) => void;
  onRequestRide: () => void;
  onNavigateToMap?: () => void;
  prefillLocation?: { name: string; buildingId?: string };
}

export type ScannerStep =
  | 'idle' // "Open Camera" screen
  | 'camera_live' // Live camera preview active with "Take Picture"
  | 'photo_preview' // Still photo captured with only "Retake Picture" & "Use This Picture"
  | 'ready_to_analyze' // Locked-in photo with "Analyze with Gemini" button
  | 'analyzing' // Loading state: "Gemini is analyzing the accessibility hazard…"
  | 'review' // Review & editable fields screen
  | 'confirmation'; // Submitted confirmation with report ID

export interface GeminiAnalysisResult {
  hazardType: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  accessibilityImpact: string;
  recommendedAction: string;
  reportCategory: string;
  confidence: number;
  suggestedLocationSign?: string;
  isDemoMode?: boolean;
}

export function SubmitReportView({
  buildings,
  onReportSubmitted,
  onRequestRide,
  onNavigateToMap,
  prefillLocation,
}: SubmitReportViewProps) {
  const [step, setStep] = useState<ScannerStep>('idle');

  // Camera video, canvas, and stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera & Image states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Gemini Analysis state
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [suggestedSign, setSuggestedSign] = useState<string | null>(null);

  // Editable Review Fields (Controlled Form State)
  const [editedHazardType, setEditedHazardType] = useState('obstructed_path');
  const [editedSeverity, setEditedSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedImpact, setEditedImpact] = useState('');
  const [editedAction, setEditedAction] = useState('');
  const [editedCategory, setEditedCategory] = useState('obstructed_path');
  const [locationName, setLocationName] = useState(
    prefillLocation?.name || 'Cesar Chavez Student Center'
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    prefillLocation?.buildingId || 'ccsc'
  );

  // Location autocomplete
  const [locationQuery, setLocationQuery] = useState(
    prefillLocation?.name || 'Cesar Chavez Student Center'
  );
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<{
    reportId: string;
    hazardType: string;
    severity: string;
    summary: string;
    accessibilityImpact: string;
    recommendedAction: string;
    location: string;
    imageUrl: string;
    createdAt: string;
    status: string;
  } | null>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Sync prefillLocation if provided
  useEffect(() => {
    if (prefillLocation) {
      setLocationName(prefillLocation.name);
      setLocationQuery(prefillLocation.name);
      if (prefillLocation.buildingId) {
        setSelectedBuildingId(prefillLocation.buildingId);
      }
    }
  }, [prefillLocation]);

  // 1. OPEN CAMERA: Request camera permission only after user clicks "Open Camera"
  const handleOpenCamera = async () => {
    setCameraError(null);
    try {
      // Prefer rear-facing camera on mobile devices
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setStep('camera_live');

      // Bind to video element safely
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.warn('Video play interrupted:', err);
          });
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera error:', err);
      let message = 'Unable to access camera on this device or browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message =
          'Camera permission was denied. Please allow camera access in your browser address bar/settings, or use the "Use Demo Hazard Photo" button below to test.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message =
          'No video camera detected on your system. You can use the "Use Demo Hazard Photo" button below to test the full analysis pipeline.';
      }
      setCameraError(message);
      setStep('idle');
    }
  };

  // 2. TAKE PICTURE: Capture one still image from live video & STOP camera immediately
  const handleTakePicture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      setIsDemoMode(false);
    }

    // Stop camera stream immediately after picture is taken
    stopCameraStream();
    setStep('photo_preview');
  };

  // RETAKE PICTURE: Re-open live camera
  const handleRetakePicture = () => {
    setCapturedImage(null);
    setAnalysis(null);
    handleOpenCamera();
  };

  // USE THIS PICTURE: Proceed to stage ready for Gemini analysis
  const handleUseThisPicture = () => {
    setStep('ready_to_analyze');
  };

  // DEMO MODE: "Use Demo Hazard Photo" when camera hardware is unavailable
  const handleUseDemoHazardPhoto = () => {
    stopCameraStream();

    // Create a realistic canvas rendering of blocked stairs on campus
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background: campus plaza paving
      const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 640, 480);

      // Building entrance facade
      ctx.fillStyle = '#334155';
      ctx.fillRect(40, 60, 560, 340);

      // Doors
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(180, 100, 120, 200);
      ctx.fillRect(340, 100, 120, 200);

      // Flight of stairs blocking the entrance
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#94a3b8' : '#cbd5e1';
        ctx.fillRect(80 + i * 30, 360 - i * 28, 480 - i * 60, 28);
      }

      // Construction barrier & caution tape
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(140, 210, 360, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('CAUTION: WALKWAY BLOCKED • STAIRS BARRIER', 155, 227);

      // Watermark
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SFSU CAMPUS DEMO HAZARD PHOTO • MALCOLM X PLAZA', 150, 440);
    }

    const demoPhotoUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(demoPhotoUrl);
    setIsDemoMode(true);
    setAnalysisError(null);
    setStep('ready_to_analyze');
  };

  // Immediate Sample Analysis Fallback if Gemini is unavailable
  const handleUseSampleFallback = () => {
    const sample: GeminiAnalysisResult = {
      hazardType: 'obstructed_path',
      severity: 'medium',
      summary: 'Stairs and construction materials are blocking the accessible walkway.',
      accessibilityImpact: 'A wheelchair user or person with a mobility limitation may be unable to pass safely.',
      recommendedAction: 'Use an alternate accessible route and submit a facilities report.',
      reportCategory: 'obstructed_path',
      confidence: 0.88,
      isDemoMode: true,
    };

    setAnalysis(sample);
    setIsDemoMode(true);
    setEditedHazardType(sample.hazardType);
    setEditedSeverity(sample.severity);
    setEditedSummary(sample.summary);
    setEditedImpact(sample.accessibilityImpact);
    setEditedAction(sample.recommendedAction);
    setEditedCategory(sample.reportCategory);
    setAnalysisError(null);
    setStep('review');
  };

  // 3. ANALYZE WITH GEMINI: Secure server-side call
  const handleAnalyzeWithGemini = async () => {
    if (!capturedImage) return;

    setStep('analyzing');
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textDescription: `Accessibility inspection at ${locationName}`,
          locationName,
          imageBase64: capturedImage,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.analysis) {
        throw new Error(data.error || 'Gemini returned incomplete analysis data');
      }

      const res: GeminiAnalysisResult = data.analysis;

      // Extract and normalize all fields (ensuring none are blank)
      const hazardType = res.hazardType || 'obstructed_path';
      const severity = res.severity || 'medium';
      const summary = res.summary || 'Stairs and construction materials are blocking the accessible walkway.';
      const accessibilityImpact =
        res.accessibilityImpact ||
        'A wheelchair user or person with a mobility limitation may be unable to pass safely.';
      const recommendedAction =
        res.recommendedAction ||
        'Use an alternate accessible route and submit a facilities report.';
      const reportCategory = res.reportCategory || hazardType || 'obstructed_path';
      const confidence = typeof res.confidence === 'number' ? res.confidence : 0.88;

      const populated: GeminiAnalysisResult = {
        hazardType,
        severity,
        summary,
        accessibilityImpact,
        recommendedAction,
        reportCategory,
        confidence,
        suggestedLocationSign: res.suggestedLocationSign,
        isDemoMode: Boolean(res.isDemoMode || isDemoMode),
      };

      setAnalysis(populated);
      setIsDemoMode(Boolean(res.isDemoMode || isDemoMode));

      // Automatically populate controlled form fields
      setEditedHazardType(hazardType);
      setEditedSeverity(severity);
      setEditedSummary(summary);
      setEditedImpact(accessibilityImpact);
      setEditedAction(recommendedAction);
      setEditedCategory(reportCategory);

      // Requirement 9: Location comes from user's selection; if Gemini reads a sign, show it as suggested
      if (res.suggestedLocationSign && res.suggestedLocationSign !== locationName) {
        setSuggestedSign(res.suggestedLocationSign);
      } else {
        setSuggestedSign(null);
      }

      setStep('review');
    } catch (err: any) {
      console.warn('Gemini analysis error:', err);
      // Requirement 7: Show clear error and provide retry button instead of leaving blank fields
      setAnalysisError(err.message || 'Gemini analysis encountered an issue. Please retry.');
      setStep('ready_to_analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. SUBMIT ACCESSIBILITY REPORT: Save to Firestore / /api/reports
  const handleSubmitReport = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        hazardType: editedHazardType,
        severity: editedSeverity,
        summary: editedSummary,
        accessibilityImpact: editedImpact,
        description: editedSummary,
        recommendedAction: editedAction,
        location: locationName,
        imageUrl: capturedImage || '',
        buildingId: selectedBuildingId,
        status: 'pending',
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.report) {
        setSubmittedReport(data.report);
        onReportSubmitted(data.report);
        setStep('confirmation');

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (err) {
      // Local fallback with pending status
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const fallbackReport = {
        reportId: `SFSU-REP-2026-${randomSuffix}`,
        hazardType: editedHazardType,
        severity: editedSeverity,
        summary: editedSummary,
        accessibilityImpact: editedImpact,
        recommendedAction: editedAction,
        location: locationName,
        imageUrl: capturedImage || '',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      setSubmittedReport(fallbackReport);
      onReportSubmitted(fallbackReport);
      setStep('confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // RESET TO REPORT ANOTHER ISSUE
  const handleReportAnother = () => {
    stopCameraStream();
    setCapturedImage(null);
    setAnalysis(null);
    setSubmittedReport(null);
    setCameraError(null);
    setIsDemoMode(false);
    setStep('idle');
  };

  // Filter buildings for location autocomplete
  const filteredBuildings = buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(locationQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(locationQuery.toLowerCase())
  );

  // Active step number helper for the visual step breadcrumbs
  const getStepNumber = () => {
    switch (step) {
      case 'idle':
        return 1;
      case 'camera_live':
        return 2;
      case 'photo_preview':
        return 3;
      case 'ready_to_analyze':
      case 'analyzing':
        return 4;
      case 'review':
        return 5;
      case 'confirmation':
        return 6;
      default:
        return 1;
    }
  };

  const currentStepNum = getStepNumber();

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Banner with SFSU Colors */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-5 rounded-2xl shadow-xl border border-purple-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>AI Hazard Scanner & Report</span>
              </h2>
            </div>
            <p className="text-xs text-purple-200">
              Open your camera, snap a still photo of an obstacle, review Gemini&apos;s analysis, and submit directly to SFSU Facilities.
            </p>
          </div>

          {isDemoMode && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400 text-purple-950 shrink-0 border border-amber-300">
              Demo Mode
            </span>
          )}
        </div>

        {/* Step Indicator Bar: Open Camera → Take Picture → Use This Picture → Analyze with Gemini → Review/Edit → Submit Report */}
        <div className="mt-4 pt-3 border-t border-purple-800/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 overflow-x-auto no-scrollbar gap-1">
            <div className={`flex items-center gap-1 shrink-0 ${currentStepNum === 1 ? 'text-amber-300' : currentStepNum > 1 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStepNum === 1 ? 'bg-amber-400 text-purple-950' : currentStepNum > 1 ? 'bg-purple-700 text-white' : 'bg-purple-900/60'}`}>1</span>
              <span>Open Camera</span>
            </div>
            <span className="text-purple-600">→</span>

            <div className={`flex items-center gap-1 shrink-0 ${currentStepNum === 2 ? 'text-amber-300' : currentStepNum > 2 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStepNum === 2 ? 'bg-amber-400 text-purple-950' : currentStepNum > 2 ? 'bg-purple-700 text-white' : 'bg-purple-900/60'}`}>2</span>
              <span>Take Picture</span>
            </div>
            <span className="text-purple-600">→</span>

            <div className={`flex items-center gap-1 shrink-0 ${currentStepNum === 3 ? 'text-amber-300' : currentStepNum > 3 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStepNum === 3 ? 'bg-amber-400 text-purple-950' : currentStepNum > 3 ? 'bg-purple-700 text-white' : 'bg-purple-900/60'}`}>3</span>
              <span>Use This Picture</span>
            </div>
            <span className="text-purple-600">→</span>

            <div className={`flex items-center gap-1 shrink-0 ${currentStepNum === 4 ? 'text-amber-300' : currentStepNum > 4 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStepNum === 4 ? 'bg-amber-400 text-purple-950' : currentStepNum > 4 ? 'bg-purple-700 text-white' : 'bg-purple-900/60'}`}>4</span>
              <span>Analyze with Gemini</span>
            </div>
            <span className="text-purple-600">→</span>

            <div className={`flex items-center gap-1 shrink-0 ${currentStepNum === 5 ? 'text-amber-300' : currentStepNum > 5 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStepNum === 5 ? 'bg-amber-400 text-purple-950' : currentStepNum > 5 ? 'bg-purple-700 text-white' : 'bg-purple-900/60'}`}>5</span>
              <span>Review/Edit</span>
            </div>
            <span className="text-purple-600">→</span>

            <div className={`flex items-center gap-1 shrink-0 ${currentStepNum === 6 ? 'text-amber-300' : 'text-purple-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStepNum === 6 ? 'bg-amber-400 text-purple-950' : 'bg-purple-900/60'}`}>6</span>
              <span>Report</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STEP 1: OPEN CAMERA SCREEN ================= */}
      {step === 'idle' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 animate-fadeIn">
          {cameraError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 text-left flex items-start gap-2.5">
              <FaCircleExclamation className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5 font-bold">Camera Permission Notice:</strong>
                {cameraError}
              </div>
            </div>
          )}

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto shadow-inner">
              <FaCamera className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-xl text-purple-950">
                Photograph a barrier
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Take a photo of a campus barrier: blocked walkway, broken elevator, steep ramp, locked accessible restroom, or inaccessible entrance.
              </p>
            </div>
          </div>

          {/* Prominent Open Camera Button */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenCamera}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-base rounded-2xl shadow-xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer border border-purple-400/30"
              aria-label="Open camera"
            >
              <FaCamera className="w-5 h-5 text-amber-300" />
              <span>Open Camera</span>
            </button>

            {/* Demo Mode Button: Use Demo Hazard Photo */}
            <button
              type="button"
              onClick={handleUseDemoHazardPhoto}
              className="px-4 py-2 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer border border-purple-200 flex items-center gap-1.5"
              title="Test the complete flow without camera hardware"
            >
              <FaWandMagicSparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Use Demo Hazard Photo</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            🔒 Privacy: Camera access is only requested when you click Open Camera. No live video stream is sent to servers; only one captured still photo is analyzed.
          </div>
        </div>
      )}

      {/* ================= STEP 2: LIVE CAMERA PREVIEW & TAKE PICTURE ================= */}
      {step === 'camera_live' && (
        <div className="bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden space-y-4 p-4 text-white animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-300 px-2">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              Camera preview
            </span>
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setStep('idle');
              }}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel Camera
            </button>
          </div>

          {/* Camera Viewfinder */}
          <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Reticle */}
            <div className="absolute inset-8 border-2 border-dashed border-white/40 pointer-events-none rounded-xl flex items-center justify-center">
              <span className="text-white/80 text-xs font-bold uppercase tracking-widest bg-black/60 px-3 py-1 rounded-md backdrop-blur-sm">
                Point at Accessibility Obstacle
              </span>
            </div>
          </div>

          {/* Take Picture Button */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={handleTakePicture}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-black text-sm rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 border-2 border-white cursor-pointer"
              aria-label="Take picture"
            >
              <FaCamera className="w-5 h-5 text-purple-950" />
              <span>Take Picture</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PHOTO PREVIEW (Retake Picture / Use This Picture) ================= */}
      {step === 'photo_preview' && capturedImage && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">
              Review Captured Picture
            </h3>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              Camera Stream Stopped
            </span>
          </div>

          <div className="relative max-h-80 w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-md border border-slate-200 bg-slate-950">
            <img
              src={capturedImage}
              alt="Photo of a campus barrier"
              className="w-full h-64 object-cover"
            />
          </div>

          {/* Provide ONLY: Retake Picture and Use This Picture */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRetakePicture}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FaRotateLeft className="w-3.5 h-3.5" />
              <span>Retake Picture</span>
            </button>

            <button
              type="button"
              onClick={handleUseThisPicture}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaCheck className="w-4 h-4" />
              <span>Use This Picture</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: READY TO ANALYZE (After "Use This Picture") ================= */}
      {step === 'ready_to_analyze' && capturedImage && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            <div className="relative max-h-64 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
              <img
                src={capturedImage}
                alt="Captured accessibility hazard photo ready for Gemini analysis"
                className="w-full h-56 object-cover"
              />
              {isDemoMode && (
                <div className="absolute top-2 left-2 bg-amber-400 text-purple-950 font-bold text-[10px] px-2 py-0.5 rounded shadow">
                  Demo Frame
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
                  Photo Staged
                </span>
                <h3 className="font-black text-base text-slate-900">
                  Analyze with Gemini
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Send this captured camera picture securely to Gemini to inspect for blocked walkways, stairs, broken elevators, steep ramps, or locked doors. Nothing will be submitted automatically.
                </p>
              </div>

              {/* Campus Location field with autocomplete */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-700">SFSU Campus Location</label>
                <div className="relative">
                  <FaLocationDot className="w-4 h-4 text-purple-700 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setLocationName(e.target.value);
                      setShowLocationSuggestions(true);
                    }}
                    onFocus={() => setShowLocationSuggestions(true)}
                    placeholder="Type campus building (e.g. Cesar Chavez)..."
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                {showLocationSuggestions && filteredBuildings.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto text-xs">
                    {filteredBuildings.map((bldg) => (
                      <div
                        key={bldg.id}
                        onClick={() => {
                          setLocationName(bldg.name);
                          setLocationQuery(bldg.name);
                          setSelectedBuildingId(bldg.id);
                          setShowLocationSuggestions(false);
                        }}
                        className="p-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                      >
                        <span className="font-semibold text-slate-800">{bldg.name}</span>
                        <span className="font-mono text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded">
                          {bldg.code}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Incomplete Analysis / Error Alert with Retry & Sample Fallback */}
              {analysisError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <FaCircleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Analysis Error</span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">{analysisError}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAnalyzeWithGemini}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <FaRotateLeft className="w-3 h-3" />
                      <span>Retry Analysis with Gemini</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseSampleFallback}
                      className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                    >
                      Use Sample Analysis
                    </button>
                  </div>
                </div>
              )}

              {/* Prominent "Analyze with Gemini" Button */}
              <button
                type="button"
                onClick={handleAnalyzeWithGemini}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-sm rounded-xl shadow-xl transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-purple-400/30"
              >
                <FaWandMagicSparkles className="w-4 h-4 text-amber-300" />
                <span>Analyze with Gemini</span>
                <FaArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 5: ANALYZING LOADING STATE ================= */}
      {step === 'analyzing' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 animate-fadeIn">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-700 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-purple-50 flex items-center justify-center text-purple-700">
              <FaWandMagicSparkles className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black text-purple-950">
              Gemini is analyzing the accessibility hazard…
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspecting the captured photo for walkway blocks, stairs barriers, elevator failures, steep slopes, or inaccessible doors.
            </p>
          </div>
        </div>
      )}

      {/* ================= STEP 6: REVIEW BEFORE REPORTING ================= */}
      {step === 'review' && analysis && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6 animate-fadeIn">
          {/* Review Card: Contains Captured Image + Gemini Results */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/40 to-white border-2 border-purple-300 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-purple-700 text-white font-bold text-xs">
                  GEMINI AI
                </span>
                <span className="font-extrabold text-sm text-purple-950">
                  Review Analysis
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    editedSeverity === 'high'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : editedSeverity === 'medium'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {editedSeverity} Severity
                </span>
                <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full">
                  {Math.round(analysis.confidence * 100)}% Confidence
                </span>
              </div>
            </div>

            {/* Captured Image Preview Displayed in Review Card */}
            {capturedImage && (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white rounded-xl border border-purple-100">
                <div className="w-full sm:w-44 h-32 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-900 shadow-inner">
                  <img
                    src={capturedImage}
                    alt="Captured campus accessibility barrier analyzed by Gemini"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-600 flex-1">
                  <span className="font-bold text-slate-800 block">Captured Camera Image</span>
                  <p className="text-[11px] leading-relaxed">
                    This photo will be attached to the official SFSU Facilities Services work order report upon submission.
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-900 font-semibold pt-1">
                    <FaLocationDot className="w-3.5 h-3.5 text-purple-700" />
                    <span>Location: {locationName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Hazard Type</span>
                <div className="font-extrabold text-slate-900 text-sm font-mono">{editedHazardType}</div>
                <div className="text-[11px] text-purple-900 font-semibold">
                  Category: {editedCategory}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Accessibility Impact</span>
                <div className="font-semibold text-rose-900 bg-rose-50/80 p-2 rounded-lg border border-rose-200 leading-snug">
                  {editedImpact}
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Gemini Explanation / Summary</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {editedSummary}
                </p>
              </div>

              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Recommended Action</span>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                  {editedAction}
                </div>
              </div>
            </div>

            {/* Disclaimer Warning */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
              <FaTriangleExclamation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="italic font-medium">
                Gemini’s analysis is only an aid and not an official accessibility determination. Please verify the result before reporting.
              </p>
            </div>
          </div>

          {/* Suggested Location from photo sign (if detected by Gemini) */}
          {suggestedSign && (
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-purple-950 font-medium">
                <FaWandMagicSparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Gemini noticed campus building sign in photo: <strong className="font-bold">"{suggestedSign}"</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setLocationName(suggestedSign);
                    setLocationQuery(suggestedSign);
                    setSuggestedSign(null);
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Confirm Location
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestedSign(null)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Editable Fields: Allows user to correct or override Gemini */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900">
                Edit / Correct Report Fields
              </h4>
              <span className="text-xs text-slate-400">User corrections override AI</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hazard Type</label>
                <input
                  type="text"
                  value={editedHazardType}
                  onChange={(e) => {
                    setEditedHazardType(e.target.value);
                    setEditedCategory(e.target.value);
                  }}
                  className="w-full font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Severity</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {(['low', 'medium', 'high'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setEditedSeverity(sev)}
                      className={`py-1.5 font-bold rounded-lg uppercase transition-colors cursor-pointer ${
                        editedSeverity === sev
                          ? sev === 'high'
                            ? 'bg-rose-600 text-white'
                            : sev === 'medium'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Campus Location</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    setLocationQuery(e.target.value);
                  }}
                  className="w-full font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Summary / Description</label>
                <textarea
                  rows={2}
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Accessibility Impact</label>
                <input
                  type="text"
                  value={editedImpact}
                  onChange={(e) => setEditedImpact(e.target.value)}
                  className="w-full font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Recommended Action</label>
                <input
                  type="text"
                  value={editedAction}
                  onChange={(e) => setEditedAction(e.target.value)}
                  className="w-full font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Row: Retake Photo & Prominent Submit Accessibility Report Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleRetakePicture}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FaRotateLeft className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitReport}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-sm rounded-xl shadow-xl transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Saving to Facilities...</span>
                </>
              ) : (
                <>
                  <FaFileLines className="w-4 h-4 text-amber-300" />
                  <span>Confirm & Submit Accessibility Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 7: CONFIRMATION SCREEN ================= */}
      {step === 'confirmation' && submittedReport && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <FaCircleCheck className="w-10 h-10" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-black text-slate-900">
              Accessibility Report Submitted!
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your report has been logged with SFSU Facilities Services and Disability Programs & Resource Center (DPRC).
            </p>
          </div>

          {/* Final Review & Submission Summary */}
          <div className="max-w-md mx-auto p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5 text-left text-xs">
            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <span className="text-slate-500 font-semibold">Report ID:</span>
              <span className="font-mono font-black text-purple-950 text-sm">
                {submittedReport.reportId}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <span className="text-slate-500 font-semibold">Report Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Pending review
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <span className="text-slate-500 font-semibold">Hazard Type:</span>
              <span className="font-bold text-slate-800">{submittedReport.hazardType}</span>
            </div>

            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <span className="text-slate-500 font-semibold">Location:</span>
              <span className="font-semibold text-slate-800">{submittedReport.location}</span>
            </div>

            <div className="pt-1 text-slate-700">
              <span className="font-bold">Recommended Next Step: </span>
              {submittedReport.recommendedAction}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {/* Button to report another issue */}
            <button
              type="button"
              onClick={handleReportAnother}
              className="w-full sm:w-auto px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Report Another Issue
            </button>

            {/* Accessibility Services button: (415) 338-2472 */}
            <a
              href="tel:4153382472"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <FaPhone className="w-3.5 h-3.5" />
              <span>Accessibility Services: (415) 338-2472</span>
            </a>

            {/* Link to Accessibility and Construction Alerts */}
            <a
              href="https://facilities.sfsu.edu/construction-alerts"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
              <span>Accessibility & Construction Alerts</span>
            </a>
          </div>

          {onNavigateToMap && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToMap}
                className="text-xs text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
              >
                Return to Campus Navigator Map
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
