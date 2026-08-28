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
  | 'TRAFFIC_SIGNAL_FAILURE';

export type PriorityLevel = 'P1_CRITICAL' | 'P2_URGENT' | 'P3_SCHEDULED';

export type IncidentStatus = 'OPEN' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED';

export type DepartmentType = 'PUBLIC_WORKS' | 'SANITATION' | 'WATER_SUPPLY' | 'ELECTRICITY' | 'HEALTH_SBM';

export type UserRole = 'CITIZEN' | 'FIELD_CREW' | 'WARD_OFFICER' | 'SUPER_ADMIN';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  assignedWard: string | null;
  assignedCrew?: string;
  designation?: string;
  createdAt?: any;
  photoURL?: string;
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
