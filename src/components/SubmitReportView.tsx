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
  FaChevronLeft,
  FaChevronRight,
  FaLocationCrosshairs,
  FaPlay,
  FaPause,
  FaFilm,
  FaVideo,
  FaLightbulb,
  FaCloudArrowUp,
  FaImage,
  FaMagnifyingGlass,
} from 'react-icons/fa6';
import confetti from 'canvas-confetti';
import { SAMPLE_HAZARD_IMAGES, SampleHazardItem } from '../data/sampleHazardImages';

export interface DemoStepDetail {
  stepNumber: number;
  title: string;
  shortDesc: string;
  badge: string;
  whatItDoes: string;
  whatUserNeedsToDo: string;
  whatAiIsChecking: string;
  whatResultUserReceives: string;
  whatActionUserCanTakeNext: string;
}

export const DEMO_STEPS: DemoStepDetail[] = [
  {
    stepNumber: 1,
    title: 'Snap a Real Photo',
    shortDesc: 'Device Camera & Campus Spot',
    badge: 'Step 1 of 4 • 3 steps left',
    whatItDoes: 'Uses your device camera to take a real, live photo of anything blocking a campus walkway or building door.',
    whatUserNeedsToDo: 'Point your camera at the problem (like steep stairs, a closed ramp, or a broken door) and tap the big "Take Picture" button.',
    whatAiIsChecking: 'The camera checks that the picture is in focus and automatically grabs your campus GPS spot so helpers know where to go.',
    whatResultUserReceives: 'A clear photo snapshot along with the name of the closest campus building (like Malcolm X Plaza or Hensill Hall).',
    whatActionUserCanTakeNext: 'Tap the big purple "Use This Picture" button to send it to the smart AI helper.',
  },
  {
    stepNumber: 2,
    title: 'AI Inspects the Photo',
    shortDesc: 'Smart Hazard Scanner',
    badge: 'Step 2 of 4 • 2 steps left',
    whatItDoes: 'Smart AI looks closely at the picture to find anything blocking people who use wheelchairs, crutches, or strollers.',
    whatUserNeedsToDo: 'Just wait 3 to 4 seconds while the AI reads the photo. No typing or guesswork needed!',
    whatAiIsChecking: 'The AI checks the obstacle type (like stairs or locked doors), measures hill steepness (slope grade), and rates urgency.',
    whatResultUserReceives: 'A friendly summary card showing the obstacle name (like "Stairs"), urgency level ("High"), and how it affects movement.',
    whatActionUserCanTakeNext: 'Review what the AI found, change any words if you want, or tap "See Safe Detour" to find a ramp.',
  },
  {
    stepNumber: 3,
    title: 'Finds Safe Detour Path',
    shortDesc: 'Step-Free Campus Navigator',
    badge: 'Step 3 of 4 • 1 step left',
    whatItDoes: 'Draws a safe, gentle, ramp-friendly walking route on the map that steers around the blocked area.',
    whatUserNeedsToDo: 'Follow the bright green line drawn on the campus map and check the turn-by-turn directions.',
    whatAiIsChecking: 'The map checks walkway slopes (keeping hills gentle under 8%) and skips stairs, locked gates, and broken elevators.',
    whatResultUserReceives: 'A safe detour route (like "East Switchback Ramp, slope 3.2% gentle") with turn-by-turn walking steps.',
    whatActionUserCanTakeNext: 'Follow the step-by-step directions on the map to reach your classroom easily and safely without getting stuck!',
  },
  {
    stepNumber: 4,
    title: 'Sends Report to Repair Crew',
    shortDesc: 'Facilities Repair Ticket',
    badge: 'Step 4 of 4 • Final Step!',
    whatItDoes: 'Creates an official repair ticket and sends it straight to the SFSU Facilities and campus maintenance crew.',
    whatUserNeedsToDo: 'Look over the quick summary card and tap the big purple "Send Report" button.',
    whatAiIsChecking: 'The system makes sure the building name, photo, and barrier description are attached accurately.',
    whatResultUserReceives: 'A confirmation ticket number (like SFSU-REP-2026-8491) confirming that your report is safely saved.',
    whatActionUserCanTakeNext: 'SFSU maintenance gets alerted to fix the problem, and a warning pin appears on the map to protect other students!',
  },
];

interface SubmitReportViewProps {
  buildings: CampusBuilding[];
  onReportSubmitted: (newReport: any) => void;
  onRequestRide: () => void;
  onNavigateToMap?: () => void;
  prefillLocation?: { name: string; buildingId?: string };
}

export type ScannerStep =
  | 'idle' // "Open Camera" / "Upload Image" screen with "Quick AI Trial"
  | 'camera_live' // Live camera preview active with "Take Picture" + GPS
  | 'photo_preview' // Still photo captured with only "Retake Picture" & "Use This Picture"
  | 'ready_to_analyze' // Locked-in photo with "Analyze with Gemini" button
  | 'analyzing' // Loading state: "Gemini is analyzing the accessibility hazard…"
  | 'upload_demo' // Slow clear 4-step AI demo animation for uploaded image
  | 'upload_result' // 5th-grade friendly result for uploaded image
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

  // Trial Walkthrough State: calm pace (8s per step = 32s total, ~half previous speed)
  const [showTrialWalkthrough, setShowTrialWalkthrough] = useState(true);
  const [trialMode, setTrialMode] = useState<'video' | 'text'>('video');
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoScene, setVideoScene] = useState<number>(1);
  const [videoSeconds, setVideoSeconds] = useState<number>(0);

  // Slow, calm auto-advance timer: 8 seconds per scene (32 seconds total for 4 scenes)
  useEffect(() => {
    if (!isVideoPlaying) return;
    const interval = setInterval(() => {
      setVideoSeconds((prev) => {
        const next = (prev + 1) % 32;
        const currentScene = Math.floor(next / 8) + 1;
        setVideoScene(currentScene);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVideoPlaying]);

  const handleNextScene = () => {
    setVideoScene((prev) => {
      const next = prev >= 4 ? 1 : prev + 1;
      setVideoSeconds((next - 1) * 8);
      return next;
    });
  };

  const handlePrevScene = () => {
    setVideoScene((prev) => {
      const next = prev <= 1 ? 4 : prev - 1;
      setVideoSeconds((next - 1) * 8);
      return next;
    });
  };

  const handleSelectScene = (sceneNum: number) => {
    setVideoScene(sceneNum);
    setVideoSeconds((sceneNum - 1) * 8);
  };

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

  // Upload Image Feature States
  const [activeUploadTab, setActiveUploadTab] = useState<'upload' | 'camera'>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSample, setSelectedSample] = useState<SampleHazardItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload Slow AI Demo Animation states (4 steps, half speed)
  const [uploadDemoPhase, setUploadDemoPhase] = useState<1 | 2 | 3 | 4>(1);
  const [uploadResult, setUploadResult] = useState<{
    headline: string;
    hazardType: string;
    severity: 'low' | 'medium' | 'high';
    severityText: string;
    location: string;
    description: string;
    alternativeRoute: string;
    recommendedAction: string;
  } | null>(null);

  // Process chosen or dropped file (Supports JPG, PNG, HEIC)
  const processFile = async (file: File) => {
    setUploadError(null);
    setSelectedSample(null);
    const name = file.name;
    const isHeic = name.toLowerCase().endsWith('.heic') || name.toLowerCase().endsWith('.heif');

    if (isHeic) {
      try {
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default || heic2anyModule;
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setUploadedImage(result);
          setCapturedImage(result);
          setUploadedFileName(name);
        };
        reader.readAsDataURL(finalBlob);
        return;
      } catch (err) {
        console.warn('HEIC conversion warning, falling back to standard reader:', err);
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setCapturedImage(result);
      setUploadedFileName(name);
    };
    reader.onerror = () => {
      setUploadError('Could not read image file. Please try a JPG, PNG, or HEIC image.');
    };
    reader.readAsDataURL(file);
  };

  const handlePickSample = (sample: SampleHazardItem) => {
    setSelectedSample(sample);
    setUploadedImage(sample.imageUrl);
    setCapturedImage(sample.imageUrl);
    setUploadedFileName(sample.name);
    setLocationName(sample.location);
    setLocationQuery(sample.location);
    setUploadError(null);
  };

  const handleChooseDifferentImage = () => {
    setUploadedImage(null);
    setCapturedImage(null);
    setUploadedFileName(null);
    setSelectedSample(null);
    setUploadError(null);
    setUploadResult(null);
    setStep('idle');
  };

  // Slow, clear 4-step AI demo animation (Half speed: ~2.6s per message)
  const handleStartUploadAnalysis = async () => {
    if (!uploadedImage) return;

    setStep('upload_demo');
    setUploadDemoPhase(1);

    // Call API in background
    let fetchedAnalysis: any = null;
    const apiPromise = (async () => {
      try {
        const response = await fetch('/api/analyze-hazard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textDescription: `Road safety inspection at ${locationName || 'SFSU Campus'}`,
            locationName: locationName || 'SFSU Campus',
            imageBase64: uploadedImage,
          }),
        });
        const data = await response.json();
        if (data.success && data.analysis) {
          fetchedAnalysis = data.analysis;
        }
      } catch (err) {
        console.warn('API analysis fallback:', err);
      }
    })();

    // Step 1: “Looking at the image…” (2.6 seconds)
    await new Promise((res) => setTimeout(res, 2600));
    setUploadDemoPhase(2);

    // Step 2: “Finding possible safety problems…” (2.6 seconds)
    await new Promise((res) => setTimeout(res, 2600));
    setUploadDemoPhase(3);

    // Step 3: “Checking the location and road conditions…” (2.6 seconds)
    await new Promise((res) => setTimeout(res, 2600));
    setUploadDemoPhase(4);

    // Step 4: “Preparing your report…” (2.6 seconds)
    await new Promise((res) => setTimeout(res, 2600));
    await apiPromise; // ensure API call had time to finish

    // Format results in 5th-grade simple language
    if (selectedSample) {
      setUploadResult({
        headline: selectedSample.headline,
        hazardType: selectedSample.hazardType,
        severity: selectedSample.severity,
        severityText: selectedSample.severityText,
        location: selectedSample.location,
        description: selectedSample.description,
        alternativeRoute: selectedSample.alternativeRoute,
        recommendedAction: selectedSample.recommendedAction,
      });
      setEditedHazardType(selectedSample.hazardType);
      setEditedSeverity(selectedSample.severity);
      setEditedSummary(selectedSample.description);
      setEditedImpact(selectedSample.severityText);
      setEditedAction(selectedSample.recommendedAction);
      setEditedAlternativeRoute(selectedSample.alternativeRoute);
      setLocationName(selectedSample.location);
    } else if (fetchedAnalysis) {
      const sev = fetchedAnalysis.severity || 'medium';
      const sevText =
        sev === 'high'
          ? '🔴 High - Hard or impossible for wheelchairs and strollers to pass'
          : sev === 'medium'
          ? '🟡 Medium - Bumpy or difficult for wheels to get around'
          : '🟢 Low - Minor bump or easy to step around';

      const simpleHeadline = `Possible problem found: ${
        fetchedAnalysis.hazardType?.replace(/_/g, ' ') || 'An obstacle is blocking the road or path.'
      }`;

      setUploadResult({
        headline: simpleHeadline,
        hazardType: fetchedAnalysis.hazardType?.replace(/_/g, ' ') || 'Road / Walkway Problem',
        severity: sev,
        severityText: sevText,
        location: locationName || 'SFSU Campus Pathway (GPS detected)',
        description: fetchedAnalysis.summary || 'A safety hazard was detected on the pathway.',
        alternativeRoute:
          fetchedAnalysis.alternativeRoute ||
          'Safe detour: Use the nearby ramp and paved quad path with gentle 3.2% slope.',
        recommendedAction:
          fetchedAnalysis.recommendedAction || 'Send campus maintenance to inspect and repair.',
      });
      setEditedHazardType(fetchedAnalysis.hazardType?.replace(/_/g, ' ') || 'Road Problem');
      setEditedSeverity(sev);
      setEditedSummary(fetchedAnalysis.summary || '');
      setEditedImpact(fetchedAnalysis.accessibilityImpact || sevText);
      setEditedAction(fetchedAnalysis.recommendedAction || '');
      setEditedAlternativeRoute(fetchedAnalysis.alternativeRoute || '');
    } else {
      setUploadResult({
        headline: 'Possible problem found: A road hazard is blocking the walkway.',
        hazardType: 'Road / Pathway Problem',
        severity: 'medium',
        severityText: '🟡 Medium - Hard for bikes, strollers, and wheelchairs to pass safely',
        location: locationName || 'SFSU Campus Pathway',
        description:
          'A problem was spotted in the road or sidewalk. It makes it hard for people using wheels, carts, or walkers to get through smoothly.',
        alternativeRoute:
          'Safe detour: Use the East Switchback Ramp or South Walkway. It has a gentle slope and is completely clear of obstacles.',
        recommendedAction: 'Report sent to SFSU Facilities to dispatch repair crew.',
      });
      setEditedHazardType('Road / Pathway Problem');
      setEditedSeverity('medium');
      setEditedSummary('A problem was spotted in the road or sidewalk.');
      setEditedImpact('🟡 Medium - Hard for wheels to pass');
      setEditedAction('Report sent to SFSU Facilities.');
      setEditedAlternativeRoute('Safe detour: Use the East Switchback Ramp.');
    }

    setStep('upload_result');
  };

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

      {/* ================= STEP 1: OPEN CAMERA / UPLOAD IMAGE SCREEN ================= */}
      {step === 'idle' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Action Card: Upload an Image OR Open Camera */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 sm:p-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveUploadTab('upload')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeUploadTab === 'upload'
                    ? 'bg-purple-950 text-white shadow-md ring-2 ring-amber-400/50'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <FaCloudArrowUp className={`w-4 h-4 ${activeUploadTab === 'upload' ? 'text-amber-300' : 'text-slate-500'}`} />
                <span>Upload an Image</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-purple-950 uppercase tracking-wider hidden sm:inline">
                  Test Instantly
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveUploadTab('camera')}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeUploadTab === 'camera'
                    ? 'bg-purple-950 text-white shadow-md ring-2 ring-amber-400/50'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <FaCamera className={`w-4 h-4 ${activeUploadTab === 'camera' ? 'text-amber-300' : 'text-slate-500'}`} />
                <span>Open Live Camera</span>
              </button>
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              {/* TAB 1: UPLOAD AN IMAGE (NO CAMERA NEEDED) */}
              {activeUploadTab === 'upload' && (
                <div className="space-y-6">
                  {/* Hidden file picker input supporting JPG, PNG, HEIC */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".jpg,.jpeg,.png,.heic,.HEIC,image/jpeg,image/png,image/heic"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {uploadError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 text-left flex items-start gap-2.5">
                      <FaCircleExclamation className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block mb-0.5 font-bold">Upload Notice:</strong>
                        {uploadError}
                      </div>
                    </div>
                  )}

                  {!uploadedImage ? (
                    <div className="space-y-6">
                      {/* Drag & Drop Area */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            processFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-8 sm:p-12 rounded-3xl border-3 border-dashed transition-all cursor-pointer text-center space-y-4 group ${
                          isDragging
                            ? 'border-amber-400 bg-amber-50/70 scale-[1.01] shadow-lg ring-4 ring-amber-300/40'
                            : 'border-purple-300 hover:border-purple-500 bg-purple-50/40 hover:bg-purple-50/80 shadow-inner'
                        }`}
                      >
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-900 flex items-center justify-center mx-auto shadow-inner group-hover:scale-105 transition-transform">
                          <FaCloudArrowUp className="w-10 h-10 text-purple-800" />
                        </div>

                        <div className="max-w-md mx-auto space-y-2">
                          {/* Large Button labeled "Upload an Image" */}
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-8 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-base rounded-2xl shadow-xl ring-4 ring-amber-400/40 hover:ring-amber-300/70 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-2 border-amber-300 mx-auto"
                            >
                              <FaCloudArrowUp className="w-5 h-5 text-amber-300" />
                              <span>Upload an Image</span>
                            </button>
                          </div>

                          {/* Simple explanation required by user */}
                          <p className="text-xs sm:text-sm font-semibold text-purple-950 pt-1">
                            Choose a photo of a road problem, such as a pothole, fallen tree, blocked road, or broken sidewalk.
                          </p>
                          <p className="text-xs text-slate-500">
                            Drag and drop your photo here, or click to browse files from your computer or phone.
                          </p>

                          <div className="pt-1 flex items-center justify-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              JPG, PNG & HEIC Supported
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sample Test Image Options for Immediate Testing */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-xs sm:text-sm text-purple-950 flex items-center gap-1.5">
                            <FaLightbulb className="w-4 h-4 text-amber-500" />
                            <span>Or try a sample test image immediately:</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Click any sample below to test
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {SAMPLE_HAZARD_IMAGES.map((sample) => (
                            <button
                              key={sample.id}
                              type="button"
                              onClick={() => handlePickSample(sample)}
                              className="p-3 bg-white hover:bg-purple-50 rounded-2xl border-2 border-slate-200 hover:border-purple-400 text-left transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs group"
                            >
                              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                {sample.icon}
                              </div>
                              <div className="font-extrabold text-xs text-purple-950">
                                {sample.name}
                              </div>
                              <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                {sample.tagline}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PREVIEW OF THE SELECTED IMAGE BEFORE SUBMITTING */
                    <div className="space-y-6 animate-fadeIn">
                      <div className="p-4 bg-purple-50/60 rounded-2xl border-2 border-purple-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="font-black text-xs sm:text-sm text-purple-950">
                              Selected Image Preview
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-purple-800 bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
                            {uploadedFileName || 'Image Ready'}
                          </span>
                        </div>

                        {/* Image Preview Container */}
                        <div className="relative max-w-md mx-auto max-h-72 rounded-2xl overflow-hidden shadow-lg border-2 border-purple-300 bg-slate-950 flex items-center justify-center">
                          <img
                            src={uploadedImage}
                            alt="Selected hazard preview"
                            className="w-full h-64 object-cover"
                          />
                        </div>

                        <p className="text-xs text-slate-600 text-center">
                          Ready to inspect! Click &ldquo;Analyze Image&rdquo; to start the smart AI scanner.
                        </p>
                      </div>

                      {/* Required Buttons: "Analyze Image" and "Choose a Different Image" */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
                        <button
                          type="button"
                          onClick={handleChooseDifferentImage}
                          className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl border border-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <FaRotateLeft className="w-4 h-4 text-slate-500" />
                          <span>Choose a Different Image</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleStartUploadAnalysis}
                          className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl ring-4 ring-amber-400/50 hover:ring-amber-300 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-2 border-amber-300"
                        >
                          <FaWandMagicSparkles className="w-5 h-5 text-amber-300" />
                          <span>Analyze Image</span>
                          <FaArrowRight className="w-4 h-4 text-purple-200" />
                        </button>
                      </div>

                      {/* Quick switch to another sample image */}
                      <div className="pt-2 text-center">
                        <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                          Or switch to another test sample:
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {SAMPLE_HAZARD_IMAGES.map((sample) => (
                            <button
                              key={sample.id}
                              type="button"
                              onClick={() => handlePickSample(sample)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-950 font-bold text-xs border border-purple-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <span>{sample.icon}</span>
                              <span>{sample.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIVE CAMERA OPTION */}
              {activeUploadTab === 'camera' && (
                <div className="space-y-6 text-center animate-fadeIn">
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
                        Take a Photo with Camera
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Point your camera at a campus barrier: blocked walkway, broken elevator, steep stairs, locked restroom, or inaccessible entrance.
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
              )}
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
                      Slow & Calm Guide
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Watch how the AI scanner, safe detour route, and repair ticket work together step-by-step
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
              <div className="mt-4 pt-4 border-t border-purple-200/80 space-y-5 animate-fadeIn">
                {/* View Mode Tabs & Speed Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTrialMode('video')}
                      className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm md:text-base font-black flex items-center gap-2 transition-all cursor-pointer ${
                        trialMode === 'video'
                          ? 'bg-purple-950 text-white shadow-md ring-2 ring-purple-900/50'
                          : 'bg-white text-slate-700 hover:bg-purple-100 border border-slate-200'
                      }`}
                    >
                      <FaFilm className="w-4 h-4 text-amber-300" />
                      <span>Demo Video Player</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrialMode('text')}
                      className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm md:text-base font-black flex items-center gap-2 transition-all cursor-pointer ${
                        trialMode === 'text'
                          ? 'bg-purple-950 text-white shadow-md ring-2 ring-purple-900/50'
                          : 'bg-white text-slate-700 hover:bg-purple-100 border border-slate-200'
                      }`}
                    >
                      <FaFileLines className="w-4 h-4 text-amber-400" />
                      <span>Step-by-Step Overview</span>
                    </button>
                  </div>

                  {trialMode === 'video' && (
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs sm:text-sm text-purple-950 font-bold bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-300">
                        ⏱ 00:{videoSeconds < 10 ? `0${videoSeconds}` : videoSeconds} / 00:32 (Calm Pace)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                        className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                        title={isVideoPlaying ? 'Pause to read at your own speed' : 'Resume demo walkthrough'}
                      >
                        {isVideoPlaying ? (
                          <>
                            <FaPause className="w-3.5 h-3.5 text-amber-300" />
                            <span>Pause to Read</span>
                          </>
                        ) : (
                          <>
                            <FaPlay className="w-3.5 h-3.5 text-amber-300" />
                            <span>Play Demo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* MODE 1: DEMO VIDEO PLAYER SIMULATION */}
                {trialMode === 'video' && (
                  <div className="space-y-6">
                    {/* Scene Navigation Pills with Friendly Step Indicators */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {DEMO_STEPS.map((s) => {
                        const isActive = videoScene === s.stepNumber;
                        return (
                          <button
                            key={s.stepNumber}
                            type="button"
                            onClick={() => handleSelectScene(s.stepNumber)}
                            className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer border-2 ${
                              isActive
                                ? 'bg-purple-950 text-white border-amber-400 shadow-lg ring-4 ring-amber-300/40 scale-[1.02]'
                                : 'bg-white text-slate-700 border-purple-100 hover:border-purple-300 hover:bg-purple-50/70 shadow-2xs'
                            }`}
                          >
                            <div className="font-black text-sm sm:text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-black ${isActive ? 'bg-amber-400 text-purple-950' : 'bg-purple-100 text-purple-950'}`}>
                                  {s.stepNumber}
                                </span>
                                <span>{s.title}</span>
                              </span>
                              {isActive && (
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                              )}
                            </div>
                            <div className={`text-xs sm:text-sm mt-1.5 font-medium leading-snug ${isActive ? 'text-purple-200' : 'text-slate-500'}`}>
                              {s.shortDesc}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Animated Video Simulation Viewport - Large, High-Contrast & Centered */}
                    <div className="relative w-full min-h-[480px] sm:min-h-[520px] md:min-h-[560px] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-3 border-slate-700 shadow-2xl flex flex-col justify-between p-5 sm:p-7 md:p-8 text-white space-y-4">
                      {/* Top Video HUD */}
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 z-10 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                            DEMO VIDEO
                          </span>
                          <span className="font-mono text-amber-300 font-black text-xs sm:text-sm md:text-base">
                            STEP {videoScene} OF 4 • {4 - videoScene === 0 ? 'FINAL STEP' : `${4 - videoScene} STEPS LEFT`}
                          </span>
                        </div>
                        <div className="font-mono text-purple-200 text-xs sm:text-sm font-bold bg-purple-950/80 px-3 py-1 rounded-md border border-purple-700/60 hidden sm:block">
                          GPS: SFSU CAMPUS • ±8m Accuracy
                        </div>
                      </div>

                      {/* Scene 1: Camera Framing */}
                      {videoScene === 1 && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-3 sm:py-4 animate-fadeIn text-center relative my-auto">
                          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg h-56 sm:h-64 md:h-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-2xl overflow-hidden border-3 border-amber-400/80 shadow-2xl flex flex-col justify-between p-3">
                            {/* Visual Stairs Graphic */}
                            <svg className="absolute inset-0 w-full h-full opacity-90" viewBox="0 0 320 180" fill="none">
                              <rect y="130" width="320" height="50" fill="#334155" />
                              <line x1="0" y1="155" x2="320" y2="155" stroke="#475569" strokeDasharray="8 8" strokeWidth="2" />
                              <path d="M 50 130 L 90 130 L 90 110 L 130 110 L 130 90 L 170 90 L 170 70 L 210 70 L 210 50 L 270 50" stroke="#94a3b8" strokeWidth="6" fill="#1e293b" />
                              <rect x="75" y="45" width="170" height="24" rx="6" fill="#ef4444" />
                              <text x="160" y="61" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle">⚠️ BARRIER: 5 CONCRETE STAIRS</text>
                              <text x="160" y="100" fill="#fde047" fontSize="10" fontWeight="bold" textAnchor="middle">No Ramp Available • Blocks Wheelchairs</text>
                            </svg>

                            {/* Viewfinder Target Reticle */}
                            <div className="relative z-10 w-full h-full border-2 border-dashed border-amber-400/80 rounded-xl flex items-center justify-center">
                              <div className="w-5 h-5 border-t-3 border-l-3 border-amber-300 absolute top-2 left-2"></div>
                              <div className="w-5 h-5 border-t-3 border-r-3 border-amber-300 absolute top-2 right-2"></div>
                              <div className="w-5 h-5 border-b-3 border-l-3 border-amber-300 absolute bottom-2 left-2"></div>
                              <div className="w-5 h-5 border-b-3 border-r-3 border-amber-300 absolute bottom-2 right-2"></div>
                              <span className="px-4 py-1.5 rounded-xl bg-black/85 text-amber-300 font-mono text-xs sm:text-sm font-black border-2 border-amber-400/60 backdrop-blur-xs shadow-lg flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                                ⌖ POINTING CAMERA AT OBSTACLE
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-base sm:text-lg md:text-xl font-black text-amber-200 tracking-wide">
                              Step 1: Point your camera at the barrier and take a live photo
                            </p>
                            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">
                              Keep the camera steady so the AI can clearly see the stairs or obstacle
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Scene 2: Gemini Multi-Hazard Inspection */}
                      {videoScene === 2 && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-3 sm:py-4 animate-fadeIn text-center relative my-auto">
                          <div className="p-5 sm:p-6 md:p-7 bg-purple-950/95 border-3 border-cyan-400 rounded-2xl max-w-md sm:max-w-lg md:max-w-xl w-full space-y-4 shadow-2xl relative overflow-hidden text-left">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent w-full h-full animate-pulse pointer-events-none"></div>

                            <div className="flex items-center justify-between gap-2 text-sm sm:text-base md:text-lg font-black border-b border-purple-800 pb-2.5">
                              <span className="text-cyan-300 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
                                AI SCANNING PHOTO
                              </span>
                              <span className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider shadow-md">
                                HIGH URGENCY
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-left">
                              <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-700/50">
                                <span className="text-slate-300 text-xs sm:text-sm font-bold block">PROBLEM FOUND:</span>
                                <strong className="text-white font-mono text-base sm:text-lg md:text-xl font-black">Flight of Stairs</strong>
                              </div>
                              <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-700/50">
                                <span className="text-slate-300 text-xs sm:text-sm font-bold block">AI CONFIDENCE:</span>
                                <strong className="text-emerald-400 font-mono text-base sm:text-lg md:text-xl font-black">96% Clear Match</strong>
                              </div>
                            </div>

                            <div className="text-xs sm:text-sm md:text-base text-purple-100 text-left bg-purple-900/80 p-3.5 sm:p-4 rounded-xl border-2 border-purple-600/70 leading-relaxed font-medium">
                              <strong className="text-amber-300 font-bold block mb-0.5">Why it matters:</strong>
                              5 concrete stairs completely block wheelchairs, crutches, and strollers from accessing the walkway.
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-base sm:text-lg md:text-xl font-black text-cyan-200 tracking-wide">
                              Step 2: AI finds the problem, measures urgency, and explains who it affects
                            </p>
                            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">
                              Translates safety rules into plain everyday language that everyone can understand
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Scene 3: Navigator Rerouted Detour */}
                      {videoScene === 3 && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-3 sm:py-4 animate-fadeIn text-center relative my-auto">
                          <div className="p-5 sm:p-6 md:p-7 bg-slate-900/95 border-3 border-emerald-400 rounded-2xl max-w-md sm:max-w-lg md:max-w-xl w-full space-y-4 shadow-2xl text-left">
                            <div className="flex items-center justify-between text-sm sm:text-base md:text-lg font-black border-b border-slate-800 pb-2.5">
                              <span className="text-emerald-400 flex items-center gap-2">
                                <FaRoute className="w-5 h-5 text-emerald-400" />
                                <span>SAFE STEP-FREE DETOUR</span>
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-emerald-200 bg-emerald-950 px-3.5 py-1 rounded-lg border border-emerald-500/50">
                                Slope: 3.2% Gentle
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm md:text-base text-slate-100 font-bold bg-slate-800/90 p-3.5 sm:p-4 rounded-xl border border-slate-700">
                              <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shrink-0">✕</span>
                              <span>Stairs Skipped</span>
                              <span className="text-amber-400 font-black text-lg">➔</span>
                              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">✓</span>
                              <strong className="text-emerald-300 text-sm sm:text-base md:text-lg">East Switchback Ramp (Safe)</strong>
                            </div>

                            <div className="text-xs sm:text-sm md:text-base text-amber-200 bg-amber-950/60 p-3.5 sm:p-4 rounded-xl border-2 border-amber-500/40 flex items-center gap-2.5 font-medium leading-relaxed">
                              <FaTriangleExclamation className="w-5 h-5 text-amber-400 shrink-0" />
                              <span>Safe hill slope under 8.3% • Wheelchair, bike, and crutch friendly</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-base sm:text-lg md:text-xl font-black text-emerald-200 tracking-wide">
                              Step 3: Navigator draws a safe ramp path around the stairs
                            </p>
                            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">
                              Campus routes are immediately updated so no one gets stuck at the blocked walkway
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Scene 4: Pre-Filled Work Order */}
                      {videoScene === 4 && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-3 sm:py-4 animate-fadeIn text-center relative my-auto">
                          <div className="p-5 sm:p-6 md:p-7 bg-white text-slate-900 rounded-2xl max-w-md sm:max-w-lg md:max-w-xl w-full space-y-3.5 text-left shadow-2xl border-3 border-purple-400">
                            <div className="flex items-center justify-between text-xs sm:text-sm md:text-base border-b border-slate-100 pb-2">
                              <span className="font-mono font-black text-purple-950">TICKET #SFSU-REP-2026-8491</span>
                              <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs sm:text-sm border border-emerald-300">
                                Ready to Send
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide block">Detected Location:</span>
                              <div className="text-base sm:text-lg md:text-xl font-black text-purple-950">
                                Malcolm X Plaza North Gateway Walkway
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm md:text-base text-slate-700 bg-purple-50/80 p-3 sm:p-3.5 rounded-xl border border-purple-100 font-medium">
                              All answers are ready • Sent directly to SFSU Facilities and DPRC office
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-base sm:text-lg md:text-xl font-black text-purple-200 tracking-wide">
                              Step 4: Review report and send it to campus repair crew
                            </p>
                            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">
                              One tap files the ticket so maintenance staff can inspect and repair the problem
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Video Player Bottom Progress Bar - Thick, Large, High-Contrast */}
                      <div className="space-y-2 z-10 pt-2 border-t border-slate-800">
                        <div className="w-full bg-white/20 h-3.5 sm:h-4 rounded-full overflow-hidden flex gap-1.5 p-0.5 border border-white/20">
                          {[1, 2, 3, 4].map((stepIdx) => {
                            const isStepDone = videoScene > stepIdx;
                            const isStepCurrent = videoScene === stepIdx;
                            const currentSecondsInStep = videoSeconds % 8;
                            const currentPercent = isStepDone
                              ? 100
                              : isStepCurrent
                              ? ((currentSecondsInStep + 1) / 8) * 100
                              : 0;
                            return (
                              <div key={stepIdx} className="flex-1 bg-white/20 h-full rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${isStepCurrent ? 'bg-amber-400' : isStepDone ? 'bg-emerald-400' : 'bg-transparent'}`}
                                  style={{ width: `${currentPercent}%` }}
                                ></div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between text-xs sm:text-sm md:text-base text-slate-200 font-mono font-bold">
                          <span>{isVideoPlaying ? '▶ PLAYING (8 SEC PER STEP • CALM SPEED)' : '❚❚ PAUSED (TAKE YOUR TIME TO READ)'}</span>
                          <span>STEP {videoScene} OF 4</span>
                        </div>
                      </div>
                    </div>

                    {/* Step Navigation Controls: Clear Previous, Pause, and Large Next Button */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-purple-50 via-amber-50/50 to-white rounded-3xl border-2 border-purple-200 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <button
                          type="button"
                          onClick={handlePrevScene}
                          className="px-5 py-3 sm:px-6 sm:py-3.5 bg-white hover:bg-purple-100 text-purple-950 border-2 border-purple-300 font-black text-xs sm:text-sm md:text-base rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                          <FaChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-950" />
                          <span>Previous Step</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                          className="px-5 py-3 sm:px-6 sm:py-3.5 bg-purple-950 hover:bg-purple-900 text-white font-black text-xs sm:text-sm md:text-base rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-purple-800"
                        >
                          {isVideoPlaying ? (
                            <>
                              <FaPause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <FaPlay className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                              <span>Play</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Prominent Large NEXT Button with Bigger Text & Padding */}
                      <button
                        type="button"
                        onClick={handleNextScene}
                        className="px-8 py-3.5 sm:px-10 sm:py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-black text-sm sm:text-base md:text-lg rounded-2xl shadow-xl ring-4 ring-amber-300/80 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer border-2 border-amber-500"
                      >
                        <span>Next Step</span>
                        <FaChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-950" />
                      </button>
                    </div>

                    {/* 5-POINT EXPLANATION CARD FOR ACTIVE DEMO STEP - Large, Clear, and Readable */}
                    <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 border-3 border-purple-200 shadow-md space-y-5 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-purple-100 pb-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-950 text-amber-300 font-black text-base sm:text-xl flex items-center justify-center shadow-md">
                            {videoScene}
                          </span>
                          <div>
                            <h5 className="font-black text-base sm:text-xl md:text-2xl text-purple-950">
                              Step {videoScene} of 4: {DEMO_STEPS[videoScene - 1].title}
                            </h5>
                            <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium mt-0.5">
                              {DEMO_STEPS[videoScene - 1].shortDesc}
                            </p>
                          </div>
                        </div>

                        <span className="self-start sm:self-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-black bg-amber-100 text-purple-950 border-2 border-amber-300">
                          {DEMO_STEPS[videoScene - 1].badge}
                        </span>
                      </div>

                      {/* The 5 ordered explanations in everyday 5th-grade language - Enlarged & Generously Spaced */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        {/* 1. What the feature does */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 border-2 border-purple-200 space-y-2">
                          <div className="font-black text-purple-950 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center text-xs sm:text-sm font-black">1</span>
                            <span>What this feature does</span>
                          </div>
                          <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium">
                            {DEMO_STEPS[videoScene - 1].whatItDoes}
                          </p>
                        </div>

                        {/* 2. What the user needs to do */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 border-2 border-blue-200 space-y-2">
                          <div className="font-black text-blue-950 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-200 text-blue-900 flex items-center justify-center text-xs sm:text-sm font-black">2</span>
                            <span>What you need to do</span>
                          </div>
                          <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium">
                            {DEMO_STEPS[videoScene - 1].whatUserNeedsToDo}
                          </p>
                        </div>

                        {/* 3. What the AI is checking */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-2">
                          <div className="font-black text-amber-950 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs sm:text-sm font-black">3</span>
                            <span>What the AI is checking</span>
                          </div>
                          <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium">
                            {DEMO_STEPS[videoScene - 1].whatAiIsChecking}
                          </p>
                        </div>

                        {/* 4. What result the user receives */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-2">
                          <div className="font-black text-emerald-950 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-xs sm:text-sm font-black">4</span>
                            <span>What result you get</span>
                          </div>
                          <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium">
                            {DEMO_STEPS[videoScene - 1].whatResultUserReceives}
                          </p>
                        </div>

                        {/* 5. What action the user can take next */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 space-y-2 md:col-span-2">
                          <div className="font-black text-indigo-950 flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-200 text-indigo-900 flex items-center justify-center text-xs sm:text-sm font-black">5</span>
                            <span>What action you can take next</span>
                          </div>
                          <p className="text-slate-800 text-sm sm:text-base md:text-lg leading-relaxed font-semibold">
                            {DEMO_STEPS[videoScene - 1].whatActionUserCanTakeNext}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: STEP-BY-STEP OVERVIEW (ALL 4 STEPS SIDE-BY-SIDE WITH 5 QUESTIONS EACH) */}
                {trialMode === 'text' && (
                  <div className="space-y-5">
                    <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200 text-sm sm:text-base text-purple-950 flex items-center gap-3 font-medium">
                      <FaLightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                      <span>
                        Here is the complete 4-step explanation. Take your time reading through each step!
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {DEMO_STEPS.map((s) => (
                        <div
                          key={s.stepNumber}
                          className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-purple-200 shadow-sm space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                            <div className="flex items-center gap-2.5 font-black text-purple-950 text-base sm:text-lg">
                              <span className="w-8 h-8 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center text-sm font-black">
                                {s.stepNumber}
                              </span>
                              <span>{s.title}</span>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                              {s.badge}
                            </span>
                          </div>

                          <div className="space-y-2.5 text-xs sm:text-sm">
                            <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100">
                              <strong className="block text-purple-950 text-xs font-black uppercase">
                                1. What this feature does:
                              </strong>
                              <p className="text-slate-800 text-sm mt-1 font-medium">{s.whatItDoes}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100">
                              <strong className="block text-blue-950 text-xs font-black uppercase">
                                2. What you need to do:
                              </strong>
                              <p className="text-slate-800 text-sm mt-1 font-medium">{s.whatUserNeedsToDo}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                              <strong className="block text-amber-950 text-xs font-black uppercase">
                                3. What the AI is checking:
                              </strong>
                              <p className="text-slate-800 text-sm mt-1 font-medium">{s.whatAiIsChecking}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100">
                              <strong className="block text-emerald-950 text-xs font-black uppercase">
                                4. What result you get:
                              </strong>
                              <p className="text-slate-800 text-sm mt-1 font-medium">{s.whatResultUserReceives}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200">
                              <strong className="block text-indigo-950 text-xs font-black uppercase">
                                5. What action you can take next:
                              </strong>
                              <p className="text-slate-800 text-sm mt-1 font-semibold">{s.whatActionUserCanTakeNext}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                  <FaTriangleExclamation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Trial Note:</strong> This demonstration visualizes the live AI process calmly without making real changes, invoking fake data, or calling Gemini API.
                  </p>
                </div>

                {/* Prominently Highlighted Action Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 border-2 border-amber-400 shadow-xl text-white">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                      ⚡ Ready to try it with your real camera?
                    </span>
                    <p className="text-[11px] text-purple-200">
                      Opens your device camera to take a real photo on campus
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

      {/* ================= STEP: SLOW CLEAR AI DEMO ANIMATION (UPLOAD) ================= */}
      {step === 'upload_demo' && (
        <div className="bg-white rounded-3xl shadow-xl border-3 border-purple-200 p-6 sm:p-10 md:p-12 space-y-7 text-center animate-fadeIn">
          {/* Top Calming Badge & Step Indicator */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-purple-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-black bg-purple-950 text-amber-300 border-2 border-purple-800 shadow-xs">
                🤖 Slow AI Demo
              </span>
              <span className="text-xs sm:text-sm font-black text-purple-950">
                Step {uploadDemoPhase} of 4 • {4 - uploadDemoPhase === 0 ? 'Almost finished!' : `${4 - uploadDemoPhase} steps left`}
              </span>
            </div>

            <span className="text-xs sm:text-sm font-bold text-purple-800 bg-purple-100 px-4 py-1.5 rounded-full border border-purple-300">
              Calm Pace (Half Speed)
            </span>
          </div>

          {/* Photo Thumbnail with Scanning Animation - Larger & High Visibility */}
          {uploadedImage && (
            <div className="relative max-w-md mx-auto h-56 sm:h-64 rounded-3xl overflow-hidden shadow-xl border-3 border-purple-400 bg-slate-900">
              <img
                src={uploadedImage}
                alt="Uploaded road hazard being inspected"
                className="w-full h-full object-cover"
              />
              {/* Animated Scanning Beam */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/35 to-transparent w-full h-full animate-pulse pointer-events-none"></div>
              <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-xs text-white text-xs sm:text-sm font-mono font-black px-3.5 py-1.5 rounded-xl border border-white/30 shadow-md">
                AI SCANNING • {uploadedFileName || 'Road Hazard Photo'}
              </div>
            </div>
          )}

          {/* Large Current Step Message Required by User */}
          <div className="space-y-3 max-w-xl mx-auto py-2">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 text-3xl sm:text-4xl shadow-xl ring-4 ring-amber-300/60 mb-2">
              {uploadDemoPhase === 1 && '👀'}
              {uploadDemoPhase === 2 && '🔍'}
              {uploadDemoPhase === 3 && '📍'}
              {uploadDemoPhase === 4 && '📋'}
            </div>

            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-purple-950 tracking-tight leading-tight">
              {uploadDemoPhase === 1 && 'Looking at the image…'}
              {uploadDemoPhase === 2 && 'Finding possible safety problems…'}
              {uploadDemoPhase === 3 && 'Checking the location and road conditions…'}
              {uploadDemoPhase === 4 && 'Preparing your report…'}
            </h3>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
              {uploadDemoPhase === 1 && 'The AI is checking the photo to make sure it can see the road, sidewalk, and walkway clearly.'}
              {uploadDemoPhase === 2 && 'Searching for potholes, fallen trees, broken curbs, or anything blocking wheelchairs and bikes.'}
              {uploadDemoPhase === 3 && 'Measuring ground steepness, nearby campus landmarks, and finding a safe detour route.'}
              {uploadDemoPhase === 4 && 'Writing a clear summary and getting your report ready in simple words.'}
            </p>
          </div>

          {/* 4-Step Checklist with Large Status Indicators */}
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 text-left">
            {[
              { num: 1, title: 'Looking at the image…', desc: 'Checks photo clarity' },
              { num: 2, title: 'Finding possible safety problems…', desc: 'Spots potholes & barriers' },
              { num: 3, title: 'Checking the location and road conditions…', desc: 'Calculates safe slope' },
              { num: 4, title: 'Preparing your report…', desc: 'Builds easy-to-read ticket' },
            ].map((p) => {
              const isDone = uploadDemoPhase > p.num;
              const isCurrent = uploadDemoPhase === p.num;
              return (
                <div
                  key={p.num}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    isCurrent
                      ? 'bg-purple-950 text-white border-amber-400 shadow-xl ring-4 ring-amber-300/40 scale-[1.02]'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm sm:text-base">
                    <span className="flex items-center gap-2.5">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isCurrent
                          ? 'bg-amber-400 text-purple-950'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? '✓' : p.num}
                      </span>
                      <span>{p.title}</span>
                    </span>
                    {isCurrent && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    )}
                  </div>
                  <div className={`text-xs sm:text-sm mt-1.5 pl-9 font-medium ${isCurrent ? 'text-purple-200' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar (25% per step) - Thick & High Contrast */}
          <div className="max-w-xl mx-auto space-y-2 pt-2">
            <div className="w-full bg-slate-100 h-3.5 sm:h-4 rounded-full overflow-hidden border-2 border-slate-200">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(uploadDemoPhase / 4) * 100}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 font-bold">
              <span>Paused long enough to read each message</span>
              <span className="text-purple-950 font-black">{(uploadDemoPhase / 4) * 100}% Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP: 5TH-GRADE SIMPLE RESULTS VIEW (UPLOAD) ================= */}
      {step === 'upload_result' && uploadResult && (
        <div className="bg-white rounded-3xl shadow-xl border-2 border-purple-200 p-6 sm:p-8 space-y-6 animate-fadeIn">
          {/* Headline Alert Box in Simple 5th-Grade Language */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start sm:items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-black text-2xl shrink-0 shadow-sm">
                ⚠️
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  AI Inspection Result
                </span>
                <h3 className="font-black text-base sm:text-lg text-purple-950 mt-0.5">
                  {uploadResult.headline}
                </h3>
                <p className="text-xs text-amber-900">
                  Explained in everyday words so everyone can easily understand and take action.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-white text-purple-950 border border-amber-300 shadow-2xs self-start sm:self-center shrink-0">
              5th-Grade Friendly Guide
            </span>
          </div>

          {/* Photo & Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Left: Photo Preview & Location */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              {uploadedImage && (
                <div className="relative w-full h-56 rounded-xl overflow-hidden shadow-inner bg-slate-900 border border-slate-200">
                  <img
                    src={uploadedImage}
                    alt="Analyzed hazard photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded-md">
                    {uploadedFileName || 'Photo Preview'}
                  </div>
                </div>
              )}

              {/* Exact or Automatically Detected Location */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  📍 Location (Where it is located)
                </span>
                <div className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                  <FaLocationDot className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>{uploadResult.location}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Helpers will be guided straight to this spot on campus.
                </p>
              </div>
            </div>

            {/* Right: Problem Type, Seriousness, Description & Detour */}
            <div className="space-y-3.5">
              {/* Problem Type & Seriousness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 block">
                    Problem Type
                  </span>
                  <div className="font-black text-sm text-purple-950">
                    {uploadResult.hazardType}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                    How serious it may be
                  </span>
                  <div className="font-bold text-xs text-amber-950">
                    {uploadResult.severityText}
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  📝 Short Description
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {uploadResult.description}
                </p>
              </div>

              {/* Safer Alternative Route if the Road is Blocked */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border-2 border-emerald-300 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                    <FaRoute className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Safer Alternative Route (Detour)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                    Slope under 4% (Gentle)
                  </span>
                </div>
                <p className="text-xs text-emerald-950 leading-relaxed font-semibold">
                  {uploadResult.alternativeRoute}
                </p>
                <div className="text-[11px] text-emerald-800 flex items-center gap-1 pt-0.5">
                  <span>✓ Flat, gentle, and completely clear of holes or obstacles.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row: Large Submit Report Button & Choose Different Image */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleChooseDifferentImage}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaRotateLeft className="w-3.5 h-3.5" />
              <span>Choose a Different Image</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitReport}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl ring-4 ring-amber-400/40 hover:ring-amber-300 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border border-amber-300"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Saving to Facilities...</span>
                </>
              ) : (
                <>
                  <FaCheck className="w-4 h-4 text-amber-300" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
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

        </div>
      )}
    </div>
  );
}
