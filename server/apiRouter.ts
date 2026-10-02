import { Router, Request, Response } from 'express';
import { 
  analyzeAccessibilityHazard, 
  planAccessibleRouteAI, 
  processVoiceAgentQuery,
  transcribeAudioWithGemini,
  processGeminiVoiceQuery 
} from './geminiService';
import { INITIAL_REPORTS, SFSU_BUILDINGS } from '../src/data/sfsuCampusData';
import { AccessibilityReport, AssistanceRequest } from '../src/types';

import { readBartTransit } from './bartTransitService';

export const apiRouter = Router();

// In-memory persistent data store
let reports: AccessibilityReport[] = [...INITIAL_REPORTS];
let buildings = [...SFSU_BUILDINGS];
let assistanceRequests: AssistanceRequest[] = [
  {
    id: 'req-1',
    requesterName: 'Maya L.',
    requesterPhone: '(415) 555-0192',
    mobilityNeeds: 'Power wheelchair user; needs low-floor cart or ramp escort',
    serviceType: 'gator_mobility_cart',
    pickupLocation: '19th Ave & Holloway Muni Station',
    dropoffLocation: 'Fine Arts Building Room 102',
    pickupCoordinates: { lat: 37.7234, lng: -122.475 },
    status: 'in_transit',
    etaMinutes: 4,
    vehicleAssigned: 'Gator Cart #3 (Electric 6-Seater with Flip-Ramp)',
    driverName: 'Officer Dave (SFSU UPD)',
    requestedAt: '15 mins ago',
    notes: 'Arrived on inbound train. Heavy backpack.',
  },
  {
    id: 'req-2',
    requesterName: 'Kevin S.',
    requesterPhone: '(415) 555-0814',
    mobilityNeeds: 'Temporary crutches (knee surgery); avoid stairs',
    serviceType: 'safety_escort',
    pickupLocation: 'Lot 20 Parking Garage Level 3 Bridge',
    dropoffLocation: 'Thornton Hall Room 310',
    status: 'assigned',
    etaMinutes: 7,
    vehicleAssigned: 'Student Safety Escort Team B',
    driverName: 'Alex P. (Community Service Specialist)',
    requestedAt: '5 mins ago',
  },
];

// 1. Analyze Accessibility Hazard with Gemini Multimodal AI
apiRouter.post('/analyze-hazard', async (req: Request, res: Response) => {
  try {
    const { textDescription, locationName, imageBase64, mimeType, sampleType, clientGps } = req.body;

    // Check for missing image
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Image: Please take a picture before analyzing.',
      });
    }

    // Check for oversized image (> 15MB)
    if (imageBase64.length > 15 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Oversized Image: The captured picture exceeds the maximum allowed payload size (15MB). Please retake the photo.',
      });
    }

    // Strip data:image/...;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Image: The captured picture data is empty or corrupt. Please retake the picture.',
      });
    }

    const imagePart = {
      mimeType: mimeType || 'image/jpeg',
      data: cleanBase64,
    };

    const analysis = await analyzeAccessibilityHazard({
      textDescription,
      locationName,
      imagePart,
      sampleType,
      clientGps,
    });

    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Error in /analyze-hazard:', error.message);
    const msg = error.message || 'Failed to analyze hazard';
    let statusCode = 500;
    if (msg.includes('Missing API Key')) statusCode = 401;
    else if (msg.includes('Quota Limit Exceeded')) statusCode = 429;
    else if (msg.includes('Invalid Model')) statusCode = 400;
    else if (msg.includes('Invalid Image') || msg.includes('Oversized Image')) statusCode = 400;
    else if (msg.includes('Analysis Timeout')) statusCode = 504;

    res.status(statusCode).json({
      success: false,
      error: msg,
    });
  }
});

// 2. Plan AI Accessible Campus Route
apiRouter.post('/suggest-route', async (req: Request, res: Response) => {
  try {
    const { origin, destination, mobilityProfile, activeBarriers } = req.body;

    const routePlan = await planAccessibleRouteAI({
      origin: origin || '19th & Holloway Transit Hub',
      destination: destination || 'Cesar Chavez Student Center',
      mobilityProfile: mobilityProfile || 'Wheelchair / Reduced Mobility',
      activeBarriers: activeBarriers || reports.filter((r) => r.status !== 'resolved').map((r) => `${r.title} at ${r.locationName}`),
    });

    res.json({
      success: true,
      routePlan,
    });
  } catch (error: any) {
    console.error('Error in /suggest-route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to plan route',
    });
  }
});

// 3. Get All Accessibility Reports
apiRouter.get('/reports', (_req: Request, res: Response) => {
  res.json({
    success: true,
    reports,
  });
});

// 4. Submit New Accessibility Report & Generate Facilities Work Order (Firebase Firestore / Demo Mode)
apiRouter.post('/reports', async (req: Request, res: Response) => {
  try {
    const {
      reportId: customReportId,
      hazardType,
      severity,
      summary,
      accessibilityImpact,
      description,
      location,
      imageUrl,
      recommendedAction,
      createdAt: customCreatedAt,
      status: customStatus,
      // Optional extra fields for map/building coordination
      buildingId,
      coordinates,
      aiAnalysis,
      title,
      category,
      locationName,
      urgency,
      photoUrl,
      reporterName,
    } = req.body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = customReportId || `SFSU-REP-2026-${randomSuffix}`;
    const facilitiesWorkOrderId = `SFSU-FAC-2026-${randomSuffix}`;
    const createdAt = customCreatedAt || new Date().toISOString();
    const status = customStatus || 'pending';

    const finalHazardType = hazardType || title || 'Blocked path';
    const finalSeverity = severity || urgency || 'high';
    const finalSummary = summary || description || 'Reported accessibility barrier on SFSU campus';
    const finalAccessibilityImpact =
      accessibilityImpact || aiAnalysis?.accessibilityImpact || 'Wheelchair users may be unable to reach the building entrance';
    const finalLocation = location || locationName || 'SFSU Main Campus';
    const finalImageUrl = imageUrl || photoUrl || '';
    const finalRecommendedAction =
      recommendedAction || aiAnalysis?.recommendedAction || aiAnalysis?.suggestedDetour || 'Use alternate entrance and submit facilities report';

    // Firestore record matching exact schema specified in user prompt
    const firestoreRecord = {
      reportId,
      hazardType: finalHazardType,
      severity: finalSeverity,
      summary: finalSummary,
      accessibilityImpact: finalAccessibilityImpact,
      description: finalSummary,
      recommendedAction: finalRecommendedAction,
      location: finalLocation,
      imageUrl: finalImageUrl,
      createdAt,
      status,
    };

    let savedToFirebase = false;
    // Attempt Firestore persistence if Firebase environment is configured
    try {
      if (process.env.FIREBASE_CONFIG || process.env.VITE_FIREBASE_API_KEY) {
        // Dynamic import to avoid crash if unconfigured
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
        const db = getFirestore(app);
        await setDoc(doc(db, 'reports', reportId), firestoreRecord);
        savedToFirebase = true;
      }
    } catch (fbErr) {
      console.log('Firebase not configured, running in Demo Mode (In-memory storage):', fbErr);
    }

    // Also populate app-wide AccessibilityReport for Map, Elevators, and Dashboard sync
    const mappedCategory = (
      finalHazardType.toLowerCase().includes('elevator')
        ? 'broken_elevator'
        : finalHazardType.toLowerCase().includes('slope') || finalHazardType.toLowerCase().includes('ramp')
        ? 'steep_slope'
        : finalHazardType.toLowerCase().includes('door')
        ? 'locked_door'
        : 'obstructed_path'
    ) as any;

    const newReport: AccessibilityReport = {
      id: reportId,
      title: `${finalHazardType} - ${finalLocation}`,
      description: finalSummary,
      category: category || mappedCategory,
      locationName: finalLocation,
      buildingId,
      coordinates: coordinates || { lat: 37.7238, lng: -122.4785 },
      urgency: (finalSeverity === 'high' ? 'critical' : finalSeverity === 'medium' ? 'high' : 'medium') as any,
      status: 'work_order_created',
      facilitiesWorkOrderId,
      photoUrl: finalImageUrl,
      aiAnalysis: aiAnalysis || {
        detectedHazard: finalHazardType,
        hazardDescription: finalSummary,
        adaComplianceStatus: 'non_compliant',
        suggestedPriority: finalSeverity === 'high' ? 'critical' : 'high',
        suggestedWorkOrderType: 'Facilities Services Accessibility Maintenance',
        estimatedFixEffort: '1-2 hours',
        suggestedDetour: finalRecommendedAction,
        recommendedHotlineAction: 'DPRC Hotline notified. Dispatching student golf cart escort.',
        confidence: 0.95,
      },
      upvotes: 1,
      reportedAt: 'Just now',
      updatedAt: 'Just now',
      reporterName: reporterName || 'Anonymous SFSU Student',
    };

    // Prepend to in-memory list
    reports = [newReport, ...reports];

    // If report is broken elevator, update elevator state in building
    if ((category === 'broken_elevator' || finalHazardType.toLowerCase().includes('elevator')) && buildingId) {
      const bldg = buildings.find((b) => b.id === buildingId);
      if (bldg && bldg.elevators.length > 0) {
        bldg.elevators[0].status = 'down';
        bldg.elevators[0].lastChecked = 'Just now (Student Report)';
      }
    }

    res.status(201).json({
      success: true,
      report: firestoreRecord,
      reportId,
      status: 'pending',
      facilitiesWorkOrderId,
      savedToFirebase,
      isDemoMode: !savedToFirebase,
      message: `Report ${reportId} submitted successfully. Status: pending review.`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create report',
    });
  }
});

// 5. Upvote / Confirm Accessibility Report
apiRouter.post('/reports/:id/upvote', (req: Request, res: Response) => {
  const { id } = req.params;
  const report = reports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  report.upvotes += 1;
  // Escalate to high or critical if upvotes reach thresholds
  if (report.upvotes >= 10 && report.urgency !== 'critical') {
    report.urgency = 'critical';
  } else if (report.upvotes >= 5 && report.urgency === 'low') {
    report.urgency = 'high';
  }

  res.json({
    success: true,
    upvotes: report.upvotes,
    urgency: report.urgency,
  });
});

// 6. Update Report Status (e.g., DPRC / Facilities resolution)
apiRouter.patch('/reports/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const report = reports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  report.status = status;
  report.updatedAt = 'Just now';
  res.json({ success: true, report });
});

// 7. Campus Buildings & Elevators
apiRouter.get('/buildings', (_req: Request, res: Response) => {
  res.json({
    success: true,
    buildings,
  });
});

// 8. Toggle Elevator Status for Live Testing
apiRouter.patch('/elevators/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  let foundElevator: any = null;
  for (const bldg of buildings) {
    const elev = bldg.elevators.find((e) => e.id === id);
    if (elev) {
      elev.status = status;
      elev.lastChecked = 'Just now';
      foundElevator = elev;
      break;
    }
  }

  if (!foundElevator) {
    return res.status(404).json({ success: false, error: 'Elevator not found' });
  }

  res.json({ success: true, elevator: foundElevator });
});

// 9. Assistance Requests (Gator Mobility & Escort)
apiRouter.get('/assistance-requests', (_req: Request, res: Response) => {
  res.json({
    success: true,
    requests: assistanceRequests,
  });
});

apiRouter.post('/assistance-request', (req: Request, res: Response) => {
  const { requesterName, requesterPhone, mobilityNeeds, serviceType, pickupLocation, dropoffLocation, notes } = req.body;

  const isCart = serviceType === 'gator_mobility_cart';
  const newRequest: AssistanceRequest = {
    id: `req-${Date.now()}`,
    requesterName: requesterName || 'Gator Student',
    requesterPhone: requesterPhone || '(415) 555-0100',
    mobilityNeeds: mobilityNeeds || 'Campus accessibility assistance requested',
    serviceType: serviceType || 'gator_mobility_cart',
    pickupLocation: pickupLocation || 'Cesar Chavez Student Center Plaza',
    dropoffLocation: dropoffLocation || 'Library Main Entrance',
    status: 'assigned',
    etaMinutes: Math.floor(3 + Math.random() * 5),
    vehicleAssigned: isCart ? 'Gator Mobility Electric Cart #2 (Wheelchair Accessible)' : 'UPD Student Escort Unit',
    driverName: isCart ? 'Gator Operator Sam R.' : 'Safety Officer Chris',
    requestedAt: 'Just now',
    notes,
  };

  assistanceRequests = [newRequest, ...assistanceRequests];

  res.status(201).json({
    success: true,
    request: newRequest,
    message: `${newRequest.vehicleAssigned} has been dispatched to ${newRequest.pickupLocation}. Estimated ETA: ${newRequest.etaMinutes} minutes.`,
  });
});

// 10. Transit Alerts
apiRouter.get('/transit-alerts', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, ...await readBartTransit() });
  } catch {
    res.status(503).json({ success: false, error: 'Transit data unavailable from Firestore' });
  }
});

// 11. Export Project Archive (.tar.gz) for easy local download
apiRouter.get('/export-archive', (_req: Request, res: Response) => {
  try {
    const { execSync } = require('child_process');
    const archivePath = '/tmp/gatoraccess-sfhacks-2026.tar.gz';
    execSync(`tar --exclude='node_modules' --exclude='.gmp_cache' --exclude='dist' -czf ${archivePath} -C . .`);
    res.download(archivePath, 'gatoraccess-sfhacks-2026.tar.gz');
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Site-wide Voice AI Agent (Gemini Spoken Accessibility Guide)
apiRouter.post('/voice-agent', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query text is required' });
    }

    const result = await processVoiceAgentQuery({
      userQuery: query,
      context,
    });

    res.json({
      success: true,
      reply: result.reply,
      suggestedAction: result.suggestedAction,
    });
  } catch (err: any) {
    console.error('Error handling voice agent request:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Gemini Voice Assistant endpoint with audio transcription support
apiRouter.post('/gemini/voice-assist', async (req: Request, res: Response) => {
  try {
    const { query, audioBase64, mimeType } = req.body;
    let userQuery = query ? String(query).trim() : '';

    if (!userQuery && audioBase64) {
      userQuery = await transcribeAudioWithGemini(audioBase64, mimeType || 'audio/webm');
    }

    if (!userQuery) {
      return res.json({
        success: true,
        result: {
          identifiedNeed: 'No clear speech detected',
          targetTab: 'map',
          openModal: 'none',
          transcription: '',
          spokenResponse: "I couldn't hear clearly. Please tap the mic and speak your accessibility need, or type below.",
          uiFeedback: 'No speech detected — please try speaking again',
          suggestedQuickActions: [
            'Request Gator Cart ride',
            'Check Cesar Chavez elevators',
            'Find step-free path to Library',
          ],
        },
      });
    }

    const result = await processGeminiVoiceQuery(userQuery);
    result.transcription = userQuery;

    res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('Error in /gemini/voice-assist:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal voice assist error' });
  }
});

