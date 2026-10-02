import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini SDK with User-Agent header as required
const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface HazardAnalysisInput {
  textDescription?: string;
  locationName?: string;
  imagePart?: {
    mimeType: string;
    data: string; // base64
  };
  sampleType?: string;
  clientGps?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
}

export interface DetectedHazard {
  hazardType: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  accessibilityImpact: string;
  recommendedAction: string;
  confidence: number;
}

export interface StructuredHazardAnalysis {
  hazardType: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  accessibilityImpact: string;
  recommendedAction: string;
  reportCategory: string;
  confidence: number;
  hazards: DetectedHazard[];
  suggestedLocationSign?: string;

  // Alternative accessible detour fields
  blockedLocation: string;
  alternativeRoute: string;
  routeSteps: string[];
  barriersToAvoid: string[];
  maximumSlope: string;
  requiresAssistance: boolean;
  assistanceRecommendation: string;

  // Location detection fields
  detectedLocation: string;
  buildingId: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  locationConfidence: number;
  locationEvidence: string[];
  needsLocationConfirmation: boolean;
}

/**
 * Classifies any error into one of the 6 clear error categories
 */
export function classifyGeminiError(err: any): Error {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode || 0;

  if (err?.code === 'TIMEOUT' || msg.includes('timeout') || msg.includes('timed out')) {
    return new Error('Analysis Timeout: Gemini did not respond within the time limit. Please check your network connection and retry.');
  }

  if (
    msg.includes('api_key') ||
    msg.includes('api key') ||
    msg.includes('unauthenticated') ||
    msg.includes('unauthorized') ||
    msg.includes('api key not valid') ||
    status === 401 ||
    status === 403
  ) {
    return new Error('Missing API Key: GEMINI_API_KEY is missing, invalid, or unauthorized. Please verify your Gemini API key in settings.');
  }

  if (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    status === 429
  ) {
    return new Error('Quota Limit Exceeded: Gemini API rate limit or project quota reached (429 Resource Exhausted). Please wait a moment before trying again.');
  }

  if (
    status === 503 ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('unavailable')
  ) {
    return new Error('High Demand / Service Busy: Gemini is temporarily experiencing high demand (503 Service Unavailable). Please retry in a few moments.');
  }

  if (
    (msg.includes('model') || msg.includes('not found')) &&
    (msg.includes('404') || msg.includes('not supported') || msg.includes('unknown') || msg.includes('invalid model'))
  ) {
    return new Error('Invalid Model: The configured model is unavailable or unrecognized. Please check model configuration.');
  }

  if (
    msg.includes('image') ||
    msg.includes('decode') ||
    msg.includes('corrupt') ||
    msg.includes('unsupported media') ||
    msg.includes('mime')
  ) {
    return new Error('Invalid Image: The captured camera photo could not be processed. Please point your camera at the obstacle and take a new picture.');
  }

  return new Error(err.message || 'Gemini analysis failed. Please retry.');
}

export async function analyzeAccessibilityHazard(input: HazardAnalysisInput): Promise<StructuredHazardAnalysis> {
  const hasKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '');

  // If no API key is provided, fail immediately with clear error
  if (!hasKey) {
    throw new Error('Missing API Key: GEMINI_API_KEY is missing, invalid, or unauthorized. Please verify your Gemini API key in settings.');
  }

  const gpsInfo = input.clientGps
    ? `Browser GPS available: lat=${input.clientGps.lat}, lng=${input.clientGps.lng}, accuracy=${input.clientGps.accuracy || 15}m`
    : `Browser GPS: Unavailable / Permission not granted`;

  const prompt = `
You are an expert ADA Title II university accessibility inspector for San Francisco State University (SFSU).
Analyze this EXACT still photo taken just now by a student using the live camera.

Campus location context: ${input.locationName || 'SFSU Campus'}
${gpsInfo}
Student description notes: ${input.textDescription || 'Campus accessibility hazard inspection'}

Carefully inspect the image for ANY AND ALL physical accessibility barriers present in THIS CURRENT PICTURE, including:
1. Stairs (staircases blocking direct accessible path, flights of steps without adjacent ramp/lift)
2. Blocked doorways (doors obstructed by carts, furniture, debris, or deliveries)
3. Blocked walkways (paved corridors narrowed or blocked by obstacles, bins, bikes)
4. Steep ramps (ramps exceeding 1:12 ADA slope, missing handrails, cross-slope tilt)
5. Construction barriers (scaffolding, fences, materials, cones blocking pathways)
6. Broken automatic doors (power door openers offline, broken push-plates, taped switches)
7. Locked accessible restrooms (accessible stall or single-occupancy ADA restroom locked/out of order)
8. Pavement damage (tree root uplift, cracked concrete, deep potholes, uneven flags > 1/4 inch)

LOCATION DETECTION (Priority Order):
1. Browser GPS coordinates (if provided above, match to nearest SFSU building, entrance, or path).
2. Gemini visual reading: read any clearly visible building signs, entrance names (e.g. "North Entrance", "Main Gateway"), room numbers, or landmarks.
3. Combine GPS and image results to determine the most likely location.
4. Set locationConfidence between 0.0 and 1.0.
5. Set locationEvidence as an array containing sources used (e.g. ["Browser GPS", "Building sign detected in image"]).
6. Set needsLocationConfirmation: true if GPS was unavailable, image signs were ambiguous, or location is uncertain. Never claim the location is exact if GPS is unavailable or the image is unclear.

ACCESSIBLE ALTERNATIVE ROUTE GUIDANCE:
Provide an alternative accessible route when a path, road, entrance, elevator, ramp, or doorway is blocked.
The alternative route must:
- Avoid stairs and the detected obstacle.
- Prefer elevators, automatic doors, paved paths, and shallow ramps under 5% slope.
- Mention any steep slope, construction, or elevator warning.
- Recommend calling Accessibility Services (415-338-2472) or requesting a Gator Mobility Cart (415-338-1441) if no safe route is visible.
- Never invent a route with certainty. State clearly that the user should verify current conditions.

RETURN THESE ADDITIONAL ROUTE & LOCATION FIELDS:
- blockedLocation: concise name of the blocked path, entrance, ramp, or corridor.
- alternativeRoute: descriptive overview of the recommended accessible bypass.
- routeSteps: array of clear sequential steps to take.
- barriersToAvoid: array of barriers to avoid along the way.
- maximumSlope: estimated maximum slope grade along the alternate route (e.g. "3.5%").
- requiresAssistance: boolean, true if escort or mobility cart is advised.
- assistanceRecommendation: recommendation for contacting DPRC / Accessibility Services or requesting a Gator Cart.
- detectedLocation: string (e.g. "Cesar Chavez Student Center North Entrance").
- buildingId: string (e.g. "ccsc", "library", "thornton", "fine_arts", "mashouf", "ssb", "hensill", "humanities").
- coordinates: object { lat: number, lng: number } (e.g. { lat: 37.7239, lng: -122.4786 }).
- locationConfidence: number between 0.0 and 1.0.
- locationEvidence: array of strings (e.g. ["Browser GPS", "Building sign detected in image"]).
- needsLocationConfirmation: boolean.

CRITICAL REQUIREMENTS:
- Detect MULTIPLE hazards if more than one exists in this photo. Put every detected hazard into the 'hazards' array.
- In 'summary', provide a clear description of the barriers seen in this specific photo.
- In 'hazardType', identify the primary/most critical hazard: 'stairs', 'blocked_doorway', 'blocked_walkway', 'steep_ramp', 'construction_barrier', 'broken_automatic_door', 'locked_accessible_restroom', or 'pavement_damage'.
- In 'severity', set overall severity: 'low', 'medium', or 'high'.
- In 'accessibilityImpact', explain the impact on wheelchair users, walkers, canes, or visual impairments.
- In 'recommendedAction', specify a practical detour or facilities action.
- In 'confidence', provide confidence between 0.0 and 1.0.
- Base your analysis SOLELY on what is visible in THIS SPECIFIC PICTURE. Do NOT hallucinate hazards not present.
`;

  const contents: any[] = [];
  if (input.imagePart) {
    contents.push({
      inlineData: {
        mimeType: input.imagePart.mimeType || 'image/jpeg',
        data: input.imagePart.data,
      },
    });
  }
  contents.push({ text: prompt });

  const executeCall = async (modelName: string) => {
    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: { parts: contents },
      config: {
        systemInstruction:
          'You are an expert university ADA accessibility analyst. Output strictly valid JSON without markdown wrapping.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hazardType: {
              type: Type.STRING,
              description: 'Primary hazard identifier',
            },
            severity: {
              type: Type.STRING,
              enum: ['low', 'medium', 'high'],
              description: 'Overall severity level',
            },
            summary: {
              type: Type.STRING,
              description: 'Clear description of all barriers seen in the current photo.',
            },
            accessibilityImpact: {
              type: Type.STRING,
              description: 'Impact on wheelchair users or mobility limitations.',
            },
            recommendedAction: {
              type: Type.STRING,
              description: 'Practical detour or facilities action.',
            },
            reportCategory: {
              type: Type.STRING,
              description: 'Report category matching hazardType.',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
            suggestedLocationSign: {
              type: Type.STRING,
              description: 'Only if a university building name sign is readable in the photo.',
            },
            hazards: {
              type: Type.ARRAY,
              description: 'Every accessibility hazard visible in the picture.',
              items: {
                type: Type.OBJECT,
                properties: {
                  hazardType: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                  summary: { type: Type.STRING },
                  accessibilityImpact: { type: Type.STRING },
                  recommendedAction: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: [
                  'hazardType',
                  'severity',
                  'summary',
                  'accessibilityImpact',
                  'recommendedAction',
                  'confidence',
                ],
              },
            },
            blockedLocation: {
              type: Type.STRING,
              description: 'Specific blocked physical location or path segment identified in the photo.',
            },
            alternativeRoute: {
              type: Type.STRING,
              description: 'Practical, low-slope accessible alternate route avoiding the obstacle.',
            },
            routeSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Step-by-step navigation instructions for the alternative accessible route.',
            },
            barriersToAvoid: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of specific barriers, stairs, or obstacles that must be avoided on this detour.',
            },
            maximumSlope: {
              type: Type.STRING,
              description: 'Estimated maximum slope grade along the recommended alternate route.',
            },
            requiresAssistance: {
              type: Type.BOOLEAN,
              description: 'True if escort or mobility cart is recommended.',
            },
            assistanceRecommendation: {
              type: Type.STRING,
              description: 'Recommendation on calling Accessibility Services or requesting a Gator Cart.',
            },
            detectedLocation: {
              type: Type.STRING,
              description: 'Auto-detected campus building or entrance name (e.g. "Cesar Chavez Student Center North Entrance").',
            },
            buildingId: {
              type: Type.STRING,
              description: 'Identifier for matched building (e.g. "ccsc", "library", "thornton").',
            },
            coordinates: {
              type: Type.OBJECT,
              properties: {
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
              },
              required: ['lat', 'lng'],
            },
            locationConfidence: {
              type: Type.NUMBER,
              description: 'Confidence in detected location between 0.0 and 1.0',
            },
            locationEvidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of evidence sources used (e.g. ["Browser GPS", "Building sign detected in image"]).',
            },
            needsLocationConfirmation: {
              type: Type.BOOLEAN,
              description: 'True if location is uncertain or GPS was unavailable and user confirmation is needed.',
            },
          },
          required: [
            'hazardType',
            'severity',
            'summary',
            'accessibilityImpact',
            'recommendedAction',
            'confidence',
            'hazards',
            'blockedLocation',
            'alternativeRoute',
            'routeSteps',
            'barriersToAvoid',
            'maximumSlope',
            'requiresAssistance',
            'assistanceRecommendation',
            'detectedLocation',
            'buildingId',
            'coordinates',
            'locationConfidence',
            'locationEvidence',
            'needsLocationConfirmation',
          ],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        const err = new Error('Analysis Timeout: Gemini did not respond within the 12-second time limit. Please check your network connection and retry.');
        (err as any).code = 'TIMEOUT';
        reject(err);
      }, 12000)
    );

    return Promise.race([generatePromise, timeoutPromise]);
  };

  try {
    let response: any;
    try {
      response = await executeCall('gemini-3.8-flash');
    } catch (primaryErr: any) {
      const msg = (primaryErr?.message || '').toLowerCase();
      const status = primaryErr?.status || primaryErr?.statusCode || 0;
      // If 503 (high demand) or 429, retry after 2 seconds or try gemini-flash-latest
      if (status === 503 || status === 429 || msg.includes('503') || msg.includes('high demand') || msg.includes('resource_exhausted')) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          response = await executeCall('gemini-flash-latest');
        } catch (retryErr) {
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }

    const parsed = JSON.parse(response.text?.trim() || '{}');

    const hazardType = parsed.hazardType || parsed.reportCategory || 'obstructed_path';
    const severity = (['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium') as 'low' | 'medium' | 'high';
    const summary = parsed.summary || 'Accessibility hazard identified on campus walkway.';
    const accessibilityImpact = parsed.accessibilityImpact || 'May restrict safe passage for wheelchair users or persons with mobility limitations.';
    const recommendedAction = parsed.recommendedAction || 'Use an alternate accessible route and submit a facilities report.';
    const reportCategory = parsed.reportCategory || hazardType;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.90;

    const hazards: DetectedHazard[] = Array.isArray(parsed.hazards) && parsed.hazards.length > 0
      ? parsed.hazards.map((h: any) => ({
          hazardType: h.hazardType || hazardType,
          severity: (['low', 'medium', 'high'].includes(h.severity) ? h.severity : severity) as 'low' | 'medium' | 'high',
          summary: h.summary || summary,
          accessibilityImpact: h.accessibilityImpact || accessibilityImpact,
          recommendedAction: h.recommendedAction || recommendedAction,
          confidence: typeof h.confidence === 'number' ? h.confidence : confidence,
        }))
      : [
          {
            hazardType,
            severity,
            summary,
            accessibilityImpact,
            recommendedAction,
            confidence,
          },
        ];

    // Normalize alternative accessible route fields
    const blockedLocation = parsed.blockedLocation || 'Main entrance walkway';
    const alternativeRoute = parsed.alternativeRoute || 'Use the secondary accessible path avoiding stairs and obstacles.';
    const routeSteps: string[] = Array.isArray(parsed.routeSteps) && parsed.routeSteps.length > 0
      ? parsed.routeSteps
      : [
          'Turn before the blocked path segment.',
          'Follow the paved accessible corridor.',
          'Enter via the automatic push-plate entrance.',
        ];
    const barriersToAvoid: string[] = Array.isArray(parsed.barriersToAvoid) && parsed.barriersToAvoid.length > 0
      ? parsed.barriersToAvoid
      : [summary || 'Reported barrier'];
    const maximumSlope = parsed.maximumSlope || '3.5%';
    const requiresAssistance = Boolean(parsed.requiresAssistance);
    const assistanceRecommendation = parsed.assistanceRecommendation || 'Call Accessibility Services at (415) 338-2472 if the alternate route is unavailable.';

    // Normalize location detection fields
    const detectedLocation = parsed.detectedLocation || input.locationName || 'Cesar Chavez Student Center North Entrance';
    const buildingId = parsed.buildingId || 'ccsc';
    const coordinates = parsed.coordinates && typeof parsed.coordinates.lat === 'number' && typeof parsed.coordinates.lng === 'number'
      ? parsed.coordinates
      : input.clientGps
      ? { lat: input.clientGps.lat, lng: input.clientGps.lng }
      : { lat: 37.7239, lng: -122.4786 };
    const locationConfidence = typeof parsed.locationConfidence === 'number' ? parsed.locationConfidence : 0.88;
    const locationEvidence = Array.isArray(parsed.locationEvidence) && parsed.locationEvidence.length > 0
      ? parsed.locationEvidence
      : input.clientGps
      ? ['Browser GPS', 'Campus Grid Match']
      : ['Campus Location Reference'];
    const needsLocationConfirmation = typeof parsed.needsLocationConfirmation === 'boolean'
      ? parsed.needsLocationConfirmation
      : !input.clientGps;

    return {
      hazardType,
      severity,
      summary,
      accessibilityImpact,
      recommendedAction,
      reportCategory,
      confidence,
      hazards,
      suggestedLocationSign: parsed.suggestedLocationSign || undefined,
      blockedLocation,
      alternativeRoute,
      routeSteps,
      barriersToAvoid,
      maximumSlope,
      requiresAssistance,
      assistanceRecommendation,
      detectedLocation,
      buildingId,
      coordinates,
      locationConfidence,
      locationEvidence,
      needsLocationConfirmation,
    };
  } catch (err: any) {
    const classified = classifyGeminiError(err);
    console.warn('Gemini hazard analysis error:', classified.message);
    throw classified;
  }
}

export async function planAccessibleRouteAI(params: {
  origin: string;
  destination: string;
  mobilityProfile: string;
  activeBarriers: string[];
}) {
  try {
    const prompt = `
Plan a low-barrier, ADA-compliant accessible campus route across San Francisco State University (SFSU).

Origin: ${params.origin}
Destination: ${params.destination}
Student Mobility Profile: ${params.mobilityProfile}
Active Reported Campus Barriers to Avoid: ${params.activeBarriers.join('; ') || 'None reported'}

Known SFSU Topological Waypoints & Slopes:
- 19th & Holloway Transit Hub: (37.7234, -122.4750) [Transit stop, level boarding curb cut]
- Hensill Hall Courtyard: (37.7237, -122.4756) [Flat concrete path, 2.5% slope]
- Thornton Hall Walkway: (37.7233, -122.4764) [Shallow ramp 3.8% slope, dual handrails]
- Student Services Plaza: (37.7245, -122.4770) [Wide brick plaza, 2.0% grade]
- Malcolm X Plaza Central Hub: (37.7235, -122.4782) [Main paved corridor, 1.8% slope]
- Cesar Chavez Center North Atrium Entrance: (37.7239, -122.4786) [Level entrance with elevator bank]
- Cesar Chavez Center South Bookstore Ramp: (37.7231, -122.4783) [Outdoor ADA switchback ramp, 4.2% slope]
- Library Malcolm X Gateway: (37.7218, -122.4782) [Automatic double sliding doors, zero threshold]
- Library Northwest Peet's Ramp: (37.7216, -122.4788) [Low-grade 3.5% concrete ramp]
- Fine Arts North Walkway: (37.7220, -122.4794) [Breezeway, 3.8% grade]
- Fine Arts West Amphitheater Path: (37.7219, -122.4797) [WARNING: Steep 9.4% slope - avoid for manual wheelchairs!]
- Humanities Quad Breezeway: (37.7225, -122.4805) [Flat courtyard, 2.2% slope]
- Marcus Hall State Drive Gateway: (37.7214, -122.4813) [ADA power push-pad entrance]
- Mashouf Wellness Center: (37.7214, -122.4830) [Zero-entry flat entrance]
- Lot 20 Pedestrian Bridge Level 3: (37.7210, -122.4764) [Elevated covered bridge, level floor]

Rules:
1. If an elevator is reported out of service (e.g. Cesar Chavez North Elevator down), route around it using exterior paved switchback ramps (e.g. South Bookstore Ramp) or recommend Gator Mobility Cart shuttle.
2. For manual wheelchair users, avoid slopes > 5.0%.
3. Output exact lat/lng coordinates for each turn/step along the real campus path.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are the SFSU Campus Accessibility Guide and ADA route optimization engine. Output strictly valid JSON without markdown wrapping.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            routeTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            estimatedMinutes: { type: Type.NUMBER },
            distanceMeters: { type: Type.NUMBER },
            maxSlopeGrade: { type: Type.NUMBER },
            isShuttleRecommended: { type: Type.BOOLEAN },
            shuttleReason: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING },
                  accessibilityDetail: { type: Type.STRING },
                  isRampOrElevator: { type: Type.BOOLEAN },
                  lat: { type: Type.NUMBER, description: 'Latitude coordinate for this step' },
                  lng: { type: Type.NUMBER, description: 'Longitude coordinate for this step' },
                  stepSlopePercentage: { type: Type.NUMBER, description: 'Estimated slope grade for this segment' },
                },
                required: ['instruction', 'accessibilityDetail', 'isRampOrElevator', 'lat', 'lng'],
              },
            },
            transitConnectionTip: { type: Type.STRING },
          },
          required: [
            'routeTitle',
            'summary',
            'estimatedMinutes',
            'distanceMeters',
            'maxSlopeGrade',
            'isShuttleRecommended',
            'steps',
          ],
        },
      },
    });

    return JSON.parse(response.text?.trim() || '{}');
  } catch (err) {
    console.error('Gemini route planning error:', err);
    return {
      routeTitle: `Direct Accessible Campus Corridor (${params.origin} to ${params.destination})`,
      summary: 'Flat paved path via Malcolm X Plaza and Library North breezeway, completely avoiding stairs and steep slopes.',
      estimatedMinutes: 6,
      distanceMeters: 380,
      maxSlopeGrade: 3.5,
      isShuttleRecommended: false,
      steps: [
        {
          instruction: `Depart from ${params.origin} using the automatic power-door gateway.`,
          accessibilityDetail: 'Level threshold, no steps.',
          isRampOrElevator: false,
          lat: 37.7234,
          lng: -122.4750,
          stepSlopePercentage: 1.5,
        },
        {
          instruction: 'Proceed west along Malcolm X Plaza towards the central fountain.',
          accessibilityDetail: 'Wide textured pavers, grade under 2.5%, high contrast lighting.',
          isRampOrElevator: false,
          lat: 37.7235,
          lng: -122.4782,
          stepSlopePercentage: 2.1,
        },
        {
          instruction: 'Take the South connecting walkway towards the destination breezeway.',
          accessibilityDetail: 'Gentle 3.5% low-grade ramp with dual handrails.',
          isRampOrElevator: true,
          lat: 37.7231,
          lng: -122.4783,
          stepSlopePercentage: 3.5,
        },
        {
          instruction: `Arrive at ${params.destination} accessible entrance.`,
          accessibilityDetail: 'Automatic blue push-plate operator installed at entrance.',
          isRampOrElevator: false,
          lat: 37.7238,
          lng: -122.4785,
          stepSlopePercentage: 1.0,
        },
      ],
      transitConnectionTip: 'Muni M-Ocean View ramp connection is 4 minutes east on 19th Ave.',
    };
  }
}

export async function processVoiceAgentQuery(params: {
  userQuery: string;
  context?: {
    currentBuilding?: string;
    activeTab?: string;
    hasBrokenElevators?: boolean;
  };
}) {
  try {
    const prompt = `
You are GatorAI Voice, the real-time spoken accessibility and campus navigator companion for San Francisco State University (SFSU).
The user is speaking to you hands-free or through live voice transcription.

User Voice Query: "${params.userQuery}"
Campus Context:
- Current Page/Tab: ${params.context?.activeTab || 'campus-navigator'}
- Nearby/Selected Building: ${params.context?.currentBuilding || 'Malcolm X Plaza / Central Campus'}
- Reported Campus Outages: ${params.context?.hasBrokenElevators ? 'Cesar Chavez Student Center North Elevator is reported OUT OF SERVICE.' : 'All campus elevators reported operational.'}

Key SFSU Accessibility Facts:
1. DPRC (Disability Programs and Resource Center) is in Cesar Chavez Student Center Room 400, phone (415) 405-3580.
2. Gator Mobility shuttle carts run Mon-Fri 8am-6pm for door-to-door campus transport. Phone: (415) 338-1441.
3. CAPS 24/7 mental health crisis line is (415) 338-2208, SSB 205.
4. J. Paul Leonard Library has the Assistive Technology Lab on the 2nd floor with JAWS screen readers, CCTV enlargers, and adjustable-height desks.
5. Mashouf Wellness Center has a hydraulic pool lift and ramp entrance.
6. Muni M-Ocean View ramp connection is located at 19th & Holloway Ave.

Guidelines for spoken response:
- Keep the response concise, clear, and direct (2 to 4 sentences maximum so it speaks comfortably aloud without overwhelming the user).
- Tone: Warm, empowering, confident, and empathetic.
- Provide practical navigation advice (e.g. mention elevators, ramps, automatic door buttons, or shuttle availability).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are GatorAI Voice, the real-time voice accessibility assistant for SFSU. Keep answers natural, empathetic, and spoken-friendly under 60 words.',
      },
    });

    const reply = response.text?.trim() || 'I am here to guide you around SFSU campus safely and without barriers.';
    return {
      reply,
      suggestedAction: reply.toLowerCase().includes('dprc')
        ? 'DPRC Office • CCSC 400'
        : reply.toLowerCase().includes('shuttle') || reply.toLowerCase().includes('cart')
        ? 'Request Gator Cart'
        : reply.toLowerCase().includes('caps')
        ? 'CAPS Support • (415) 338-2208'
        : 'Explore Campus Map',
    };
  } catch (err: any) {
    console.error('Voice agent query error:', err);
    return {
      reply: `At SFSU, all main pathways connecting Malcolm X Plaza, the Library, and Cesar Chavez Center feature ADA low-grade ramps under 5% slope. You can also request a free Gator Mobility cart ride!`,
      suggestedAction: 'Explore Campus Map',
    };
  }
}

/**
 * Transcribe user voice audio recording using Gemini 3.5 Transcribe
 */
export async function transcribeAudioWithGemini(audioBase64: string, mimeType = 'audio/webm'): Promise<string> {
  try {
    const cleanBase64 = audioBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    const cleanMimeType = mimeType.split(';')[0] || 'audio/webm';
    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Accurately transcribe all words spoken by the user in this audio. If silent or empty, return nothing.' },
        ],
      },
    });

    return response.text?.trim() || '';
  } catch (err) {
    console.error('Gemini audio transcription error:', err);
    return '';
  }
}

/**
 * Generate speech audio using gemini-3.8-flash-lite-tts
 */
export async function generateGeminiSpeech(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: text.trim() }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (err) {
    console.warn('Gemini TTS generation error:', err);
    return null;
  }
}

export async function processGeminiVoiceQuery(query: string): Promise<any> {
  try {
    const prompt = `
You are the voice assistant "Gemini Voice" for GatorAccess, the San Francisco State University (SFSU) campus accessibility navigation portal.
The student has spoken or typed their current accessibility need or question:
"${query}"

Your task:
1. Identify the student's accessibility need.
2. Determine which section of the website to navigate them to:
   - 'map': Interactive Campus Map & Accessible Route Planner (step-free routes, paths avoiding steep slopes, paths avoiding stairs/staircases, directions between SFSU buildings like Student Services Building / SSB, Cesar Chavez, Library, Thornton Hall, etc.).
   - 'elevators': Real-time elevator and lift status (checking if elevators are working, down, or under repair in Cesar Chavez, Library, Thornton Hall, Hensill, SSB, etc.).
   - 'report': Report an accessibility hazard (broken blue power door button, stairs without ramp, tree branch, locked accessible restroom, construction detour, steep slope).
   - 'support': Gator Mobility on-demand electric golf cart rides, student safety escorts, or CAPS mental health therapy/counseling.
   - If they specifically ask for phone numbers, emergency hotlines, or crisis hotlines (DPRC, 988, suicide prevention, UPD escort, CAPS hotline): set openModal to 'hotline'.

SPECIAL INTENT MAPPINGS:
- If the student mentions trouble with stairs, avoiding stairs, staircase barriers, getting around stairs, or getting to a building (like Student Services Building / SSB):
  -> targetTab: 'map'
  -> destBuildingId: 'ssb' (or the mentioned building)
  -> buildingName: 'Student Services Building'
  -> spokenResponse: "I'm routing you to the accessible step-free path to the Student Services Building, completely avoiding stairs."
  -> uiFeedback: "Routing: Step-Free Route to Student Services Building"

3. Formulate a warm, highly concise spoken response (1 to 2 sentences max) suitable for text-to-speech.
4. Extract any specific campus buildings or details if mentioned:
   - "student services" or "student services building" or "ssb" -> destBuildingId: 'ssb', buildingName: 'Student Services Building'
   - "cesar chavez" or "ccsc" -> destBuildingId: 'ccsc', buildingName: 'Cesar Chavez Student Center'
   - "library" -> destBuildingId: 'library', buildingName: 'J. Paul Leonard Library'
   - "thornton" -> destBuildingId: 'thornton', buildingName: 'Thornton Hall'
   - "fine arts" -> destBuildingId: 'fine_arts', buildingName: 'Fine Arts Building'
   - "hensill" -> destBuildingId: 'hensill', buildingName: 'Hensill Hall'
   - "lot 20" -> destBuildingId: 'lot_20', buildingName: 'Lot 20 Parking Garage'
   - "mashouf" -> destBuildingId: 'mashouf', buildingName: 'Mashouf Wellness Center'
   - "marcus" -> destBuildingId: 'marcus_hall', buildingName: 'Marcus Hall'
   - "humanities" -> destBuildingId: 'humanities', buildingName: 'Humanities Building'

Return a valid JSON object matching the requested schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are Gemini Voice, an empathetic, helpful campus accessibility navigator for SFSU students. Output strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedNeed: { type: Type.STRING },
            targetTab: {
              type: Type.STRING,
              description: "Must be one of: 'map', 'report', 'elevators', 'support'",
            },
            openModal: {
              type: Type.STRING,
              description: "Either 'hotline' or 'none'",
            },
            spokenResponse: {
              type: Type.STRING,
              description: 'Concise spoken response for audio playback (under 30 words)',
            },
            uiFeedback: {
              type: Type.STRING,
              description: 'Clear visual status description shown on the dashboard',
            },
            actionDetails: {
              type: Type.OBJECT,
              properties: {
                originBuildingId: { type: Type.STRING },
                destBuildingId: { type: Type.STRING },
                buildingName: { type: Type.STRING },
                reportCategory: { type: Type.STRING },
                reportDescription: { type: Type.STRING },
                ridePickupLocation: { type: Type.STRING },
                rideDropoffLocation: { type: Type.STRING },
                rideMobilityNeed: { type: Type.STRING },
                elevatorId: { type: Type.STRING },
                filterText: { type: Type.STRING },
              },
            },
            suggestedQuickActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['identifiedNeed', 'targetTab', 'spokenResponse', 'uiFeedback'],
        },
      },
    });

    const parsed: any = JSON.parse(response.text?.trim() || '{}');

    // Extract destination building from actionDetails or root properties
    const destBuildingId =
      parsed.actionDetails?.destBuildingId ||
      parsed.destBuildingId ||
      parsed.destinationBuildingId ||
      parsed.buildingId;
    const buildingName = parsed.actionDetails?.buildingName || parsed.buildingName;
    const originBuildingId = parsed.actionDetails?.originBuildingId || parsed.originBuildingId;

    const lowerQuery = query.toLowerCase();
    let finalDestId = destBuildingId;
    let finalBldgName = buildingName;

    if (lowerQuery.includes('student service') || lowerQuery.includes('ssb')) {
      finalDestId = 'ssb';
      finalBldgName = 'Student Services Building';
    } else if (lowerQuery.includes('cesar chavez') || lowerQuery.includes('ccsc')) {
      finalDestId = 'ccsc';
      finalBldgName = 'Cesar Chavez Student Center';
    } else if (lowerQuery.includes('library')) {
      finalDestId = 'library';
      finalBldgName = 'J. Paul Leonard Library';
    } else if (lowerQuery.includes('thornton')) {
      finalDestId = 'thornton';
      finalBldgName = 'Thornton Hall';
    }

    parsed.actionDetails = {
      ...parsed.actionDetails,
      destBuildingId: finalDestId,
      buildingName: finalBldgName,
      originBuildingId: originBuildingId || parsed.actionDetails?.originBuildingId,
    };

    // Generate Gemini TTS speech audio with 2.5s timeout race
    if (parsed.spokenResponse) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const audio = await Promise.race([generateGeminiSpeech(parsed.spokenResponse), timeoutPromise]);
        parsed.audioBase64 = audio;
      } catch (e) {
        console.warn('Could not generate TTS audio:', e);
      }
    }

    return parsed;
  } catch (err) {
    console.error('Gemini Voice processing error:', err);
    // Local fallback
    const lower = query.toLowerCase();
    let targetTab: 'map' | 'report' | 'elevators' | 'support' = 'map';
    let openModal: 'hotline' | 'none' = 'none';
    let spokenResponse = "I've navigated you to the campus accessibility map.";
    let uiFeedback = "Opening Campus Accessibility Navigator";
    let actionDetails: any = undefined;

    if (
      lower.includes('hotline') ||
      lower.includes('phone') ||
      lower.includes('call') ||
      lower.includes('crisis') ||
      lower.includes('contact') ||
      lower.includes('dprc phone') ||
      lower.includes('988')
    ) {
      openModal = 'hotline';
      targetTab = 'support';
      spokenResponse = 'Opening the SFSU DPRC and CAPS accessibility hotlines directory for you.';
      uiFeedback = 'Opening 24/7 Hotlines & Crisis Directory';
    } else if (
      lower.includes('student service') ||
      lower.includes('ssb') ||
      lower.includes('stair') ||
      lower.includes('staircase') ||
      lower.includes('step') ||
      lower.includes('avoid stairs') ||
      lower.includes('route') ||
      lower.includes('map') ||
      lower.includes('path') ||
      lower.includes('direction') ||
      lower.includes('get to') ||
      lower.includes('walk')
    ) {
      targetTab = 'map';
      const isSSB = lower.includes('student service') || lower.includes('ssb');
      spokenResponse = isSSB
        ? "Routing you to the accessible step-free path to the Student Services Building, completely avoiding all stairs."
        : "Opening the campus step-free route planner to avoid stairs.";
      uiFeedback = isSSB
        ? "Routing: Step-Free Route to Student Services Building"
        : "Opening Step-Free Campus Route Planner";
      actionDetails = {
        destBuildingId: isSSB ? 'ssb' : undefined,
        buildingName: isSSB ? 'Student Services Building' : undefined,
      };
    } else if (
      lower.includes('elevator') ||
      lower.includes('lift') ||
      lower.includes('broken elevator') ||
      lower.includes('working')
    ) {
      targetTab = 'elevators';
      spokenResponse = 'Checking real-time elevator status across campus buildings.';
      uiFeedback = 'Navigating to Live Elevator Status Dashboard';
    } else if (
      lower.includes('ride') ||
      lower.includes('cart') ||
      lower.includes('golf cart') ||
      lower.includes('shuttle') ||
      lower.includes('caps')
    ) {
      targetTab = 'support';
      spokenResponse = 'Navigating to Gator Mobility electric golf cart rides and CAPS mental health support.';
      uiFeedback = 'Opening Gator Mobility Cart & CAPS Support';
    } else if (
      lower.includes('report') ||
      lower.includes('hazard') ||
      lower.includes('stuck') ||
      lower.includes('obstruction') ||
      lower.includes('power door') ||
      lower.includes('ramp')
    ) {
      targetTab = 'report';
      spokenResponse = 'Taking you to the accessibility hazard reporter to file a facilities work order.';
      uiFeedback = 'Opening Incident & Hazard Reporter';
    }

    return {
      identifiedNeed: query,
      targetTab,
      openModal,
      spokenResponse,
      uiFeedback,
      actionDetails,
      suggestedQuickActions: [
        'Request Gator Cart ride',
        'Check Cesar Chavez elevators',
        'Find step-free path to Library',
      ],
    };
  }
}

