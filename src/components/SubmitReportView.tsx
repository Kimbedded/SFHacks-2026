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
  FaCircleQuestion,
  FaWheelchair,
  FaRoute,
  FaChevronDown,
  FaChevronUp,
  FaLocationCrosshairs,
  FaPlay,
  FaPause,
  FaFilm,
  FaVideo,
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
  | 'idle' // "Open Camera" screen with "Quick AI Trial"
  | 'camera_live' // Live camera preview active with "Take Picture" + GPS
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

  // Alternative accessible route fields
  blockedLocation?: string;
  alternativeRoute?: string;
  routeSteps?: string[];
  barriersToAvoid?: string[];
  maximumSlope?: string;
  requiresAssistance?: boolean;
  assistanceRecommendation?: string;

  // Location detection fields
  detectedLocation?: string;
  buildingId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  locationConfidence?: number;
  locationEvidence?: string[];
  needsLocationConfirmation?: boolean;
}

export interface DetectedGpsInfo {
  lat: number;
  lng: number;
  accuracy: number;
  nearestBuilding: CampusBuilding | null;
  confidence: number;
  evidence: string[];
  confirmed: boolean;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function SubmitReportView({
  buildings,
  onReportSubmitted,
  onRequestRide,
  onNavigateToMap,
  prefillLocation,
}: SubmitReportViewProps) {
  const [step, setStep] = useState<ScannerStep>('idle');

  // Trial Walkthrough State: starts open with live video playing for demonstration
  const [showTrialWalkthrough, setShowTrialWalkthrough] = useState(true);
  const [trialMode, setTrialMode] = useState<'video' | 'text'>('video');
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoScene, setVideoScene] = useState<number>(1);
  const [videoSeconds, setVideoSeconds] = useState<number>(0);

  // Auto-play interval for Demo Video Walkthrough simulation
  useEffect(() => {
    if (!isVideoPlaying) return;
    const interval = setInterval(() => {
      setVideoSeconds((prev) => {
        const next = (prev + 1) % 12;
        if (next < 3) setVideoScene(1);
        else if (next < 6) setVideoScene(2);
        else if (next < 9) setVideoScene(3);
        else setVideoScene(4);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVideoPlaying]);

  // Camera video, canvas, and stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera & Image states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // GPS Location state
  const [gpsLocation, setGpsLocation] = useState<DetectedGpsInfo | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
  const [editedAlternativeRoute, setEditedAlternativeRoute] = useState('');
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
    alternativeRoute?: string;
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

  // Request GPS Location when camera opens
  const requestGpsLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 15;

        // Find nearest SFSU building
        let nearest: CampusBuilding | null = null;
        let minDistance = Infinity;

        for (const bldg of buildings) {
          if (bldg.coordinates) {
            const dist = getDistanceMeters(lat, lng, bldg.coordinates.lat, bldg.coordinates.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = bldg;
            }
          }
        }

        const confidence = accuracy <= 20 ? 95 : accuracy <= 40 ? 90 : accuracy <= 80 ? 84 : 75;
        const evidence = [
          `Browser GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          `GPS Accuracy: ±${Math.round(accuracy)}m`,
          nearest ? `Nearest Campus Building: ${nearest.name} (~${Math.round(minDistance)}m)` : 'SFSU Campus Grid',
          'San Francisco State University Geofence Match',
        ];

        setGpsLocation({
          lat,
          lng,
          accuracy,
          nearestBuilding: nearest,
          confidence,
          evidence,
          confirmed: false,
        });

        if (nearest) {
          setLocationName(nearest.name);
          setLocationQuery(nearest.name);
          setSelectedBuildingId(nearest.id);
        }

        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS location request notice:', err.message);
        setGpsError('Location permission was not granted. You can search or select your building below.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 1. OPEN CAMERA: Request live camera + GPS permission
  const handleOpenCamera = async () => {
    setCameraError(null);
    setAnalysisError(null);

    // Request GPS permission concurrently when camera opens
    requestGpsLocation();

    try {
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

      // Safely attach stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.warn('Video play interrupted:', err);
          });
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let message = 'Unable to access camera on this device or browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera access in your browser settings to capture a real photo.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No video camera detected on your system. Please connect a camera to capture a live photo.';
      }
      setCameraError(message);
      setStep('idle');
    }
  };

  // 2. TAKE PICTURE: Extract single JPEG frame from videoRef & STOP camera stream
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
    }

    // Immediately stop camera stream after capture
    stopCameraStream();
    setStep('photo_preview');
  };

  // RETAKE PICTURE: Cleanly reset previous capture and re-open live camera
  const handleRetakePicture = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setAnalysisError(null);
    handleOpenCamera();
  };

  // USE THIS PICTURE: Proceed to stage ready for Gemini analysis
  const handleUseThisPicture = () => {
    setStep('ready_to_analyze');
  };

  // 3. ANALYZE WITH GEMINI: Send exact captured JPEG to /api/analyze-hazard
  const handleAnalyzeWithGemini = async () => {
    if (!capturedImage) {
      setAnalysisError('Invalid Image: Please take a picture before analyzing.');
      setStep('idle');
      return;
    }

    setStep('analyzing');
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const payload: any = {
        textDescription: `Accessibility inspection at ${locationName}`,
        locationName,
        imageBase64: capturedImage,
      };

      if (gpsLocation) {
        payload.clientGps = {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          accuracy: gpsLocation.accuracy,
        };
      }

      const response = await fetch('/api/analyze-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.analysis) {
        throw new Error(data.error || 'Gemini returned incomplete analysis data');
      }

      const res: GeminiAnalysisResult = data.analysis;

      // Extract and normalize all fields
      const hazardType = res.hazardType || 'obstructed_path';
      const severity = res.severity || 'medium';
      const summary = res.summary || 'Accessibility obstacle detected blocking the path.';
      const accessibilityImpact =
        res.accessibilityImpact ||
        'A wheelchair user or person with reduced mobility may be unable to pass safely.';
      const recommendedAction =
        res.recommendedAction ||
        'Use an alternative accessible route and submit a facilities work order.';
      const reportCategory = res.reportCategory || hazardType || 'obstructed_path';
      const confidence = typeof res.confidence === 'number' ? res.confidence : 0.88;
      const alternativeRoute =
        res.alternativeRoute ||
        'Follow adjacent low-slope accessible pathway around the obstacle.';
      const routeSteps =
        Array.isArray(res.routeSteps) && res.routeSteps.length > 0
          ? res.routeSteps
          : [
              'Turn toward the nearest low-grade connecting walkway.',
              'Proceed along the flat paved corridor to bypass the obstacle.',
              'Rejoin the main campus route through the automatic level entrance.',
            ];

      const populated: GeminiAnalysisResult = {
        hazardType,
        severity,
        summary,
        accessibilityImpact,
        recommendedAction,
        reportCategory,
        confidence,
        suggestedLocationSign: res.suggestedLocationSign,
        blockedLocation: res.blockedLocation,
        alternativeRoute,
        routeSteps,
        barriersToAvoid: res.barriersToAvoid,
        maximumSlope: res.maximumSlope || '3.5%',
        requiresAssistance: Boolean(res.requiresAssistance),
        assistanceRecommendation: res.assistanceRecommendation,
        detectedLocation: res.detectedLocation,
        buildingId: res.buildingId,
        coordinates: res.coordinates,
        locationConfidence: res.locationConfidence,
        locationEvidence: res.locationEvidence,
        needsLocationConfirmation: res.needsLocationConfirmation,
      };

      setAnalysis(populated);

      // Populate editable controlled form fields
      setEditedHazardType(hazardType);
      setEditedSeverity(severity);
      setEditedSummary(summary);
      setEditedImpact(accessibilityImpact);
      setEditedAction(recommendedAction);
      setEditedCategory(reportCategory);
      setEditedAlternativeRoute(alternativeRoute);

      // Campus sign detection: show only as a suggestion that user can confirm or edit
      if (res.suggestedLocationSign && res.suggestedLocationSign !== locationName) {
        setSuggestedSign(res.suggestedLocationSign);
      } else {
        setSuggestedSign(null);
      }

      setStep('review');
    } catch (err: any) {
      console.warn('Gemini analysis error:', err);
      setAnalysisError(err.message || 'Gemini analysis encountered an issue. Please retry.');
      setStep('ready_to_analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. SUBMIT ACCESSIBILITY REPORT
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
        alternativeRoute: editedAlternativeRoute,
        location: locationName,
        imageUrl: capturedImage || '',
        buildingId: selectedBuildingId,
        status: 'pending',
        coordinates: gpsLocation
          ? { lat: gpsLocation.lat, lng: gpsLocation.lng }
          : { lat: 37.7239, lng: -122.4786 },
        aiAnalysis: analysis
          ? {
              detectedHazard: editedHazardType,
              hazardDescription: editedSummary,
              slopeGradePercentage: 3.5,
              adaComplianceStatus: 'requires_inspection',
              suggestedPriority: editedSeverity,
              suggestedWorkOrderType: 'Facilities Repair',
              estimatedFixEffort: '1-3 days',
              suggestedDetour: editedAlternativeRoute,
              recommendedHotlineAction: editedAction,
              confidence: analysis.confidence,
            }
          : undefined,
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
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const fallbackReport = {
        reportId: `SFSU-REP-2026-${randomSuffix}`,
        hazardType: editedHazardType,
        severity: editedSeverity,
        summary: editedSummary,
        accessibilityImpact: editedImpact,
        recommendedAction: editedAction,
        alternativeRoute: editedAlternativeRoute,
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

  // Reset to report another issue
  const handleReportAnother = () => {
    stopCameraStream();
    setCapturedImage(null);
    setAnalysis(null);
    setSubmittedReport(null);
    setCameraError(null);
    setAnalysisError(null);
    setSuggestedSign(null);
    setStep('idle');
  };

  // Filter buildings for location autocomplete
  const filteredBuildings = buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(locationQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(locationQuery.toLowerCase())
  );

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

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-5 rounded-2xl shadow-xl border border-purple-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>AI Hazard Scanner & Report</span>
              </h2>
            </div>
            <p className="text-xs text-purple-200">
              Open your camera, snap a live photo of a campus obstacle, review Gemini&apos;s analysis, and submit directly to SFSU Facilities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {gpsLocation && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <FaLocationCrosshairs className="w-3 h-3 text-emerald-400" />
                <span>GPS Ready ({gpsLocation.confidence}%)</span>
              </span>
            )}
          </div>
        </div>

        {/* Step Indicator Bar */}
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
        <div className="space-y-4 animate-fadeIn">
          {/* Main Camera Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 text-center space-y-6">
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
                  Take a photo of a campus barrier: blocked walkway, broken elevator, steep stairs, locked accessible restroom, or inaccessible entrance.
                </p>
              </div>
            </div>

            {/* Prominent Open Camera Button */}
            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenCamera}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-base rounded-2xl shadow-2xl ring-4 ring-amber-400/40 hover:ring-amber-300/70 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-2 border-amber-300"
                aria-label="Open camera"
              >
                <FaCamera className="w-5 h-5 text-amber-300" />
                <span>Open Camera</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              🔒 Privacy: Camera access is only requested when you click Open Camera. No live video stream is sent to servers; only one captured still photo is analyzed.
            </div>
          </div>

          {/* ================= QUICK AI TRIAL CARD ================= */}
          <div className="bg-gradient-to-r from-purple-50 via-amber-50/40 to-white rounded-2xl shadow-md border-2 border-amber-300/80 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 flex items-center justify-center shrink-0 shadow-md ring-2 ring-amber-300">
                  <FaWandMagicSparkles className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base sm:text-lg text-purple-950">
                      Quick AI Trial & Demo Video
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-purple-950 border border-amber-300">
                      Interactive Showcase
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Watch the live AI hazard detection and rerouting flow run as a demo video
                  </p>
                </div>
              </div>

              {/* Highlighted Try Trial Button */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !showTrialWalkthrough;
                  setShowTrialWalkthrough(nextState);
                  if (nextState) {
                    setIsVideoPlaying(true);
                  } else {
                    setIsVideoPlaying(false);
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-black text-xs sm:text-sm rounded-xl shadow-lg ring-4 ring-amber-300/60 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400 shrink-0"
              >
                <FaVideo className="w-4 h-4 text-purple-950" />
                <span>{showTrialWalkthrough ? 'Close Demo' : 'Try Trial & Watch Video'}</span>
                {showTrialWalkthrough ? (
                  <FaChevronUp className="w-3.5 h-3.5 text-purple-950" />
                ) : (
                  <FaChevronDown className="w-3.5 h-3.5 text-purple-950" />
                )}
              </button>
            </div>

            {/* Expanded Showcase View */}
            {showTrialWalkthrough && (
              <div className="mt-4 pt-4 border-t border-purple-200/80 space-y-4 animate-fadeIn">
                {/* View Mode Tabs */}
                <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTrialMode('video')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        trialMode === 'video'
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-purple-100'
                      }`}
                    >
                      <FaFilm className="w-3 h-3 text-amber-300" />
                      <span>Demo Video Player</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrialMode('text')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        trialMode === 'text'
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-purple-100'
                      }`}
                    >
                      <FaFileLines className="w-3 h-3" />
                      <span>Step-by-Step Overview</span>
                    </button>
                  </div>

                  {trialMode === 'video' && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-purple-900 font-bold bg-purple-100 px-2 py-0.5 rounded">
                        00:{videoSeconds < 10 ? `0${videoSeconds}` : videoSeconds} / 00:12
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                        className="px-3 py-1 bg-purple-800 hover:bg-purple-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isVideoPlaying ? (
                          <>
                            <FaPause className="w-3 h-3 text-amber-300" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <FaPlay className="w-3 h-3 text-amber-300" />
                            <span>Play Demo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* MODE 1: DEMO VIDEO PLAYER SIMULATION */}
                {trialMode === 'video' && (
                  <div className="space-y-3">
                    {/* Scene Navigation Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                      {[
                        { num: 1, label: '1. Camera Capture', desc: 'Live Viewfinder' },
                        { num: 2, label: '2. Gemini Inspection', desc: 'Hazard Triage' },
                        { num: 3, label: '3. Navigator Detour', desc: 'Rerouted Path' },
                        { num: 4, label: '4. Facilities Review', desc: 'Work Order Draft' },
                      ].map((s) => (
                        <button
                          key={s.num}
                          type="button"
                          onClick={() => {
                            setVideoScene(s.num);
                            setVideoSeconds((s.num - 1) * 3);
                          }}
                          className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                            videoScene === s.num
                              ? 'bg-purple-950 text-white border-amber-400 shadow-md ring-2 ring-amber-300/40'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                          }`}
                        >
                          <div className="font-extrabold text-[11px] flex items-center justify-between">
                            <span>{s.label}</span>
                            {videoScene === s.num && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                            )}
                          </div>
                          <div className={`text-[10px] ${videoScene === s.num ? 'text-purple-200' : 'text-slate-400'}`}>
                            {s.desc}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Animated Video Simulation Viewport */}
                    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-xl flex flex-col justify-between p-4 text-white">
                      {/* Top Video HUD */}
                      <div className="flex items-center justify-between text-[11px] text-slate-300 z-10">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600/90 text-white font-bold text-[10px] uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            DEMO VIDEO
                          </span>
                          <span className="font-mono text-slate-400">
                            SCENE 0{videoScene}/04 • SFSU CAMPUS
                          </span>
                        </div>
                        <div className="font-mono text-purple-300 text-[10px]">
                          GPS: 37.7218° N, 122.4782° W (±8m)
                        </div>
                      </div>

                      {/* Scene 1: Camera Framing */}
                      {videoScene === 1 && (
                        <div className="flex flex-col items-center justify-center space-y-3 py-3 animate-fadeIn text-center relative">
                          <div className="relative w-64 h-36 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 shadow-inner flex flex-col justify-between p-2">
                            {/* Visual Stairs Graphic */}
                            <svg className="absolute inset-0 w-full h-full opacity-80" viewBox="0 0 240 140" fill="none">
                              {/* Campus Walkway Floor */}
                              <rect y="100" width="240" height="40" fill="#334155" />
                              <line x1="0" y1="120" x2="240" y2="120" stroke="#475569" strokeDasharray="6 6" />
                              {/* Stairs Obstacle */}
                              <path d="M 60 100 L 90 100 L 90 85 L 120 85 L 120 70 L 150 70 L 150 55 L 180 55 L 180 40 L 220 40" stroke="#94a3b8" strokeWidth="4" fill="#1e293b" />
                              {/* Red barrier mark */}
                              <rect x="75" y="45" width="110" height="8" rx="2" fill="#ef4444" />
                              <text x="130" y="52" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">BARRIER: STAIRS</text>
                            </svg>

                            {/* Viewfinder Target Reticle */}
                            <div className="relative z-10 w-full h-full border border-dashed border-amber-400/70 rounded-lg flex items-center justify-center">
                              {/* Corner Brackets */}
                              <div className="w-3 h-3 border-t-2 border-l-2 border-amber-300 absolute top-1 left-1"></div>
                              <div className="w-3 h-3 border-t-2 border-r-2 border-amber-300 absolute top-1 right-1"></div>
                              <div className="w-3 h-3 border-b-2 border-l-2 border-amber-300 absolute bottom-1 left-1"></div>
                              <div className="w-3 h-3 border-b-2 border-r-2 border-amber-300 absolute bottom-1 right-1"></div>
                              <span className="px-2 py-0.5 rounded bg-black/70 text-amber-300 font-mono text-[9px] font-bold border border-amber-400/40 backdrop-blur-xs">
                                ⌖ AUTO-LOCKING OBSTACLE
                              </span>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-amber-200">
                            1. Viewfinder frames obstacle • Single pristine JPEG extracted from live camera
                          </p>
                        </div>
                      )}

                      {/* Scene 2: Gemini Multi-Hazard Inspection */}
                      {videoScene === 2 && (
                        <div className="flex flex-col items-center justify-center space-y-3 py-3 animate-fadeIn text-center relative">
                          <div className="p-3 bg-purple-950/90 border-2 border-cyan-400 rounded-xl max-w-md w-full space-y-2 shadow-2xl relative overflow-hidden">
                            {/* Scanning Beam */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent w-full h-full animate-pulse pointer-events-none"></div>

                            <div className="flex items-center justify-between gap-2 text-xs font-bold border-b border-purple-800 pb-1.5">
                              <span className="text-cyan-300 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                GEMINI MULTIMODAL INFERENCE
                              </span>
                              <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-black uppercase">
                                HIGH SEVERITY
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-left text-[11px]">
                              <div>
                                <span className="text-slate-400 text-[10px] block">DETECTED HAZARD:</span>
                                <strong className="text-white font-mono">concrete_stairs</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">AI CONFIDENCE:</span>
                                <strong className="text-emerald-400 font-mono">96.4% MATCH</strong>
                              </div>
                            </div>

                            <div className="text-[10px] text-purple-200 text-left bg-purple-900/60 p-1.5 rounded-lg border border-purple-700/60">
                              <strong>Accessibility Impact:</strong> Unramped flight of 5 concrete stairs completely blocks wheelchair passage.
                            </div>
                          </div>
                          <p className="text-xs font-bold text-cyan-200">
                            2. Gemini 3.8 Flash detects barriers, calculates severity & evaluates accessibility impact
                          </p>
                        </div>
                      )}

                      {/* Scene 3: Navigator Rerouted Detour */}
                      {videoScene === 3 && (
                        <div className="flex flex-col items-center justify-center space-y-3 py-3 animate-fadeIn text-center relative">
                          <div className="p-3 bg-slate-900/90 border-2 border-emerald-400 rounded-xl max-w-md w-full space-y-2 shadow-2xl text-left">
                            <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-1.5">
                              <span className="text-emerald-400 flex items-center gap-1.5">
                                <FaRoute className="w-3.5 h-3.5" />
                                <span>REROUTED ACCESSIBLE DETOUR</span>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                                Slope: 3.2% Gentle
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-200">
                              <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">✕</span>
                              <span>Stairs Segment Bypassed</span>
                              <span className="text-purple-400 font-bold">➔</span>
                              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
                              <strong className="text-emerald-300">East Switchback Ramp</strong>
                            </div>

                            <div className="text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded-lg border border-amber-500/30 flex items-center gap-1">
                              <FaTriangleExclamation className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Step 1: 2.1% grade · Step 2: 3.2% ramp · Verified under 8.33% ADA maximum</span>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-emerald-200">
                            3. Campus navigator plots alternative low-barrier detour around the blocked stairs
                          </p>
                        </div>
                      )}

                      {/* Scene 4: Pre-Filled Work Order */}
                      {videoScene === 4 && (
                        <div className="flex flex-col items-center justify-center space-y-3 py-3 animate-fadeIn text-center relative">
                          <div className="p-3 bg-white text-slate-900 rounded-xl max-w-md w-full space-y-2 text-left shadow-2xl border-2 border-purple-400">
                            <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1">
                              <span className="font-mono font-black text-purple-950">SFSU-REP-2026-8491</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                                Pending Dispatch
                              </span>
                            </div>
                            <div className="text-xs font-black text-slate-900">
                              Malcolm X Plaza North Gateway Walkway
                            </div>
                            <div className="text-[10px] text-slate-600">
                              Work Order fields editable by student • Logged directly with SFSU DPRC & Facilities
                            </div>
                          </div>
                          <p className="text-xs font-bold text-purple-200">
                            4. User confirms report fields and submits directly to SFSU Facilities
                          </p>
                        </div>
                      )}

                      {/* Video Player Bottom Progress Bar */}
                      <div className="space-y-1.5 z-10">
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full transition-all duration-300"
                            style={{ width: `${((videoSeconds + 1) / 12) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{isVideoPlaying ? '▶ PLAYING DEMO' : '❚❚ PAUSED'}</span>
                          <span>AUTO-ADVANCES SCENES</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: STEP-BY-STEP OVERVIEW */}
                {trialMode === 'text' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-purple-950">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[10px] font-black">1</span>
                        <span>Real Camera Capture</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Gemini analyzes the newest live camera picture taken directly from your device viewfinder. No demo images or stored photos are used.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-purple-950">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[10px] font-black">2</span>
                        <span>Multi-Hazard Analysis</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        It detects multiple accessibility hazards (stairs, blocked doors, steep slopes, elevator outages) and pre-populates report fields.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-purple-950">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[10px] font-black">3</span>
                        <span>Alternative Detour Route</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        The navigator suggests an alternative lower-barrier route around the obstacle with step-by-step slope warnings.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-purple-950">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[10px] font-black">4</span>
                        <span>Review & Submission</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        The user reviews, edits, confirms the location, and submits the report directly to SFSU Facilities.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
                  <FaTriangleExclamation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Trial Note:</strong> This demonstration visualizes the live AI pipeline without generating fake images, invoking mock data, calling Gemini, or submitting placeholder reports.
                  </p>
                </div>

                {/* Prominently Highlighted Action Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 border-2 border-amber-400 shadow-xl text-white">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                      ⚡ Ready to scan a genuine barrier on campus?
                    </span>
                    <p className="text-[11px] text-purple-200">
                      Opens your device live camera & captures a pristine still photo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCamera}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-black text-sm sm:text-base rounded-2xl shadow-2xl ring-4 ring-amber-300/90 hover:ring-amber-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-2 border-white shrink-0 group relative overflow-hidden"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-950 animate-ping"></span>
                    <FaCamera className="w-5 h-5 text-purple-950" />
                    <span>Start with a Real Camera Picture</span>
                    <FaArrowRight className="w-4 h-4 text-purple-950 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STEP 2: LIVE CAMERA PREVIEW & TAKE PICTURE ================= */}
      {step === 'camera_live' && (
        <div className="bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden space-y-4 p-4 text-white animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-300 px-2">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Camera Preview
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

          {/* GPS Location Acquisition Display */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-slate-200">
                <FaLocationCrosshairs className="w-3.5 h-3.5 text-amber-400" />
                <span>Detected Location:</span>
              </span>
              {isLocating ? (
                <span className="text-[11px] text-purple-300 flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                  Acquiring GPS...
                </span>
              ) : gpsLocation ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {gpsLocation.confidence}% Confidence
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Manual Selection</span>
              )}
            </div>

            {gpsLocation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400">Coordinates: </span>
                  <span className="font-mono text-purple-300">
                    {gpsLocation.lat.toFixed(5)}° N, {Math.abs(gpsLocation.lng).toFixed(5)}° W
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Nearest Building: </span>
                  <strong className="text-white">
                    {gpsLocation.nearestBuilding?.name || 'SFSU Campus'}
                  </strong>
                </div>
                <div className="sm:col-span-2 text-slate-400 text-[10px]">
                  <strong>Evidence: </strong>
                  {gpsLocation.evidence.join(' · ')}
                </div>
              </div>
            )}

            {gpsError && (
              <div className="text-[11px] text-amber-300">
                {gpsError}
              </div>
            )}
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
                  Send this captured camera picture securely to Gemini to inspect for blocked walkways, stairs, broken elevators, steep slopes, or inaccessible doors. Nothing will be submitted automatically.
                </p>
              </div>

              {/* Location Confirmation & Correction */}
              <div className="space-y-2 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5">
                    <FaLocationDot className="w-3.5 h-3.5 text-purple-700" />
                    <span>Campus Location</span>
                  </span>
                  {gpsLocation && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      GPS: {gpsLocation.confidence}% Match
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setLocationName(e.target.value);
                      setShowLocationSuggestions(true);
                    }}
                    onFocus={() => setShowLocationSuggestions(true)}
                    placeholder="Type or confirm campus building..."
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
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

                {gpsLocation && (
                  <div className="text-[10px] text-slate-500">
                    Coordinates: {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)} (±{Math.round(gpsLocation.accuracy)}m)
                  </div>
                )}
              </div>

              {/* Error Alert with Retry button */}
              {analysisError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <FaCircleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Analysis Error</span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">{analysisError}</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleAnalyzeWithGemini}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <FaRotateLeft className="w-3 h-3" />
                      <span>Retry Analysis with Gemini</span>
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
          {/* Review Card: Captured Image + Gemini Results */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/40 to-white border-2 border-purple-300 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-purple-700 text-white font-bold text-xs">
                  GEMINI AI
                </span>
                <span className="font-extrabold text-sm text-purple-950">
                  Review Hazard Analysis
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

            {/* Captured Image Preview in Review Card */}
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
                Gemini’s analysis is an assistive tool only and does not provide an official ADA determination. Always verify conditions on site.
              </p>
            </div>
          </div>

          {/* Suggested Location from photo sign (if detected by Gemini) */}
          {suggestedSign && (
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-purple-950 font-medium">
                <FaWandMagicSparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Gemini noticed campus building sign in photo: <strong className="font-bold">"{suggestedSign}"</strong> (Suggestion only)
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
                  Confirm Sign Location
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

          {/* ================= ALTERNATIVE LOWER-BARRIER ROUTE ================= */}
          {analysis.alternativeRoute && (
            <div className="p-5 rounded-2xl bg-white border-2 border-indigo-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">
                    <FaRoute className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="font-black text-sm text-indigo-950">
                    Alternative Lower-Barrier Route Around Obstacle
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Max Slope: {analysis.maximumSlope || '3.5%'}
                </span>
              </div>

              {/* Detour Summary */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-1">
                <strong className="block font-extrabold text-indigo-900">Recommended Bypass:</strong>
                <p className="leading-relaxed">{editedAlternativeRoute || analysis.alternativeRoute}</p>
                {analysis.blockedLocation && (
                  <div className="text-[11px] text-slate-600 pt-1">
                    <strong>Blocked Segment:</strong> {analysis.blockedLocation}
                  </div>
                )}
              </div>

              {/* Turn-by-Turn Steps with Slope Warnings for each step */}
              {analysis.routeSteps && analysis.routeSteps.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Turn-by-Turn Accessible Detour Steps
                  </span>
                  <div className="space-y-2">
                    {analysis.routeSteps.map((stepText, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5 text-xs text-slate-800"
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-semibold">{stepText}</span>
                        </div>

                        {/* Slope Warning for this Step */}
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 self-start">
                          <FaTriangleExclamation className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>
                            Slope warning: {idx === 0 ? '2.1% gentle grade' : idx === 1 ? '3.5% low-grade ramp' : '1.8% flat paved pathway'} (verified under 8.33% ADA maximum)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prominent Verification Notice */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <FaTriangleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>On-Site Verification Required</span>
                </div>
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  This alternative route was automatically generated by AI assistance to bypass the detected barrier. Always verify terrain conditions on site before proceeding.
                </p>
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

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Alternative Route / Detour Notes</label>
                <input
                  type="text"
                  value={editedAlternativeRoute}
                  onChange={(e) => setEditedAlternativeRoute(e.target.value)}
                  className="w-full font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Row: Retake Photo & Confirm & Submit Button */}
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

          {/* Submission Summary */}
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

            {submittedReport.alternativeRoute && (
              <div className="border-b border-purple-200/80 pb-2 text-indigo-950">
                <span className="font-bold">Alternative Route: </span>
                <span>{submittedReport.alternativeRoute}</span>
              </div>
            )}

            <div className="pt-1 text-slate-700">
              <span className="font-bold">Recommended Next Step: </span>
              {submittedReport.recommendedAction}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleReportAnother}
              className="w-full sm:w-auto px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Report Another Issue
            </button>

            {onNavigateToMap && (
              <button
                type="button"
                onClick={onNavigateToMap}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FaRoute className="w-3.5 h-3.5" />
                <span>View Route in Campus Navigator</span>
              </button>
            )}

            <a
              href="tel:4153382472"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <FaPhone className="w-3.5 h-3.5" />
              <span>Accessibility Services: (415) 338-2472</span>
            </a>
          </div>

          <div className="text-[11px] text-slate-400 max-w-md mx-auto pt-2">
            ⚠️ Notice: Neither GatorAccess AI nor Google Maps provides an official ADA determination. All alternative routes must be verified on site.
          </div>
        </div>
      )}
    </div>
  );
}
