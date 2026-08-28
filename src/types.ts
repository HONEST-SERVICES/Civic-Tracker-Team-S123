export type HazardCategory = 
  | 'DEEP_POTHOLE'
  | 'GARBAGE_DUMP'
  | 'GARBAGE_VEHICLE'
  | 'SWEEPING_NOT_DONE'
  | 'OPEN_MANHOLES'
  | 'WATERLOGGING'
  | 'STREETLIGHT_OUTAGE'
  | 'PUBLIC_TOILET_CLEANING'
  | 'STRUCTURAL_SINKHOLE'
  | 'FLOODING_WATER_MAIN'
  | 'DOWNED_POWER_LINE'
  | 'TRAFFIC_SIGNAL_FAILURE'
  | 'CANAL_IRRIGATION_OVERFLOW'
  | 'AGRICULTURAL_RUNOFF_BLOCK'
  | 'RURAL_GARBAGE_DUMP';

export interface PublicFacility {
  id: string;
  name: string;
  type: 'TOILET' | 'WASTE_CENTER';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  ward: string;
  rating: number;
  totalRatings?: number;
  status: 'OPEN' | 'MAINTENANCE';
  timings?: string;
  features?: string[];
}

export type PriorityLevel = 'P1_CRITICAL' | 'P2_URGENT' | 'P3_SCHEDULED';

export type IncidentStatus = 'OPEN' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED';

export type DepartmentType = 'PUBLIC_WORKS' | 'SANITATION' | 'WATER_SUPPLY' | 'ELECTRICITY' | 'HEALTH_SBM';

export type UserRole = 
  | 'CITIZEN' 
  | 'FIELD_CREW' 
  | 'FIELD_CONTRACTOR'
  | 'VOLUNTEER'
  | 'SWACHHATA_DOOT'
  | 'SWACHH_SURVEKSHAN_AUDITOR'
  | 'WARD_OFFICER' 
  | 'SUPER_ADMIN';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  assignedWard: string | null;
  assignedCrew?: string;
  designation?: string;
  permissions?: string[];
  createdAt?: any;
  photoURL?: string;
}

export interface WardJurisdiction {
  id: string; // e.g. "ward-4"
  name: string; // e.g. "Ward 4 - Central Zone"
  district: string; // e.g. "North Municipal District"
  subAreas: string[]; // e.g. ["Sector 4 Trunk Road", "Bus Depot Junction", "Model Town Gate"]
  activeOfficerUid: string | null;
  activeOfficerName?: string;
  totalComplaintsCount?: number;
  activeCrewsCount?: number;
  lat?: number;
  lng?: number;
  createdAt?: any;
}

export type UnitType = 
  | 'RAPID_ASPHALT_PATCHER'
  | 'HYDRO_VAC_DRAINAGE'
  | 'STRUCTURAL_HAZARD'
  | 'HIGH_VOLTAGE_CREW'
  | 'CIVIC_TRAFFIC_LOGISTICS'
  | 'SANITATION_SWEEP_CREW';

export type UnitStatus = 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SITE';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

export interface ScannerData {
  detectedAnomalies: string[];
  boundingBoxes: BoundingBox[];
  depthEstimate?: string;
  surfaceArea?: string;
  structuralIntegrityScore?: number;
}

export interface GeminiVisionResult {
  category: HazardCategory;
  hazardName: string;
  severity: 'CRITICAL' | 'URGENT' | 'NORMAL';
  priority: PriorityLevel;
  riskScore: number;
  hazardDescription: string;
  recommendedDepartment: DepartmentType;
  recommendedCrew: string;
  estimatedRepairTimeMinutes: number;
  safetyDirectives: string[];
  anomaliesDetected?: string[];
  analyzedWithGemini?: boolean;
}

export interface CrisisIncident {
  id: string;
  title: string;
  description: string;
  category: HazardCategory;
  priority: PriorityLevel;
  status: IncidentStatus;
  riskScore: number; // 0 - 100
  department?: DepartmentType;
  location: {
    lat: number;
    lng: number;
    zone: string;
    address: string;
  };
  imageUrl?: string;
  proofOfFixUrl?: string;
  officerNotes?: string;
  scannerData?: ScannerData;
  assignedUnitId?: string;
  assignedUnitName?: string;
  etaMinutes?: number;
  targetResolutionMinutes?: number;
  createdAt: number;
  dispatchedAt?: number;
  resolvedAt?: number;
  actionDirectives?: string[];
  aiSummary?: string;
  reporterName?: string;
  reporterPhone?: string;
  citizenUid?: string;
  ward?: string;
  rating?: number;
  citizenFeedback?: string;
  communityUpvotes?: number;
  verifiedByVolunteers?: string[];
  auditorNotes?: string;
  auditorComplianceScore?: number;
}

export interface MunicipalUnit {
  id: string;
  name: string;
  type: UnitType;
  status: UnitStatus;
  capacity: string;
  currentZone: string;
  baseZone: string;
  lat: number;
  lng: number;
  assignedIncidentId?: string;
  driverCrew: string;
  contactFreq: string;
  efficiencyRating: number; // 0 - 100
  isManualOverride?: boolean;
  equipment: string[];
}

export interface AgentThoughtStep {
  id: string;
  timestamp: string;
  type: 'ANALYSIS' | 'FUNCTION_CALL' | 'FUNCTION_RETURN' | 'MUTATION' | 'DISPATCH_CONFIRMED' | 'ALERT';
  content: string;
  latencyMs?: number;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: Record<string, any>;
  rawPayload?: string;
}

export interface TelemetryStats {
  autonomousDispatchRate: number;
  meanTimeToDispatchSec: number;
  activeSevereHazards: number;
  totalIncidents24h: number;
  onlineCrews: number;
  resolvedToday: number;
  isLiveSync: boolean;
}
