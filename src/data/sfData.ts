import { NeighborhoodData, EdgeSensorNode, IncidentClassification } from '../types';

export const SF_NEIGHBORHOODS: NeighborhoodData[] = [
  {
    id: 'sfsu',
    name: 'SFSU & Lake Merced',
    category: 'Collegiate & Climate Hub',
    lat: 37.7241,
    lng: -122.4799,
    x: 210,
    y: 530,
    aqi: 28,
    aqiStatus: 'Good',
    tempF: 62.4,
    heatIslandDeltaF: -1.2,
    canopyCoveragePct: 34,
    trafficIndex: 42,
    cleanlinessScore: 92,
    solarOutputKw: 485,
    activeSensors: 14,
    recentAlert: 'SF Hacks 2026 Innovation Hub live telemetry active',
    notes: 'SFSU Student Life Center & Lake Merced microclimate. High ocean breeze buffer, strong solar output.'
  },
  {
    id: 'mission',
    name: 'Mission District',
    category: 'Cultural & Microclimate Basin',
    lat: 37.7599,
    lng: -122.4148,
    x: 470,
    y: 380,
    aqi: 44,
    aqiStatus: 'Good',
    tempF: 71.8,
    heatIslandDeltaF: +4.6,
    canopyCoveragePct: 18,
    trafficIndex: 78,
    cleanlinessScore: 74,
    solarOutputKw: 310,
    activeSensors: 19,
    recentAlert: 'Urban heat concentration peak detected around Valencia corridor',
    notes: 'Sheltered from Pacific marine fog layer. Consistently 8-10°F warmer than Ocean Beach.'
  },
  {
    id: 'soma',
    name: 'South of Market (SOMA)',
    category: 'Dense Tech & Transit Corridor',
    lat: 37.7785,
    lng: -122.3950,
    x: 550,
    y: 310,
    aqi: 56,
    aqiStatus: 'Moderate',
    tempF: 69.2,
    heatIslandDeltaF: +5.1,
    canopyCoveragePct: 12,
    trafficIndex: 86,
    cleanlinessScore: 68,
    solarOutputKw: 420,
    activeSensors: 26,
    recentAlert: 'Elevated particulate matter near Caltrain transit yard',
    notes: 'Asphalt heavy corridor. High heat island retention with significant pedestrian flow.'
  },
  {
    id: 'fidi',
    name: 'Financial District',
    category: 'Commercial High-Rise',
    lat: 37.7946,
    lng: -122.3999,
    x: 560,
    y: 220,
    aqi: 51,
    aqiStatus: 'Moderate',
    tempF: 65.5,
    heatIslandDeltaF: +2.8,
    canopyCoveragePct: 14,
    trafficIndex: 72,
    cleanlinessScore: 88,
    solarOutputKw: 190,
    activeSensors: 22,
    notes: 'Deep street canyons create wind funneling and localized particulate entrapment.'
  },
  {
    id: 'sunset',
    name: 'Sunset & Ocean Beach',
    category: 'Coastal Residential',
    lat: 37.7535,
    lng: -122.4939,
    x: 170,
    y: 400,
    aqi: 19,
    aqiStatus: 'Good',
    tempF: 57.8,
    heatIslandDeltaF: -3.4,
    canopyCoveragePct: 22,
    trafficIndex: 35,
    cleanlinessScore: 89,
    solarOutputKw: 280,
    activeSensors: 11,
    notes: 'Direct marine air inflow from Pacific. Pristine AQI with dense summer fog intrusion.'
  },
  {
    id: 'richmond',
    name: 'Richmond & GGP Edge',
    category: 'Greenway Residential',
    lat: 37.7797,
    lng: -122.4789,
    x: 200,
    y: 270,
    aqi: 22,
    aqiStatus: 'Good',
    tempF: 59.2,
    heatIslandDeltaF: -2.1,
    canopyCoveragePct: 38,
    trafficIndex: 40,
    cleanlinessScore: 91,
    solarOutputKw: 310,
    activeSensors: 16,
    notes: 'High biophilic canopy linked directly to Golden Gate Park coastal ecosystem.'
  },
  {
    id: 'tenderloin',
    name: 'Tenderloin & Civic Center',
    category: 'Dense Residential & Civic Core',
    lat: 37.7844,
    lng: -122.4172,
    x: 480,
    y: 270,
    aqi: 58,
    aqiStatus: 'Moderate',
    tempF: 68.1,
    heatIslandDeltaF: +4.2,
    canopyCoveragePct: 8,
    trafficIndex: 82,
    cleanlinessScore: 61,
    solarOutputKw: 140,
    activeSensors: 18,
    recentAlert: 'Targeted street washing dispatch deployed by SF Public Works',
    notes: 'Lowest canopy density in the city. High priority for cool surface and tree planting interventions.'
  },
  {
    id: 'twinpeaks',
    name: 'Twin Peaks & Central Hills',
    category: 'Topographic Apex & Gateway',
    lat: 37.7544,
    lng: -122.4477,
    x: 350,
    y: 410,
    aqi: 24,
    aqiStatus: 'Good',
    tempF: 60.5,
    heatIslandDeltaF: -1.8,
    canopyCoveragePct: 41,
    trafficIndex: 28,
    cleanlinessScore: 94,
    solarOutputKw: 560,
    activeSensors: 9,
    notes: 'Elevated IoT gateway node hub providing LoRaWAN 915MHz line-of-sight coverage across the 7x7 peninsula.'
  },
  {
    id: 'embarcadero',
    name: 'Embarcadero Waterfront',
    category: 'Maritime & Sea-Level Resilience',
    lat: 37.7955,
    lng: -122.3937,
    x: 620,
    y: 230,
    aqi: 32,
    aqiStatus: 'Good',
    tempF: 63.8,
    heatIslandDeltaF: +0.4,
    canopyCoveragePct: 20,
    trafficIndex: 65,
    cleanlinessScore: 86,
    solarOutputKw: 390,
    activeSensors: 15,
    recentAlert: 'King Tide water level telemetry normal (+0.2m baseline)',
    notes: 'Key sea wall sensor array monitoring wave action, tidal rise, and waterfront tourist pedestrian flow.'
  },
  {
    id: 'presidio',
    name: 'Presidio National Park',
    category: 'Forest & Biosphere Reserve',
    lat: 37.7989,
    lng: -122.4662,
    x: 270,
    y: 160,
    aqi: 16,
    aqiStatus: 'Good',
    tempF: 58.4,
    heatIslandDeltaF: -4.5,
    canopyCoveragePct: 62,
    trafficIndex: 18,
    cleanlinessScore: 98,
    solarOutputKw: 220,
    activeSensors: 12,
    notes: 'San Francisco primary natural cooling sink. Massive carbon sequestration and native wildlife corridor.'
  }
];

export const INITIAL_EDGE_NODES: EdgeSensorNode[] = [
  {
    id: 'NODE-SFSU-01',
    name: 'SFSU Campus Hub - Annex Annex',
    location: '1600 Holloway Ave (SF Hacks HQ)',
    hardware: 'ESP32-S3 + BME688 + Plantower PMS5003',
    protocol: 'LoRaWAN 915MHz',
    batteryPct: 98,
    isSolarCharging: true,
    rssi: -68,
    lastPingSecs: 4,
    status: 'online',
    readings: {
      temperature: 62.4,
      humidity: 68,
      pm25: 7.2,
      co2: 432,
      vocIndex: 32,
      noiseDb: 52
    }
  },
  {
    id: 'NODE-TWIN-02',
    name: 'Twin Peaks LoRaWAN Gateway',
    location: 'Twin Peaks Summit Tower',
    hardware: 'Raspberry Pi CM4 + SX1302 LoRa Concentrator',
    protocol: 'LoRaWAN 915MHz',
    batteryPct: 100,
    isSolarCharging: true,
    rssi: -42,
    lastPingSecs: 2,
    status: 'online',
    readings: {
      temperature: 60.5,
      humidity: 74,
      pm25: 5.8,
      co2: 418,
      vocIndex: 18,
      noiseDb: 46
    }
  },
  {
    id: 'NODE-MISS-03',
    name: 'Mission Heat & Air Station',
    location: 'Valencia & 18th St Micro-Parklet',
    hardware: 'ESP32-C3 + Sensirion SGP41 + SCD40',
    protocol: 'BLE Mesh',
    batteryPct: 86,
    isSolarCharging: true,
    rssi: -79,
    lastPingSecs: 9,
    status: 'online',
    readings: {
      temperature: 72.1,
      humidity: 52,
      pm25: 14.8,
      co2: 512,
      vocIndex: 98,
      noiseDb: 68
    },
    anomalyDetected: 'Microclimate thermal index 4.8°F above city average'
  },
  {
    id: 'NODE-SOMA-04',
    name: 'SOMA 4th & King Rail Corridor',
    location: 'Caltrain Terminal Periphery',
    hardware: 'Nordic nRF9160 + Dual PM2.5 Optical',
    protocol: 'NB-IoT',
    batteryPct: 74,
    isSolarCharging: false,
    rssi: -84,
    lastPingSecs: 18,
    status: 'online',
    readings: {
      temperature: 69.8,
      humidity: 58,
      pm25: 18.4,
      co2: 560,
      vocIndex: 114,
      noiseDb: 74
    }
  },
  {
    id: 'NODE-EMBR-05',
    name: 'Embarcadero Pier 14 Tide & Salinity',
    location: 'Waterfront Esplanade',
    hardware: 'STM32WB55 + Ultrasonic Tide Gauge',
    protocol: 'LoRaWAN 915MHz',
    batteryPct: 92,
    isSolarCharging: true,
    rssi: -71,
    lastPingSecs: 6,
    status: 'online',
    readings: {
      temperature: 63.2,
      humidity: 81,
      pm25: 8.5,
      co2: 422,
      vocIndex: 24,
      noiseDb: 59
    }
  },
  {
    id: 'NODE-SUNS-06',
    name: 'Ocean Beach Marine Layer Station',
    location: 'Great Highway & Judah St',
    hardware: 'ESP32-S3 + Optical Fog Density Transmissometer',
    protocol: 'LoRaWAN 915MHz',
    batteryPct: 95,
    isSolarCharging: true,
    rssi: -65,
    lastPingSecs: 3,
    status: 'online',
    readings: {
      temperature: 57.8,
      humidity: 89,
      pm25: 4.1,
      co2: 410,
      vocIndex: 12,
      noiseDb: 64
    }
  }
];

export const SAMPLE_INCIDENTS: IncidentClassification[] = [
  {
    id: 'INC-2026-081',
    title: 'Severe Storm Drain Blockage & Surface Flooding Risk',
    timestamp: '18 mins ago',
    location: 'Mission St & 16th St BART Plaza',
    imageThumbnail: '🌊',
    head1_category: 'Infrastructure & Drainage',
    head2_urgency: {
      score: 8.8,
      slaHours: 4,
      level: 'Critical'
    },
    head3_impact: {
      carbonImpactKg: 45,
      affectedRadiusMeters: 120,
      heatMitigationScore: 6.2
    },
    head4_routing: {
      targetAgency: 'SFPUC Water',
      automatedAction: 'Emergency culvert suction crew auto-dispatched',
      ticketId: 'SF-PUC-94103-882'
    },
    confidence: 0.96
  },
  {
    id: 'INC-2026-079',
    title: 'SFSU Science Quad Photovoltaic Canopy Soil Coating',
    timestamp: '42 mins ago',
    location: 'SFSU Campus, 1600 Holloway Ave',
    imageThumbnail: '⚡',
    head1_category: 'Infrastructure & Drainage',
    head2_urgency: {
      score: 5.2,
      slaHours: 24,
      level: 'Medium'
    },
    head3_impact: {
      carbonImpactKg: 120,
      affectedRadiusMeters: 40,
      heatMitigationScore: 8.5
    },
    head4_routing: {
      targetAgency: 'SF Department of Environment',
      automatedAction: 'Scheduled campus eco-cleaning robot notification',
      ticketId: 'SFSU-FAC-2026-11'
    },
    confidence: 0.94
  },
  {
    id: 'INC-2026-077',
    title: 'Extreme Heat Island Pocket & Bare Asphalt Heat Trap',
    timestamp: '1 hr ago',
    location: 'Minna St & 5th St Alley, SOMA',
    imageThumbnail: '🔥',
    head1_category: 'Urban Heat & Canopy',
    head2_urgency: {
      score: 7.4,
      slaHours: 12,
      level: 'High'
    },
    head3_impact: {
      carbonImpactKg: 280,
      affectedRadiusMeters: 250,
      heatMitigationScore: 9.4
    },
    head4_routing: {
      targetAgency: 'SF Public Works',
      automatedAction: 'Recommended for FY26 Cool Pavement & Canopy Pilot',
      ticketId: 'SFPW-URBAN-449'
    },
    confidence: 0.91
  },
  {
    id: 'INC-2026-074',
    title: 'Transit Dedicated Red Carpet Lane Obstruction',
    timestamp: '2 hrs ago',
    location: 'Market St & 8th St',
    imageThumbnail: '🚌',
    head1_category: 'Transit & Pedestrian',
    head2_urgency: {
      score: 8.1,
      slaHours: 2,
      level: 'Critical'
    },
    head3_impact: {
      carbonImpactKg: 68,
      affectedRadiusMeters: 300,
      heatMitigationScore: 4.0
    },
    head4_routing: {
      targetAgency: 'SFMTA (Transit)',
      automatedAction: 'Muni route 14R real-time bypass reroute alerted',
      ticketId: 'SFMTA-CLR-512'
    },
    confidence: 0.98
  },
  {
    id: 'INC-2026-070',
    title: 'Compost & Organic Contamination at Public Parklet',
    timestamp: '3 hrs ago',
    location: 'Dolores Park South Lawn',
    imageThumbnail: '♻️',
    head1_category: 'Waste & Composting',
    head2_urgency: {
      score: 4.6,
      slaHours: 12,
      level: 'Low'
    },
    head3_impact: {
      carbonImpactKg: 35,
      affectedRadiusMeters: 60,
      heatMitigationScore: 7.0
    },
    head4_routing: {
      targetAgency: 'Recology Clean Team',
      automatedAction: 'Recology smart bin capacity sensor recalibrated',
      ticketId: 'REC-SOMA-889'
    },
    confidence: 0.89
  }
];
