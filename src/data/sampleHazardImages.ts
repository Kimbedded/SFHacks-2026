export interface SampleHazardItem {
  id: string;
  name: string;
  badge: string;
  icon: string;
  tagline: string;
  imageUrl: string;
  headline: string;
  hazardType: string;
  severity: 'low' | 'medium' | 'high';
  severityText: string;
  location: string;
  description: string;
  alternativeRoute: string;
  recommendedAction: string;
}

// Crisp, high-contrast SVG representations for instant sample testing without external network lag
const potholeSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <radialGradient id="holeGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="65%" stop-color="#1e293b" />
      <stop offset="90%" stop-color="#334155" />
      <stop offset="100%" stop-color="#475569" />
    </radialGradient>
    <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <!-- Asphalt Road Background -->
  <rect width="600" height="400" fill="url(#roadGrad)" />
  <!-- Road Texture specks -->
  <g fill="#475569" opacity="0.3">
    <circle cx="50" cy="80" r="3" /><circle cx="120" cy="190" r="2" /><circle cx="280" cy="70" r="3" />
    <circle cx="450" cy="110" r="4" /><circle cx="520" cy="240" r="2" /><circle cx="180" cy="320" r="3" />
  </g>
  <!-- Yellow Road Lane Stripe -->
  <rect x="0" y="190" width="140" height="18" fill="#eab308" />
  <rect x="220" y="190" width="160" height="18" fill="#eab308" />
  <rect x="460" y="190" width="140" height="18" fill="#eab308" />
  <!-- Concrete Curb on Edge -->
  <rect x="0" y="0" width="600" height="45" fill="#94a3b8" />
  <rect x="0" y="45" width="600" height="10" fill="#64748b" />
  <!-- Deep Jagged Pothole -->
  <path d="M 230 180 Q 280 150 360 170 Q 420 200 410 260 Q 380 320 290 310 Q 210 290 200 240 Z" fill="url(#holeGrad)" stroke="#090d16" stroke-width="6" />
  <!-- Cracked fissures radiating from pothole -->
  <path d="M 200 240 L 150 260 L 110 250" stroke="#0f172a" stroke-width="3" fill="none" />
  <path d="M 360 170 L 400 130 L 440 140" stroke="#0f172a" stroke-width="3" fill="none" />
  <path d="M 290 310 L 310 360 L 350 380" stroke="#0f172a" stroke-width="3" fill="none" />
  <path d="M 410 260 L 480 280 L 510 270" stroke="#0f172a" stroke-width="3" fill="none" />
  <!-- Broken asphalt chunks -->
  <polygon points="260,220 280,215 275,235" fill="#475569" stroke="#1e293b" />
  <polygon points="330,240 350,230 345,250" fill="#475569" stroke="#1e293b" />
  <!-- Overlay Label Badge -->
  <rect x="20" y="340" width="220" height="40" rx="8" fill="#000000" opacity="0.8" />
  <text x="35" y="365" fill="#facc15" font-family="sans-serif" font-size="14" font-weight="bold">SAMPLE: DEEP ROAD POTHOLE</text>
</svg>
`)}`;

const fallenTreeSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <!-- Sidewalk and Grass -->
  <rect width="600" height="150" fill="#15803d" />
  <rect y="150" width="600" height="250" fill="#cbd5e1" />
  <!-- Sidewalk Joint Lines -->
  <line x1="180" y1="150" x2="180" y2="400" stroke="#94a3b8" stroke-width="4" />
  <line x1="380" y1="150" x2="380" y2="400" stroke="#94a3b8" stroke-width="4" />
  <!-- Large Fallen Tree Trunk across Sidewalk -->
  <path d="M 40 120 C 180 180, 320 240, 560 300 L 540 350 C 300 290, 160 230, 20 170 Z" fill="#78350f" stroke="#451a03" stroke-width="6" />
  <!-- Bark Texture Stripes -->
  <path d="M 80 155 Q 220 215 360 275" stroke="#451a03" stroke-width="3" fill="none" />
  <path d="M 120 180 Q 260 240 400 300" stroke="#451a03" stroke-width="3" fill="none" />
  <!-- Green Leaves and Broken Branches -->
  <circle cx="140" cy="140" r="35" fill="#166534" opacity="0.9" />
  <circle cx="170" cy="170" r="30" fill="#15803d" opacity="0.9" />
  <circle cx="380" cy="230" r="45" fill="#166534" opacity="0.9" />
  <circle cx="430" cy="270" r="40" fill="#15803d" opacity="0.9" />
  <circle cx="480" cy="240" r="35" fill="#14532d" opacity="0.9" />
  <!-- Overlay Label Badge -->
  <rect x="20" y="340" width="240" height="40" rx="8" fill="#000000" opacity="0.8" />
  <text x="35" y="365" fill="#4ade80" font-family="sans-serif" font-size="14" font-weight="bold">SAMPLE: FALLEN TREE BRANCH</text>
</svg>
`)}`;

const brokenSidewalkSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <!-- Concrete Pavement Base -->
  <rect width="600" height="400" fill="#cbd5e1" />
  <rect width="600" height="60" fill="#15803d" />
  <!-- Normal Concrete Slab on Left -->
  <rect x="30" y="90" width="230" height="270" fill="#e2e8f0" stroke="#94a3b8" stroke-width="4" rx="4" />
  <!-- Cracked Raised Concrete Slab (Heaved 3 inches) -->
  <path d="M 280 80 L 540 100 L 530 380 L 260 360 Z" fill="#94a3b8" stroke="#475569" stroke-width="6" />
  <!-- Drop Shadow under raised slab -->
  <polygon points="260,360 280,380 540,395 530,380" fill="#1e293b" />
  <!-- Sharp Concrete Edge / Trip Hazard -->
  <line x1="260" y1="80" x2="260" y2="360" stroke="#ef4444" stroke-width="6" />
  <!-- Large Fractures -->
  <path d="M 330 140 L 380 210 L 450 200 L 490 280" stroke="#1e293b" stroke-width="5" fill="none" />
  <path d="M 380 210 L 350 290 L 320 330" stroke="#1e293b" stroke-width="4" fill="none" />
  <!-- Warning Trip Icon in Corner -->
  <rect x="20" y="340" width="250" height="40" rx="8" fill="#000000" opacity="0.8" />
  <text x="35" y="365" fill="#f87171" font-family="sans-serif" font-size="14" font-weight="bold">SAMPLE: BROKEN SIDEWALK</text>
</svg>
`)}`;

const blockedRoadSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <!-- Street Background -->
  <rect width="600" height="400" fill="#334155" />
  <rect x="0" y="340" width="600" height="60" fill="#64748b" />
  <line x1="300" y1="0" x2="300" y2="340" stroke="#facc15" stroke-width="10" stroke-dasharray="25 20" />
  <!-- Construction Fence / Barricade 1 -->
  <g transform="translate(80, 140)">
    <rect x="0" y="0" width="200" height="30" fill="#f97316" rx="4" />
    <polygon points="30,0 50,0 20,30 0,30" fill="#ffffff" />
    <polygon points="80,0 100,0 70,30 50,30" fill="#ffffff" />
    <polygon points="130,0 150,0 120,30 100,30" fill="#ffffff" />
    <polygon points="180,0 200,0 170,30 150,30" fill="#ffffff" />
    <rect x="0" y="50" width="200" height="30" fill="#f97316" rx="4" />
    <polygon points="30,50 50,50 20,80 0,80" fill="#ffffff" />
    <polygon points="80,50 100,50 70,80 50,80" fill="#ffffff" />
    <polygon points="130,50 150,50 120,80 100,80" fill="#ffffff" />
    <polygon points="180,50 200,50 170,80 150,80" fill="#ffffff" />
    <!-- Stand legs -->
    <rect x="25" y="0" width="10" height="150" fill="#475569" />
    <rect x="165" y="0" width="10" height="150" fill="#475569" />
  </g>
  <!-- Construction Fence / Barricade 2 -->
  <g transform="translate(320, 140)">
    <rect x="0" y="0" width="200" height="30" fill="#f97316" rx="4" />
    <polygon points="30,0 50,0 20,30 0,30" fill="#ffffff" />
    <polygon points="80,0 100,0 70,30 50,30" fill="#ffffff" />
    <polygon points="130,0 150,0 120,30 100,30" fill="#ffffff" />
    <polygon points="180,0 200,0 170,30 150,30" fill="#ffffff" />
    <rect x="0" y="50" width="200" height="30" fill="#f97316" rx="4" />
    <polygon points="30,50 50,50 20,80 0,80" fill="#ffffff" />
    <polygon points="80,50 100,50 70,80 50,80" fill="#ffffff" />
    <polygon points="130,50 150,50 120,80 100,80" fill="#ffffff" />
    <polygon points="180,50 200,50 170,80 150,80" fill="#ffffff" />
    <rect x="25" y="0" width="10" height="150" fill="#475569" />
    <rect x="165" y="0" width="10" height="150" fill="#475569" />
  </g>
  <!-- Road Closed Sign in Center -->
  <rect x="210" y="80" width="180" height="70" rx="8" fill="#ffffff" stroke="#000000" stroke-width="4" />
  <text x="300" y="112" fill="#000000" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="middle">ROAD CLOSED</text>
  <text x="300" y="136" fill="#dc2626" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">CONSTRUCTION DETOUR</text>
  <!-- Overlay Label Badge -->
  <rect x="20" y="340" width="220" height="40" rx="8" fill="#000000" opacity="0.8" />
  <text x="35" y="365" fill="#fb923c" font-family="sans-serif" font-size="14" font-weight="bold">SAMPLE: BLOCKED ROADWAY</text>
</svg>
`)}`;

export const SAMPLE_HAZARD_IMAGES: SampleHazardItem[] = [
  {
    id: 'pothole',
    name: 'Road Pothole',
    badge: 'Pothole',
    icon: '🕳️',
    tagline: 'Deep hole in roadway lane',
    imageUrl: potholeSvg,
    headline: 'Possible problem found: A large pothole is blocking part of the road.',
    hazardType: 'Deep Road Pothole',
    severity: 'medium',
    severityText: '🟡 Medium - Hard for cars, bikes, and wheelchairs to pass safely',
    location: 'North Gateway Pathway, SFSU (GPS detected)',
    description:
      'A deep hole in the asphalt has formed on the right side of the road. People using wheels or carts have to swerve into oncoming traffic to get around it.',
    alternativeRoute:
      'Use the East Switchback Ramp or South Walkway. It has a gentle 3.2% slope and is completely paved with no holes.',
    recommendedAction:
      'Fill and patch the hole with fresh asphalt mix and level it flat with the street.',
  },
  {
    id: 'tree',
    name: 'Fallen Tree',
    badge: 'Fallen Tree',
    icon: '🌳',
    tagline: 'Large branch blocking sidewalk',
    imageUrl: fallenTreeSvg,
    headline: 'Possible problem found: A fallen tree branch is completely blocking the sidewalk.',
    hazardType: 'Fallen Tree on Sidewalk',
    severity: 'high',
    severityText: '🔴 High - Path is completely blocked for wheelchairs and strollers',
    location: '19th Avenue Campus Walkway, near Hensill Hall',
    description:
      'A heavy eucalyptus branch broke off and fell across the sidewalk after the windstorm. Pedestrians and wheelchair users cannot get past.',
    alternativeRoute:
      'Cross at the Hensill Hall crosswalk and take the paved quad path on the west side. It is wide, flat, and completely clear.',
    recommendedAction:
      'Dispatch grounds crew with chainsaws to cut the branch and clear the sidewalk.',
  },
  {
    id: 'sidewalk',
    name: 'Broken Sidewalk',
    badge: 'Broken Sidewalk',
    icon: '🚧',
    tagline: 'Lifted concrete & uneven curb',
    imageUrl: brokenSidewalkSvg,
    headline: 'Possible problem found: Broken concrete and an uneven ledge on the sidewalk.',
    hazardType: 'Cracked Sidewalk & Broken Curb',
    severity: 'medium',
    severityText: '🟡 Medium - Big tripping hazard and blocks manual wheelchairs',
    location: 'Malcolm X Plaza North Gateway',
    description:
      'Tree roots have pushed up a concrete slab by 3 inches, creating a sharp bump that wheels cannot roll over safely.',
    alternativeRoute:
      'Take the gentle sloped ramp 20 feet to the right behind the Student Center. The ramp has a smooth 3.5% grade.',
    recommendedAction:
      'Grind down the raised concrete lip and pour an asphalt transition wedge until full repair.',
  },
  {
    id: 'blocked_road',
    name: 'Blocked Road',
    badge: 'Blocked Road',
    icon: '⛔',
    tagline: 'Construction fence blocking entrance',
    imageUrl: blockedRoadSvg,
    headline: 'Possible problem found: Construction barricades are blocking the street entrance.',
    hazardType: 'Blocked Road Entrance',
    severity: 'high',
    severityText: '🔴 High - Entire street is closed to all traffic and pedestrians',
    location: 'State Drive Gateway, SFSU',
    description:
      'Temporary orange barriers and a chain-link fence have closed off the road without a wheelchair detour sign.',
    alternativeRoute:
      'Follow the painted green pedestrian detour around the Humanities building to enter campus safely.',
    recommendedAction:
      'Post official accessible detour signs and create an ADA-compliant temporary ramp.',
  },
];
