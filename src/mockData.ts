import { CrisisIncident, MunicipalUnit, HazardCategory, PriorityLevel } from './types';

export const INITIAL_MUNICIPAL_UNITS: MunicipalUnit[] = [
  {
    id: 'UNIT-04-RAPID',
    name: 'Ward 4 Rapid Road Repair Crew (Pothole Patcher)',
    type: 'RAPID_ASPHALT_PATCHER',
    status: 'AVAILABLE',
    capacity: '4.5 Ton Hot-Mix / Automated Screed',
    currentZone: 'Ward 4 - Sector 4',
    baseZone: 'Ward 4 - Sector 4',
    lat: 31.2562,
    lng: 75.7065,
    driverCrew: 'Insp. Marcus Chen & Team',
    contactFreq: '142.85 MHz (Ch 4)',
    efficiencyRating: 98,
    isManualOverride: false,
    equipment: ['Infrared Asphalt Heater', 'Hydro-Compactor', 'Thermal Joint Sealer', 'LED Arrowboard']
  },
  {
    id: 'UNIT-09-HYDRO',
    name: 'Ward 4 Hydro-Vac Drainage & SBM Suction Crew',
    type: 'HYDRO_VAC_DRAINAGE',
    status: 'AVAILABLE',
    capacity: '6000L Slurry Suction / High-Pressure Jet',
    currentZone: 'Ward 4 - Sector 3',
    baseZone: 'Ward 4 - Sector 3',
    lat: 31.2485,
    lng: 75.6980,
    driverCrew: 'Sanitary Insp. Sarah Alverez',
    contactFreq: '143.10 MHz (Ch 7)',
    efficiencyRating: 94,
    isManualOverride: false,
    equipment: ['6" Telescopic Boom Vacuum', '3000 PSI Water Jetter', 'Sewer Inspection Camera', 'Submersible Sump Array']
  },
  {
    id: 'UNIT-02-STRUCT',
    name: 'Public Works Structural & Manhole Shoring Crew',
    type: 'STRUCTURAL_HAZARD',
    status: 'AVAILABLE',
    capacity: 'Heavy Hydraulic Shoring & Geotechnical Scanner',
    currentZone: 'Ward 4 - Sector 1',
    baseZone: 'Ward 4 - Sector 1',
    lat: 31.2590,
    lng: 75.7120,
    driverCrew: 'Asst. Eng. Donald Miller',
    contactFreq: '141.90 MHz (Ch 1)',
    efficiencyRating: 99,
    isManualOverride: false,
    equipment: ['Ground Penetrating Radar', 'Pneumatic Trench Jacks', 'Steel Road Plates (8x16ft)', 'Surveying Total Station']
  },
  {
    id: 'UNIT-07-VOLT',
    name: 'Municipal Electrical & Streetlight Response Crew',
    type: 'HIGH_VOLTAGE_CREW',
    status: 'AVAILABLE',
    capacity: '75ft Insulated Bucket / 33kV Grounding Kit',
    currentZone: 'Ward 4 - Sector 2',
    baseZone: 'Ward 4 - Sector 2',
    lat: 31.2440,
    lng: 75.7150,
    driverCrew: 'Foreman James Zhao',
    contactFreq: '144.20 MHz (Ch 9)',
    efficiencyRating: 96,
    isManualOverride: false,
    equipment: ['Class 4 Dielectric Gloves', 'Phasing Tester', 'Emergency Line Isolation Switch', 'Cable Pulling Rig']
  },
  {
    id: 'UNIT-11-SWEEP',
    name: 'Ward 4 SBM Sanitation & Garbage Removal Fleet',
    type: 'SANITATION_SWEEP_CREW',
    status: 'AVAILABLE',
    capacity: 'Compactor Tipper & Sweeping Team',
    currentZone: 'Ward 4 - Sector 4',
    baseZone: 'Ward 4 - Sector 4',
    lat: 31.2510,
    lng: 75.6920,
    driverCrew: 'Supervisor Rajesh Verma',
    contactFreq: '140.50 MHz (Ch 3)',
    efficiencyRating: 95,
    isManualOverride: false,
    equipment: ['Hydraulic Compactor Bin', 'Road Sweeping Rig', 'Disinfectant Spray Unit']
  }
];

export const INITIAL_INCIDENTS: CrisisIncident[] = [
  {
    id: 'W0488610C32040932',
    title: 'Severe Cavity Sinkhole & Road Void',
    description: 'Sub-surface ground collapse exposing drainage conduits near crosswalk. High risk of vehicle axle destruction.',
    category: 'OPEN_MANHOLES',
    priority: 'P1_CRITICAL',
    status: 'DISPATCHED',
    riskScore: 94,
    department: 'PUBLIC_WORKS',
    location: {
      lat: 31.2545,
      lng: 75.7042,
      zone: 'Ward 4 - Sector 4',
      address: 'Cinema Road, Outside Verad Gate, Ward 4'
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    assignedUnitId: 'UNIT-02-STRUCT',
    assignedUnitName: 'Public Works Structural & Manhole Shoring Crew',
    etaMinutes: 11,
    targetResolutionMinutes: 45,
    createdAt: Date.now() - 1000 * 60 * 24,
    dispatchedAt: Date.now() - 1000 * 60 * 18,
    actionDirectives: [
      'Deploy trench safety perimeter 15m radius',
      'Execute GPR soil density scan before heavy machinery staging',
      'Place steel road plates over void to preserve lane 1 flow'
    ],
    aiSummary: 'Swachhata Automated Redressal Engine triaged high severity. Dispatched Public Works Shoring Team (ETA 11 mins).',
    reporterName: 'Sangit (Citizen Portal)'
  },
  {
    id: 'W0488610C88194410',
    title: 'Deep Rim-Breaker Pothole on Commercial Spine',
    description: 'Deep rim-breaker pothole in outer lane with jagged aggregate edges causing tire punctures.',
    category: 'DEEP_POTHOLE',
    priority: 'P2_URGENT',
    status: 'OPEN',
    riskScore: 78,
    department: 'PUBLIC_WORKS',
    location: {
      lat: 31.2580,
      lng: 75.7090,
      zone: 'Ward 4 - Sector 1',
      address: 'Commercial Expressway Mile 3.2, Ward 4'
    },
    imageUrl: 'https://images.unsplash.com/photo-1584463699031-c4c0b629c135?auto=format&fit=crop&w=800&q=80',
    targetResolutionMinutes: 90,
    createdAt: Date.now() - 1000 * 60 * 42,
    actionDirectives: [
      'Hot-pour bituminous tack coat application',
      'Plate compactor vibration leveling'
    ],
    reporterName: 'Amit Patel'
  },
  {
    id: 'W0488610C99120341',
    title: 'Overflowing Community Dustbin & Garbage Pile',
    description: 'Secondary collection bin overflowing onto pedestrian pathway. Stray cattle hazard.',
    category: 'GARBAGE_DUMP',
    priority: 'P2_URGENT',
    status: 'OPEN',
    riskScore: 68,
    department: 'SANITATION',
    location: {
      lat: 31.2515,
      lng: 75.6980,
      zone: 'Ward 4 - Sector 3',
      address: 'Market Square Near Bus Stand, Ward 4'
    },
    imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    targetResolutionMinutes: 60,
    createdAt: Date.now() - 1000 * 60 * 65,
    reporterName: 'Priya Sharma'
  },
  {
    id: 'W0488610C11029482',
    title: 'Streetlight Cluster Outage & Dark Spot',
    description: '3 consecutive pole lamps non-functional at highway crossroad causing safety hazard.',
    category: 'STREETLIGHT_OUTAGE',
    priority: 'P3_SCHEDULED',
    status: 'RESOLVED',
    riskScore: 50,
    department: 'ELECTRICITY',
    location: {
      lat: 31.2490,
      lng: 75.7110,
      zone: 'Ward 4 - Sector 2',
      address: 'Sector 2 Ring Road Junction, Ward 4'
    },
    imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    proofOfFixUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    officerNotes: 'Replaced LED luminaire driver and restored fuse junction. Verification photologged.',
    assignedUnitId: 'UNIT-07-VOLT',
    assignedUnitName: 'Municipal Electrical & Streetlight Response Crew',
    createdAt: Date.now() - 1000 * 60 * 180,
    dispatchedAt: Date.now() - 1000 * 60 * 120,
    resolvedAt: Date.now() - 1000 * 60 * 30,
    reporterName: 'Ward Safety Inspector'
  }
];

export const CRISIS_SCENARIOS = [
  {
    id: 'scenario-pothole',
    title: 'Severe Rim-Breaker Pothole',
    category: 'DEEP_POTHOLE' as HazardCategory,
    priority: 'P2_URGENT' as PriorityLevel,
    department: 'PUBLIC_WORKS' as const,
    lat: 31.2532,
    lng: 75.7031,
    zone: 'Ward 4 - Sector 4',
    address: 'G.T. Road Opposite Central Bus Station, Ward 4',
    description: 'Deep road cavity with sharp broken edges causing severe vehicular shock.',
    imageUrl: 'https://images.unsplash.com/photo-1584463699031-c4c0b629c135?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'scenario-garbage',
    title: 'Solid Waste & Overflowing Garbage Dump',
    category: 'GARBAGE_DUMP' as HazardCategory,
    priority: 'P2_URGENT' as PriorityLevel,
    department: 'SANITATION' as const,
    lat: 31.2505,
    lng: 75.6995,
    zone: 'Ward 4 - Sector 3',
    address: 'Subzi Mandi Road, Ward 4',
    description: 'Unattended municipal waste accumulating on side of road blocking pedestrian lane.',
    imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'scenario-manhole',
    title: 'Open Manhole & Storm Drain Void',
    category: 'OPEN_MANHOLES' as HazardCategory,
    priority: 'P1_CRITICAL' as PriorityLevel,
    department: 'PUBLIC_WORKS' as const,
    lat: 31.2555,
    lng: 75.7060,
    zone: 'Ward 4 - Sector 4',
    address: 'Main Commercial Market Gate, Ward 4',
    description: 'Broken cast-iron chamber lid missing. Immediate risk to two-wheelers and pedestrians.',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'scenario-waterlogging',
    title: 'Water Pipe Burst & Street Waterlogging',
    category: 'WATERLOGGING' as HazardCategory,
    priority: 'P2_URGENT' as PriorityLevel,
    department: 'WATER_SUPPLY' as const,
    lat: 31.2470,
    lng: 75.7015,
    zone: 'Ward 4 - Sector 2',
    address: 'Near Old Water Tank, Sector 2, Ward 4',
    description: 'Freshwater delivery line ruptured under asphalt causing water fountain and ponding.',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80'
  }
];

export const ZONES = [
  { id: 'zone-4', name: 'Ward 4 - Central Zone', lat: 31.2530, lng: 75.7030, radius: 750 },
  { id: 'zone-1', name: 'Ward 1 - North Sector', lat: 31.2590, lng: 75.7120, radius: 700 },
  { id: 'zone-2', name: 'Ward 2 - East Industrial', lat: 31.2440, lng: 75.7150, radius: 800 },
  { id: 'zone-3', name: 'Ward 3 - South Commercial', lat: 31.2485, lng: 75.6980, radius: 750 }
];

export const SWACHHATA_CATEGORIES = [
  {
    id: 'DEEP_POTHOLE',
    name: 'Potholes / Road Damage',
    subtitle: 'Deep cavities, broken pavement, asphalt damage',
    department: 'PUBLIC_WORKS' as const,
    icon: 'Road'
  },
  {
    id: 'GARBAGE_DUMP',
    name: 'Garbage dump',
    subtitle: 'Unattended waste piles & roadside littering',
    department: 'SANITATION' as const,
    icon: 'Trash2'
  },
  {
    id: 'GARBAGE_VEHICLE',
    name: 'Garbage vehicle not arrived',
    subtitle: 'Missed door-to-door waste collection',
    department: 'SANITATION' as const,
    icon: 'Truck'
  },
  {
    id: 'SWEEPING_NOT_DONE',
    name: 'Sweeping not done',
    subtitle: 'Street sweeping not completed in area',
    department: 'SANITATION' as const,
    icon: 'Sparkles'
  },
  {
    id: 'OPEN_MANHOLES',
    name: 'Open Manholes Or Drains',
    subtitle: 'Missing drain covers, cave-ins, open chambers',
    department: 'PUBLIC_WORKS' as const,
    icon: 'ShieldAlert'
  },
  {
    id: 'WATERLOGGING',
    name: 'Waterlogging / Water pipeline leak',
    subtitle: 'Ponding water, burst supply main, blocked runoff',
    department: 'WATER_SUPPLY' as const,
    icon: 'Droplets'
  },
  {
    id: 'STREETLIGHT_OUTAGE',
    name: 'Streetlight Outage / Electrical Defect',
    subtitle: 'Non-functional lamps, dangling cables',
    department: 'ELECTRICITY' as const,
    icon: 'Lightbulb'
  },
  {
    id: 'PUBLIC_TOILET_CLEANING',
    name: 'Public toilet(s) cleaning / blockage',
    subtitle: 'SBM community toilet maintenance & sanitation',
    department: 'HEALTH_SBM' as const,
    icon: 'Building'
  }
];
