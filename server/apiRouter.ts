import { Router, Request, Response } from 'express';
import { 
  analyzeAccessibilityHazard, 
  planAccessibleRouteAI, 
  processGeminiVoiceQuery,
  transcribeAudioWithGemini,
  generateGeminiSpeech
} from './geminiService';
import { INITIAL_REPORTS, SFSU_BUILDINGS, TRANSIT_ALERTS } from '../src/data/sfsuCampusData';
import { AccessibilityReport, AssistanceRequest } from '../src/types';

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
    const { textDescription, locationName, imageBase64, mimeType } = req.body;

    let imagePart;
    if (imageBase64) {
      // Strip data:image/...;base64, prefix if present
      const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      imagePart = {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      };
    }

    const analysis = await analyzeAccessibilityHazard({
      textDescription,
      locationName,
      imagePart,
    });

    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Error in /analyze-hazard:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze hazard',
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

// Helper to decode Google Maps polyline string into coordinates
function decodeGooglePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

// 2b. Google Maps Walking Directions API proxy
apiRouter.post('/directions', async (req: Request, res: Response) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ success: false, error: 'origin and destination coordinates required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=walking`;

    if (!apiKey) {
      return res.json({
        success: true,
        pathCoordinates: [origin, destination],
        distanceMeters: 350,
        estimatedMinutes: 5,
        googleMapsUrl,
        source: 'direct_fallback',
      });
    }

    const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=walking&key=${apiKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const pathCoordinates = decodeGooglePolyline(route.overview_polyline.points);

      const steps = (leg.steps || []).map((step: any) => ({
        instruction: step.html_instructions ? step.html_instructions.replace(/<[^>]*>/g, '') : 'Walk along path',
        distance: step.distance?.text || '',
        duration: step.duration?.text || '',
        coordinates: {
          lat: step.start_location.lat,
          lng: step.start_location.lng,
        },
      }));

      return res.json({
        success: true,
        pathCoordinates,
        distanceMeters: leg.distance?.value || 350,
        estimatedMinutes: Math.ceil((leg.duration?.value || 300) / 60),
        steps,
        googleMapsUrl,
        source: 'google_maps_directions_api',
      });
    }

    // Fallback: route along real SFSU campus pedestrian walkway network
    const CAMPUS_HUBS = [
      { name: '19th & Holloway Walkway', lat: 37.7234, lng: -122.4755 },
      { name: 'Holloway Ave North Sidewalk', lat: 37.7235, lng: -122.4770 },
      { name: 'Malcolm X Plaza Hub', lat: 37.7239, lng: -122.4782 },
      { name: 'North Quad Walkway', lat: 37.7245, lng: -122.4792 },
      { name: 'Tapia Drive ADA Corridor', lat: 37.7228, lng: -122.4775 },
    ];

    // Find the closest walkway hub to origin and destination
    function dist(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
      return Math.hypot(p1.lat - p2.lat, p1.lng - p2.lng);
    }

    const startHub = CAMPUS_HUBS.reduce((prev, curr) => dist(origin, curr) < dist(origin, prev) ? curr : prev, CAMPUS_HUBS[0]);
    const endHub = CAMPUS_HUBS.reduce((prev, curr) => dist(destination, curr) < dist(destination, prev) ? curr : prev, CAMPUS_HUBS[1]);

    const fallbackPoints: Array<{ lat: number; lng: number }> = [
      origin,
      { lat: origin.lat, lng: startHub.lng },
      startHub,
    ];

    if (startHub !== endHub) {
      fallbackPoints.push({ lat: (startHub.lat + endHub.lat) / 2, lng: (startHub.lng + endHub.lng) / 2 });
      fallbackPoints.push(endHub);
    }

    fallbackPoints.push({ lat: destination.lat, lng: endHub.lng });
    fallbackPoints.push(destination);

    return res.json({
      success: true,
      pathCoordinates: fallbackPoints,
      distanceMeters: Math.round(dist(origin, destination) * 111000 * 1.3),
      estimatedMinutes: Math.max(3, Math.round((dist(origin, destination) * 111000 * 1.3) / 75)),
      googleMapsUrl,
      source: 'campus_pedestrian_network_fallback',
    });
  } catch (error: any) {
    console.error('Error fetching Google Directions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get All Accessibility Reports
apiRouter.get('/reports', (_req: Request, res: Response) => {
  res.json({
    success: true,
    reports,
  });
});

// 4. Submit New Accessibility Report & Generate Facilities Work Order
apiRouter.post('/reports', (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      locationName,
      buildingId,
      coordinates,
      urgency,
      photoUrl,
      aiAnalysis,
      reporterName,
    } = req.body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const facilitiesWorkOrderId = `SFSU-FAC-2026-${randomSuffix}`;

    const newReport: AccessibilityReport = {
      id: `rep-${Date.now()}`,
      title: title || 'Campus Accessibility Incident',
      description: description || 'Reported barrier on SFSU campus',
      category: category || 'other',
      locationName: locationName || 'SFSU Main Campus',
      buildingId,
      coordinates: coordinates || { lat: 37.7238, lng: -122.4785 },
      urgency: urgency || aiAnalysis?.suggestedPriority || 'medium',
      status: 'work_order_created',
      facilitiesWorkOrderId,
      photoUrl,
      aiAnalysis,
      upvotes: 1,
      reportedAt: 'Just now',
      updatedAt: 'Just now',
      reporterName: reporterName || 'Anonymous SFSU Student',
    };

    // Prepend new report to top
    reports = [newReport, ...reports];

    // If report is broken elevator, update elevator state in building
    if (category === 'broken_elevator' && buildingId) {
      const bldg = buildings.find((b) => b.id === buildingId);
      if (bldg && bldg.elevators.length > 0) {
        bldg.elevators[0].status = 'down';
        bldg.elevators[0].lastChecked = 'Just now (Student Report)';
      }
    }

    res.status(201).json({
      success: true,
      report: newReport,
      message: `Work Order ${facilitiesWorkOrderId} successfully created and dispatched to SFSU Facilities Services.`,
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
apiRouter.get('/transit-alerts', (_req: Request, res: Response) => {
  res.json({
    success: true,
    alerts: TRANSIT_ALERTS,
  });
});

// 11. Gemini Voice Accessibility Assistant
apiRouter.post('/gemini/voice-assist', async (req: Request, res: Response) => {
  try {
    const { query, audioBase64, mimeType } = req.body;

    let userQuery = query ? String(query).trim() : '';

    // If real microphone audio is sent, transcribe it using Gemini 3.5 Transcribe
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

// 12. Export Project Archive (.tar.gz) for easy local download
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
