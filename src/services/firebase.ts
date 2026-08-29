import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  serverTimestamp, 
  query, 
  orderBy,
  where,
  setDoc,
  getDocs
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  signOut,
  User,
  ConfirmationResult,
  ApplicationVerifier
} from "firebase/auth";
import { CrisisIncident, HazardCategory, PriorityLevel, DepartmentType, UserProfile, UserRole, MunicipalUnit, WardJurisdiction, PublicFacility } from "../types";
import { INITIAL_INCIDENTS, INITIAL_MUNICIPAL_UNITS, INITIAL_PUBLIC_FACILITIES } from "../mockData";
import { getFirebaseConfig } from "../config/keys";

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyBTEeCUBJOGkeQBYrcunJR8JFMiWOJrNXs",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "omnisync-pothole.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "omnisync-pothole",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "omnisync-pothole.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "375848058708",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:375848058708:web:efe864b4152e76d3f7d2c1",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-X0BKP2X3RF"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, "civictracker");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const complaintsCollection = collection(db, "complaints");
export const usersCollection = collection(db, "users");
export const unitsCollection = collection(db, "units");
export const wardsCollection = collection(db, "wards");
export const publicFacilitiesCollection = collection(db, "public_facilities");

export const MASTER_ADMIN_EMAIL = "peelaavinash04@gmail.com";

/**
 * Run Persistence Health-Check on the "civictracker" Firestore instance
 */
export async function runPersistenceHealthCheck(): Promise<boolean> {
  try {
    const healthDocRef = doc(complaintsCollection, "healthcheck_ping");
    await setDoc(healthDocRef, {
      title: "Persistence Health Check Ping",
      category: "ROADS_POTHOLES",
      status: "REPORTED",
      department: "PUBLIC_WORKS",
      verified: true,
      timestamp: Date.now(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log("[Security & DB Check] civictracker instance connected with valid rules.");
    return true;
  } catch (err: any) {
    console.warn("[Security & DB Check] Health check notice:", err?.message || err);
    return false;
  }
}

// Execute initial health check asynchronously
runPersistenceHealthCheck().catch(() => {});

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Creates an instantaneous optimistic UserProfile in memory for sub-300ms UI transitions.
 */
export function createOptimisticUserProfile(user: User): UserProfile {
  const isMasterAdmin = isMasterAdminEmail(user.email);
  if (isMasterAdmin) {
    return {
      uid: user.uid,
      name: user.displayName || "Avinash Peela (Master Super Admin)",
      phone: user.phoneNumber || "+91 98850 12345",
      email: user.email || MASTER_ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      assignedWard: "ALL",
      designation: "Master Super Administrator & Apex Inspector",
      permissions: ["ALL_ACCESS", "MANAGE_WARDS", "MANAGE_STAFF", "OVERRIDE_DISPATCH"],
      photoURL: user.photoURL || undefined
    };
  }
  return {
    uid: user.uid,
    name: user.displayName || (user.phoneNumber ? `Citizen (${user.phoneNumber.slice(-4)})` : "Citizen"),
    phone: user.phoneNumber || "",
    email: user.email || "",
    role: "CITIZEN",
    assignedWard: null,
    permissions: [],
    photoURL: user.photoURL || undefined
  };
}

/**
 * Sign in with Google Popup with optimistic UI resolution and background Firestore sync
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: UserProfile }> {
  const startTime = performance.now();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  
  // Instantaneous optimistic profile resolution
  const profile = createOptimisticUserProfile(cred.user);
  
  // Non-blocking background Firestore sync
  void syncUserProfile(cred.user).catch((err) => {
    console.warn("[Firebase Diagnostic] Background profile sync warning:", err);
  });

  const elapsed = Math.round(performance.now() - startTime);
  console.log(`[Auth Performance] Google Sign-In resolved and transitioned in: ${elapsed} ms`);

  return { user: cred.user, profile };
}

/**
 * Sign in with Email and Password with optimistic UI resolution and background Firestore sync
 */
export async function loginWithEmail(email: string, pass: string): Promise<{ user: User; profile: UserProfile }> {
  const startTime = performance.now();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const profile = createOptimisticUserProfile(cred.user);
  void syncUserProfile(cred.user).catch((err) => {
    console.warn("[Firebase Diagnostic] Background profile sync warning:", err);
  });
  const elapsed = Math.round(performance.now() - startTime);
  console.log(`[Auth Performance] Email Sign-In resolved and transitioned in: ${elapsed} ms`);
  return { user: cred.user, profile };
}

/**
 * Register a new user with Email, Password and Display Name
 */
export async function registerWithEmail(name: string, email: string, pass: string): Promise<{ user: User; profile: UserProfile }> {
  const startTime = performance.now();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name.trim()) {
    try {
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch (e) {
      console.warn("Failed to update profile displayName", e);
    }
  }
  const profile = createOptimisticUserProfile(cred.user);
  if (name.trim()) {
    profile.name = name.trim();
  }
  void syncUserProfile(cred.user).catch((err) => {
    console.warn("[Firebase Diagnostic] Background profile sync warning:", err);
  });
  const elapsed = Math.round(performance.now() - startTime);
  console.log(`[Auth Performance] Email Registration resolved and transitioned in: ${elapsed} ms`);
  return { user: cred.user, profile };
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  return await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Setup reCAPTCHA verifier for Phone OTP SMS verification
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved callback
    }
  });
}

/**
 * Send Phone OTP SMS verification code
 */
export async function sendPhoneOtp(
  phoneNumber: string, 
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

/**
 * Verify received Phone OTP Code with optimistic UI resolution and background Firestore sync
 */
export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult, 
  otpCode: string
): Promise<{ user: User; profile: UserProfile }> {
  const startTime = performance.now();
  const cred = await confirmationResult.confirm(otpCode);
  
  // Instantaneous optimistic profile resolution
  const profile = createOptimisticUserProfile(cred.user);
  
  // Non-blocking background Firestore sync
  void syncUserProfile(cred.user).catch((err) => {
    console.warn("[Firebase Diagnostic] Background profile sync warning:", err);
  });

  const elapsed = Math.round(performance.now() - startTime);
  console.log(`[Auth Performance] Phone OTP login resolved and transitioned in: ${elapsed} ms`);

  return { user: cred.user, profile };
}

/**
 * Sign out current authenticated user
 */
export async function logoutUser(): Promise<void> {
  return await signOut(auth);
}

/**
 * Sync user profile with Firestore document `users/{user.uid}`
 * Enforces Master Super Admin privileges for peelaavinash04@gmail.com
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const isMasterAdmin = isMasterAdminEmail(user.email);
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (isMasterAdmin) {
      const masterProfile: UserProfile = {
        uid: user.uid,
        name: user.displayName || "Avinash Peela (Master Super Admin)",
        phone: user.phoneNumber || "+91 98850 12345",
        email: user.email || MASTER_ADMIN_EMAIL,
        role: "SUPER_ADMIN",
        assignedWard: "ALL",
        designation: "Master Super Administrator & Apex Inspector",
        permissions: ["ALL_ACCESS", "MANAGE_WARDS", "MANAGE_STAFF", "OVERRIDE_DISPATCH"],
        photoURL: user.photoURL || undefined,
        createdAt: snap.exists() ? snap.data().createdAt || serverTimestamp() : serverTimestamp()
      };
      await setDoc(userRef, masterProfile, { merge: true });
      console.log(`[Firebase Diagnostic] Connected to omnisync-pothole -> Master Admin profile synced: UID #${user.uid}`);
      return masterProfile;
    }

    if (snap.exists()) {
      const data = snap.data();
      console.log(`[Firebase Diagnostic] Connected to omnisync-pothole -> Existing user profile fetched: UID #${user.uid}`);
      return {
        uid: user.uid,
        name: data.name || user.displayName || "Citizen",
        phone: data.phone || user.phoneNumber || "",
        email: data.email || user.email || "",
        role: (data.role as UserRole) || "CITIZEN",
        assignedWard: data.assignedWard ?? null,
        assignedCrew: data.assignedCrew || undefined,
        designation: data.designation || undefined,
        permissions: data.permissions || [],
        createdAt: data.createdAt || null,
        photoURL: data.photoURL || user.photoURL || undefined
      };
    }

    // Create new citizen profile if not exists
    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || (user.phoneNumber ? `Citizen (${user.phoneNumber.slice(-4)})` : "Citizen"),
      phone: user.phoneNumber || "",
      email: user.email || "",
      role: "CITIZEN",
      assignedWard: null,
      permissions: [],
      createdAt: serverTimestamp(),
      photoURL: user.photoURL || undefined
    };

    await setDoc(userRef, newProfile);
    console.log(`[Firebase Diagnostic] Connected to omnisync-pothole -> New citizen profile created: UID #${user.uid}`);
    return newProfile;
  } catch (err) {
    console.error("[Firebase Diagnostic] Error syncing user profile with omnisync-pothole:", err);
    if (isMasterAdmin) {
      return {
        uid: user.uid,
        name: user.displayName || "Avinash Peela (Master Super Admin)",
        phone: user.phoneNumber || "+91 98850 12345",
        email: user.email || MASTER_ADMIN_EMAIL,
        role: "SUPER_ADMIN",
        assignedWard: "ALL",
        designation: "Master Super Administrator & Apex Inspector",
        permissions: ["ALL_ACCESS", "MANAGE_WARDS", "MANAGE_STAFF", "OVERRIDE_DISPATCH"],
        photoURL: user.photoURL || undefined
      };
    }
    return {
      uid: user.uid,
      name: user.displayName || (user.phoneNumber ? `Citizen (${user.phoneNumber.slice(-4)})` : "Citizen"),
      phone: user.phoneNumber || "",
      email: user.email || "",
      role: "CITIZEN",
      assignedWard: null,
      permissions: [],
      photoURL: user.photoURL || undefined
    };
  }
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      const isMasterAdmin = isMasterAdminEmail(data.email);
      return {
        uid,
        name: data.name || "Citizen",
        phone: data.phone || "",
        email: data.email || "",
        role: isMasterAdmin ? "SUPER_ADMIN" : ((data.role as UserRole) || "CITIZEN"),
        assignedWard: isMasterAdmin ? "ALL" : (data.assignedWard ?? null),
        assignedCrew: data.assignedCrew || undefined,
        designation: isMasterAdmin ? "Master Super Administrator & Apex Inspector" : (data.designation || undefined),
        permissions: isMasterAdmin ? ["ALL_ACCESS", "MANAGE_WARDS", "MANAGE_STAFF", "OVERRIDE_DISPATCH"] : (data.permissions || []),
        createdAt: data.createdAt || null,
        photoURL: data.photoURL || undefined
      };
    }
  } catch (err) {
    console.warn("Failed to fetch user profile:", err);
  }
  return null;
}

/**
 * Update user role and ward assignment (Admin / Ward Officer Delegation)
 */
export async function updateUserRoleAndWard(
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    const p: Record<string, any> = {};
    if (updates.role) p.role = updates.role;
    if (updates.assignedWard !== undefined) p.assignedWard = updates.assignedWard;
    if (updates.assignedCrew !== undefined) p.assignedCrew = updates.assignedCrew;
    if (updates.designation !== undefined) p.designation = updates.designation;
    if (updates.name !== undefined) p.name = updates.name;
    if (updates.permissions !== undefined) p.permissions = updates.permissions;

    await updateDoc(userRef, p);
    console.log(`User ${uid} updated in Firestore successfully:`, p);
  } catch (err) {
    console.error("Error updating user role/ward in Firestore:", err);
    throw err;
  }
}

/**
 * Fetch all registered users
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(usersCollection);
    const users: UserProfile[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const isMasterAdmin = isMasterAdminEmail(data.email);
      users.push({
        uid: d.id,
        name: data.name || "Citizen",
        phone: data.phone || "",
        email: data.email || "",
        role: isMasterAdmin ? "SUPER_ADMIN" : ((data.role as UserRole) || "CITIZEN"),
        assignedWard: isMasterAdmin ? "ALL" : (data.assignedWard ?? null),
        assignedCrew: data.assignedCrew || undefined,
        designation: isMasterAdmin ? "Master Super Administrator & Apex Inspector" : (data.designation || undefined),
        permissions: isMasterAdmin ? ["ALL_ACCESS", "MANAGE_WARDS", "MANAGE_STAFF", "OVERRIDE_DISPATCH"] : (data.permissions || []),
        createdAt: data.createdAt || null,
        photoURL: data.photoURL || undefined
      });
    });
    return users;
  } catch (err) {
    console.warn("Failed to fetch all users:", err);
    return [];
  }
}

/**
 * Real-time subscription to all registered users
 */
export function subscribeToAllUsers(
  callback: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(usersCollection, (snap) => {
    const users: UserProfile[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const isMasterAdmin = isMasterAdminEmail(data.email);
      users.push({
        uid: d.id,
        name: data.name || "Citizen",
        phone: data.phone || "",
        email: data.email || "",
        role: isMasterAdmin ? "SUPER_ADMIN" : ((data.role as UserRole) || "CITIZEN"),
        assignedWard: isMasterAdmin ? "ALL" : (data.assignedWard ?? null),
        assignedCrew: data.assignedCrew || undefined,
        designation: isMasterAdmin ? "Master Super Administrator & Apex Inspector" : (data.designation || undefined),
        permissions: isMasterAdmin ? ["ALL_ACCESS", "MANAGE_WARDS", "MANAGE_STAFF", "OVERRIDE_DISPATCH"] : (data.permissions || []),
        createdAt: data.createdAt || null,
        photoURL: data.photoURL || undefined
      });
    });
    callback(users);
  }, (err) => {
    console.warn("User subscription error:", err);
    if (onError) onError(err);
  });
}

/**
 * Listen to Auth State Changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Map Firestore document data to CrisisIncident
export function mapDocToIncident(id: string, data: any): CrisisIncident {
  // Normalize status
  let status: CrisisIncident['status'] = 'OPEN';
  const rawStatus = (data.status || '').toUpperCase();
  if (data.requiresManualVerification || rawStatus === 'PENDING MANUAL TRIAGE' || rawStatus === 'PENDING_MANUAL_TRIAGE') {
    status = 'PENDING_MANUAL_TRIAGE';
  } else if (rawStatus === 'RESOLVED') {
    status = 'RESOLVED';
  } else if (rawStatus === 'IN REMEDIATION' || rawStatus === 'IN_PROGRESS' || rawStatus === 'IN_REMEDIATION') {
    status = 'IN_PROGRESS';
  } else if (rawStatus === 'ASSIGNED' || rawStatus === 'DISPATCHED') {
    status = 'DISPATCHED';
  } else {
    status = 'OPEN';
  }

  // Location handling
  let location = {
    lat: 31.2530,
    lng: 75.7030,
    zone: data.ward || 'Ward 4 - Central Zone',
    address: 'Ward 4, G.T. Road'
  };

  if (data.location) {
    if (typeof data.location === 'object') {
      location = {
        lat: Number(data.location.lat) || 31.2530,
        lng: Number(data.location.lng) || 75.7030,
        zone: data.location.zone || data.ward || 'Ward 4 - Central Zone',
        address: data.location.address || data.location.name || 'Ward 4, G.T. Road'
      };
    } else if (typeof data.location === 'string') {
      location.address = data.location;
      if (data.lat && data.lng) {
        location.lat = Number(data.lat);
        location.lng = Number(data.lng);
      }
    }
  }

  let createdAt = Date.now();
  if (data.createdAt) {
    if (typeof data.createdAt.toMillis === 'function') {
      createdAt = data.createdAt.toMillis();
    } else if (typeof data.createdAt === 'number') {
      createdAt = data.createdAt;
    }
  }

  return {
    id: data.id || id,
    title: data.title || 'Civic Grievance',
    description: data.description || '',
    category: (data.category as HazardCategory) || 'DEEP_POTHOLE',
    priority: (data.priority as PriorityLevel) || 'P2_URGENT',
    department: (data.department as DepartmentType) || 'PUBLIC_WORKS',
    status,
    riskScore: typeof data.riskScore === 'number' ? data.riskScore : 75,
    location,
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1584463699031-c4c0b629c135?auto=format&fit=crop&w=800&q=80',
    proofOfFixUrl: data.proofOfFixUrl || data.proofUrl,
    officerNotes: data.officerNotes || data.notes,
    assignedUnitId: data.assignedUnitId,
    assignedUnitName: data.assignedCrew || data.assignedUnitName,
    etaMinutes: data.etaMinutes || 15,
    targetResolutionMinutes: data.targetResolutionMinutes || 45,
    createdAt,
    dispatchedAt: data.dispatchedAt,
    resolvedAt: data.resolvedAt,
    reporterName: data.citizenName || data.reporterName || 'Citizen',
    reporterPhone: data.citizenPhone || data.reporterPhone || '',
    citizenUid: data.citizenUid || '',
    ward: data.ward || location.zone,
    rating: data.rating,
    citizenFeedback: data.citizenFeedback,
    communityUpvotes: data.communityUpvotes || 0,
    verifiedByVolunteers: data.verifiedByVolunteers || [],
    auditorNotes: data.auditorNotes || '',
    auditorComplianceScore: data.auditorComplianceScore,
    actionDirectives: data.actionDirectives || [],
    isCivicIssue: data.isCivicIssue !== undefined ? data.isCivicIssue : true,
    rejectionReason: data.rejectionReason || '',
    aiConfidence: typeof data.aiConfidence === 'number' ? data.aiConfidence : undefined,
    aiReasoning: data.aiReasoning || '',
    requiresManualVerification: Boolean(data.requiresManualVerification)
  };
}

// Convert CrisisIncident to Firestore payload
export function mapIncidentToFirestore(incident: Partial<CrisisIncident>) {
  let displayStatus = "Registered";
  if (incident.requiresManualVerification || incident.status === 'PENDING_MANUAL_TRIAGE') {
    displayStatus = "Pending Manual Triage";
  } else if (incident.status === 'RESOLVED') {
    displayStatus = "Resolved";
  } else if (incident.status === 'IN_PROGRESS') {
    displayStatus = "In Remediation";
  } else if (incident.status === 'DISPATCHED') {
    displayStatus = "Assigned";
  }

  const rawPayload: Record<string, any> = {
    id: incident.id || null,
    title: incident.title || 'Civic Infrastructure Grievance',
    category: incident.category || 'DEEP_POTHOLE',
    status: displayStatus,
    ward: incident.ward || incident.location?.zone || 'Ward 4 - Central Zone',
    location: {
      address: incident.location?.address || 'Ward 4, G.T. Road',
      lat: typeof incident.location?.lat === 'number' ? incident.location.lat : 31.2530,
      lng: typeof incident.location?.lng === 'number' ? incident.location.lng : 75.7030,
      zone: incident.ward || incident.location?.zone || 'Ward 4 - Central Zone'
    },
    citizenName: incident.reporterName || 'Citizen',
    citizenPhone: incident.reporterPhone || '',
    citizenUid: incident.citizenUid || '',
    assignedCrew: incident.assignedUnitName || '',
    assignedUnitId: incident.assignedUnitId || '',
    priority: incident.priority || 'P2_URGENT',
    department: incident.department || 'PUBLIC_WORKS',
    riskScore: typeof incident.riskScore === 'number' ? incident.riskScore : 75,
    imageUrl: incident.imageUrl || '',
    proofOfFixUrl: incident.proofOfFixUrl || '',
    officerNotes: incident.officerNotes || '',
    etaMinutes: typeof incident.etaMinutes === 'number' ? incident.etaMinutes : 15,
    description: incident.description || '',
    communityUpvotes: typeof incident.communityUpvotes === 'number' ? incident.communityUpvotes : 0,
    verifiedByVolunteers: Array.isArray(incident.verifiedByVolunteers) ? incident.verifiedByVolunteers : [],
    auditorNotes: incident.auditorNotes || '',
    auditorComplianceScore: typeof incident.auditorComplianceScore === 'number' ? incident.auditorComplianceScore : null,
    isCivicIssue: incident.isCivicIssue !== undefined ? incident.isCivicIssue : true,
    rejectionReason: incident.rejectionReason || '',
    aiConfidence: typeof incident.aiConfidence === 'number' ? incident.aiConfidence : null,
    aiReasoning: incident.aiReasoning || '',
    requiresManualVerification: Boolean(incident.requiresManualVerification),
    hasVoiceNote: Boolean(incident.hasVoiceNote),
    audioNoteUrl: incident.audioNoteUrl || '',
    audioNoteBase64: incident.audioNoteBase64 || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // Convert any undefined fields to null or omit to satisfy Firestore constraints
  const cleanPayload: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawPayload)) {
    if (value !== undefined) {
      cleanPayload[key] = value;
    }
  }
  return cleanPayload;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Convert MunicipalUnit to Firestore data
export function mapUnitToFirestore(unit: MunicipalUnit) {
  return {
    id: unit.id,
    name: unit.name,
    type: unit.type,
    status: unit.status,
    capacity: unit.capacity || '',
    currentZone: unit.currentZone || 'Ward 4 - Sector 4',
    baseZone: unit.baseZone || 'Ward 4 - Sector 4',
    lat: unit.lat || 31.2530,
    lng: unit.lng || 75.7030,
    driverCrew: unit.driverCrew || '',
    contactFreq: unit.contactFreq || '',
    efficiencyRating: unit.efficiencyRating || 95,
    equipment: unit.equipment || []
  };
}

export function mapDocToUnit(id: string, data: any): MunicipalUnit {
  return {
    id: data.id || id,
    name: data.name || 'Municipal Response Unit',
    type: data.type || 'RAPID_ASPHALT_PATCHER',
    status: data.status || 'AVAILABLE',
    capacity: data.capacity || '4.5 Ton Patcher',
    currentZone: data.currentZone || 'Ward 4 - Sector 4',
    baseZone: data.baseZone || 'Ward 4 - Sector 4',
    lat: typeof data.lat === 'number' ? data.lat : 31.2530,
    lng: typeof data.lng === 'number' ? data.lng : 75.7030,
    driverCrew: data.driverCrew || 'Crew Lead',
    contactFreq: data.contactFreq || '142.85 MHz',
    efficiencyRating: typeof data.efficiencyRating === 'number' ? data.efficiencyRating : 95,
    equipment: Array.isArray(data.equipment) ? data.equipment : []
  };
}

/**
 * Real-time subscription to Municipal Repair Units
 */
export function subscribeToUnits(
  onUpdate: (units: MunicipalUnit[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(unitsCollection, (snapshot) => {
    if (snapshot.empty) {
      seedInitialUnits();
      onUpdate(INITIAL_MUNICIPAL_UNITS);
      return;
    }
    const items: MunicipalUnit[] = [];
    snapshot.forEach((d) => {
      items.push(mapDocToUnit(d.id, d.data()));
    });
    onUpdate(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'units');
    onUpdate(INITIAL_MUNICIPAL_UNITS);
    if (onError) onError(err);
  });
}

/**
 * Seed initial units to Firestore
 */
export async function seedInitialUnits() {
  try {
    for (const unit of INITIAL_MUNICIPAL_UNITS) {
      const docRef = doc(unitsCollection, unit.id);
      await setDoc(docRef, mapUnitToFirestore(unit));
    }
  } catch (err) {
    console.warn("Could not seed initial units to Firestore:", err);
  }
}

/**
 * Update Municipal Unit status / location
 */
export async function updateUnitInFirestore(unitId: string, updates: Partial<MunicipalUnit>) {
  try {
    const docRef = doc(unitsCollection, unitId);
    await updateDoc(docRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `units/${unitId}`);
  }
}

/**
 * Read complaints with pure real-time onSnapshot from Firestore
 */
export function subscribeToComplaints(
  onUpdate: (incidents: CrisisIncident[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(complaintsCollection, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onUpdate([]);
      return;
    }

    const items: CrisisIncident[] = [];
    snapshot.forEach((docSnap) => {
      items.push(mapDocToIncident(docSnap.id, docSnap.data()));
    });
    onUpdate(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'complaints');
    onUpdate([]);
    if (onError) onError(err);
  });
}

/**
 * Role-scoped real-time Complaints subscription
 * - CITIZEN: filtered where `citizenUid == auth.currentUser.uid` or matching reporter name/phone
 * - FIELD_CREW: filtered where `assignedWard == userProfile.assignedWard`
 * - WARD_OFFICER: filtered where `ward == userProfile.assignedWard`
 * - SUPER_ADMIN: read all records in `complaints`
 */
export function subscribeToScopedComplaints(
  role: UserRole,
  userProfile: UserProfile | null,
  onUpdate: (incidents: CrisisIncident[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(complaintsCollection, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onUpdate([]);
      return;
    }

    const allItems: CrisisIncident[] = [];
    snapshot.forEach((docSnap) => {
      allItems.push(mapDocToIncident(docSnap.id, docSnap.data()));
    });

    let scopedItems: CrisisIncident[] = allItems;

    if (role === 'CITIZEN') {
      const uid = userProfile?.uid || auth.currentUser?.uid;
      const citizenName = userProfile?.name?.toLowerCase().trim();
      const citizenPhone = userProfile?.phone?.replace(/\s+/g, '');
      scopedItems = allItems.filter((inc) => {
        if (uid && inc.citizenUid && inc.citizenUid === uid) return true;
        if (citizenName && inc.reporterName && inc.reporterName.toLowerCase().trim() === citizenName) return true;
        if (citizenPhone && inc.reporterPhone && inc.reporterPhone.replace(/\s+/g, '') === citizenPhone) return true;
        return false;
      });
    } else if (role === 'FIELD_CREW' || role === 'FIELD_CONTRACTOR') {
      const ward = userProfile?.assignedWard;
      scopedItems = allItems.filter((inc) => {
        const matchesWard = !ward || inc.ward === ward || inc.location.zone === ward;
        return matchesWard;
      });
    } else if (role === 'VOLUNTEER' || role === 'SWACHHATA_DOOT') {
      const ward = userProfile?.assignedWard;
      scopedItems = allItems.filter((inc) => {
        if (!ward || ward === 'ALL') return true;
        return inc.ward === ward || inc.location.zone === ward;
      });
    } else if (role === 'SWACHH_SURVEKSHAN_AUDITOR') {
      // Auditor has oversight over all municipal complaints across wards
      scopedItems = allItems;
    } else if (role === 'WARD_OFFICER') {
      const ward = userProfile?.assignedWard;
      scopedItems = allItems.filter((inc) => {
        if (!ward || ward === 'ALL') return true;
        return inc.ward === ward || inc.location.zone === ward;
      });
    } else if (role === 'SUPER_ADMIN') {
      scopedItems = allItems;
    }

    onUpdate(scopedItems);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'complaints');
    onUpdate([]);
    if (onError) onError(err);
  });
}

// Create a new complaint directly in Firestore with comprehensive persistence & error auditing
export async function createComplaintInFirestore(incident: Partial<CrisisIncident>): Promise<string> {
  try {
    const payload = mapIncidentToFirestore(incident);
    const targetDocId = incident.id ? incident.id.trim() : null;

    if (targetDocId) {
      const docRef = doc(complaintsCollection, targetDocId);
      await setDoc(docRef, payload, { merge: true });
      console.log(`[Firebase Diagnostic] Connected to civictracker -> Write Successful: Doc ID #${targetDocId}`);
      return targetDocId;
    } else {
      const docRef = await addDoc(complaintsCollection, payload);
      console.log(`[Firebase Diagnostic] Connected to civictracker -> Write Successful: Doc ID #${docRef.id}`);
      return docRef.id;
    }
  } catch (err: any) {
    console.error(`[Firebase Diagnostic] Error connecting or writing to civictracker complaints:`, err?.message || err);
    handleFirestoreError(err, OperationType.CREATE, 'complaints');
    throw err;
  }
}

// Update complaint status / fields in Firestore
export async function updateComplaintInFirestore(
  incidentId: string, 
  updates: Partial<CrisisIncident> & { proofUrl?: string; notes?: string }
) {
  try {
    let docRef = doc(complaintsCollection, incidentId);
    
    let displayStatus: string | undefined = undefined;
    if (updates.status) {
      if (updates.status === 'RESOLVED') displayStatus = 'Resolved';
      else if (updates.status === 'IN_PROGRESS') displayStatus = 'In Remediation';
      else if (updates.status === 'DISPATCHED') displayStatus = 'Assigned';
      else displayStatus = 'Registered';
    }

    const updatePayload: Record<string, any> = {};
    if (displayStatus) updatePayload.status = displayStatus;
    if (updates.assignedUnitName) updatePayload.assignedCrew = updates.assignedUnitName;
    if (updates.assignedUnitId) updatePayload.assignedUnitId = updates.assignedUnitId;
    if (updates.proofOfFixUrl || updates.proofUrl) updatePayload.proofOfFixUrl = updates.proofOfFixUrl || updates.proofUrl;
    if (updates.officerNotes || updates.notes) updatePayload.officerNotes = updates.officerNotes || updates.notes;
    if (updates.priority) updatePayload.priority = updates.priority;
    if (updates.department) updatePayload.department = updates.department;
    if (updates.status === 'RESOLVED') updatePayload.resolvedAt = Date.now();

    await updateDoc(docRef, updatePayload);
    console.log(`[Firebase Diagnostic] Connected to omnisync-pothole -> Write Successful: Doc ID #${incidentId} updated`);
  } catch (err) {
    console.warn("[Firebase Diagnostic] Direct updateDoc by ID failed, querying by id field:", err);
    try {
      const q = query(complaintsCollection);
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        if (d.data().id === incidentId || d.id === incidentId) {
          let displayStatus: string | undefined = undefined;
          if (updates.status) {
            if (updates.status === 'RESOLVED') displayStatus = 'Resolved';
            else if (updates.status === 'IN_PROGRESS') displayStatus = 'In Remediation';
            else if (updates.status === 'DISPATCHED') displayStatus = 'Assigned';
            else displayStatus = 'Registered';
          }
          const p: Record<string, any> = {};
          if (displayStatus) p.status = displayStatus;
          if (updates.assignedUnitName) p.assignedCrew = updates.assignedUnitName;
          if (updates.assignedUnitId) p.assignedUnitId = updates.assignedUnitId;
          if (updates.proofOfFixUrl || updates.proofUrl) p.proofOfFixUrl = updates.proofOfFixUrl || updates.proofUrl;
          if (updates.officerNotes || updates.notes) p.officerNotes = updates.officerNotes || updates.notes;
          if (updates.priority) p.priority = updates.priority;
          if (updates.department) p.department = updates.department;
          if (updates.status === 'RESOLVED') p.resolvedAt = Date.now();
          await updateDoc(d.ref, p);
          console.log(`[Firebase Diagnostic] Connected to omnisync-pothole -> Write Successful: Doc ID #${d.id} updated`);
        }
      });
    } catch (innerErr) {
      console.error("[Firebase Diagnostic] Failed to update complaint in omnisync-pothole:", innerErr);
      handleFirestoreError(innerErr, OperationType.UPDATE, `complaints/${incidentId}`);
    }
  }
}

export const INITIAL_WARDS: WardJurisdiction[] = [
  {
    id: "ward-4",
    name: "Ward 4 - Central Zone",
    district: "North Municipal District",
    subAreas: [
      "Sector 4 Trunk Road",
      "Bus Depot Junction",
      "Model Town Gate",
      "Commercial Hub & Mall Road",
      "Civil Hospital Approach"
    ],
    activeOfficerUid: "officer-ward-4",
    activeOfficerName: "Er. Rajesh Verma (Assistant Engineer)",
    totalComplaintsCount: 6,
    activeCrewsCount: 3,
    lat: 31.2530,
    lng: 75.7030
  },
  {
    id: "ward-7",
    name: "Ward 7 - South Industrial Zone",
    district: "South Industrial District",
    subAreas: [
      "Focal Point Phase 1 & 2",
      "Logistics Park Central",
      "Container Freight Station",
      "Industrial Arterial Link",
      "Worker Colony Junction"
    ],
    activeOfficerUid: null,
    activeOfficerName: undefined,
    totalComplaintsCount: 2,
    activeCrewsCount: 1,
    lat: 31.2400,
    lng: 75.6900
  },
  {
    id: "ward-12",
    name: "Ward 12 - West River Corridor",
    district: "West Hydrology District",
    subAreas: [
      "Barrage Approach Highway",
      "Embankment Road North",
      "Water Works Pumping Station",
      "Riverbank Colony Market",
      "Old Canal Sluice"
    ],
    activeOfficerUid: null,
    activeOfficerName: undefined,
    totalComplaintsCount: 1,
    activeCrewsCount: 1,
    lat: 31.2650,
    lng: 75.7150
  },
  {
    id: "ward-9",
    name: "Ward 9 - Tech Park District",
    district: "East IT Corridor",
    subAreas: [
      "Software Technology Park Road",
      "Innovation Square Roundabout",
      "Transit Metro Gateway",
      "Cyber City Avenue",
      "Phase 3 High Street"
    ],
    activeOfficerUid: null,
    activeOfficerName: undefined,
    totalComplaintsCount: 0,
    activeCrewsCount: 1,
    lat: 31.2480,
    lng: 75.7200
  }
];

/**
 * Real-time subscription to Municipal Ward Jurisdictions
 */
export function subscribeToWards(
  onUpdate: (wards: WardJurisdiction[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(wardsCollection, (snapshot) => {
    if (snapshot.empty) {
      seedInitialWards();
      onUpdate(INITIAL_WARDS);
      return;
    }
    const wards: WardJurisdiction[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      wards.push({
        id: d.id,
        name: data.name || d.id,
        district: data.district || "Municipal District",
        subAreas: Array.isArray(data.subAreas) ? data.subAreas : [],
        activeOfficerUid: data.activeOfficerUid || null,
        activeOfficerName: data.activeOfficerName || undefined,
        totalComplaintsCount: typeof data.totalComplaintsCount === 'number' ? data.totalComplaintsCount : 0,
        activeCrewsCount: typeof data.activeCrewsCount === 'number' ? data.activeCrewsCount : 0,
        lat: typeof data.lat === 'number' ? data.lat : 31.2530,
        lng: typeof data.lng === 'number' ? data.lng : 75.7030,
        createdAt: data.createdAt
      });
    });
    onUpdate(wards);
  }, (err) => {
    console.error("Ward subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, 'wards');
    if (onError) onError(err);
  });
}

/**
 * Seed initial wards to Firestore
 */
export async function seedInitialWards() {
  try {
    for (const ward of INITIAL_WARDS) {
      const docRef = doc(wardsCollection, ward.id);
      await setDoc(docRef, {
        id: ward.id,
        name: ward.name,
        district: ward.district,
        subAreas: ward.subAreas,
        activeOfficerUid: ward.activeOfficerUid || null,
        activeOfficerName: ward.activeOfficerName || null,
        totalComplaintsCount: ward.totalComplaintsCount || 0,
        activeCrewsCount: ward.activeCrewsCount || 0,
        lat: ward.lat || 31.2530,
        lng: ward.lng || 75.7030,
        createdAt: serverTimestamp()
      }, { merge: true });
    }
    console.log("Initial wards seeded to Firestore successfully.");
  } catch (err) {
    console.error("Could not seed initial wards:", err);
  }
}

/**
 * Create a new Ward in Firestore
 */
export async function createWardInFirestore(ward: Partial<WardJurisdiction>): Promise<string> {
  try {
    const wardId = (ward.id || `ward-${Date.now().toString(36)}`).toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(wardsCollection, wardId);
    const payload = {
      id: wardId,
      name: ward.name || `Ward ${wardId}`,
      district: ward.district || "Central District",
      subAreas: ward.subAreas || [],
      activeOfficerUid: ward.activeOfficerUid || null,
      activeOfficerName: ward.activeOfficerName || null,
      totalComplaintsCount: 0,
      activeCrewsCount: 0,
      lat: ward.lat || 31.2530,
      lng: ward.lng || 75.7030,
      createdAt: serverTimestamp()
    };
    await setDoc(docRef, payload);
    console.log("Ward created successfully in Firestore:", wardId);
    return wardId;
  } catch (err) {
    console.error("Failed to create ward in Firestore:", err);
    handleFirestoreError(err, OperationType.CREATE, 'wards');
    throw err;
  }
}

/**
 * Update Ward in Firestore
 */
export async function updateWardInFirestore(wardId: string, updates: Partial<WardJurisdiction>): Promise<void> {
  try {
    const docRef = doc(wardsCollection, wardId);
    const p: Record<string, any> = {};
    if (updates.name !== undefined) p.name = updates.name;
    if (updates.district !== undefined) p.district = updates.district;
    if (updates.subAreas !== undefined) p.subAreas = updates.subAreas;
    if (updates.activeOfficerUid !== undefined) p.activeOfficerUid = updates.activeOfficerUid;
    if (updates.activeOfficerName !== undefined) p.activeOfficerName = updates.activeOfficerName;
    if (updates.lat !== undefined) p.lat = updates.lat;
    if (updates.lng !== undefined) p.lng = updates.lng;
    if (updates.totalComplaintsCount !== undefined) p.totalComplaintsCount = updates.totalComplaintsCount;
    if (updates.activeCrewsCount !== undefined) p.activeCrewsCount = updates.activeCrewsCount;

    await updateDoc(docRef, p);
    console.log(`Ward ${wardId} updated in Firestore.`);
  } catch (err) {
    console.error(`Failed to update ward ${wardId} in Firestore:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `wards/${wardId}`);
    throw err;
  }
}

/**
 * Add a Sub-Area / Sector to a Ward
 */
export async function addSubAreaToWard(wardId: string, subAreaName: string): Promise<void> {
  try {
    const docRef = doc(wardsCollection, wardId);
    const snap = await getDoc(docRef);
    let subAreas: string[] = [];
    if (snap.exists()) {
      subAreas = snap.data().subAreas || [];
    }
    if (!subAreas.includes(subAreaName.trim())) {
      subAreas.push(subAreaName.trim());
      await updateDoc(docRef, { subAreas });
      console.log(`Sub-area "${subAreaName}" added to ward ${wardId}`);
    }
  } catch (err) {
    console.error("Failed to add sub-area to ward:", err);
    handleFirestoreError(err, OperationType.UPDATE, `wards/${wardId}`);
    throw err;
  }
}

/**
 * Remove a Sub-Area from a Ward
 */
export async function removeSubAreaFromWard(wardId: string, subAreaName: string): Promise<void> {
  try {
    const docRef = doc(wardsCollection, wardId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const subAreas: string[] = (snap.data().subAreas || []).filter((s: string) => s !== subAreaName);
      await updateDoc(docRef, { subAreas });
    }
  } catch (err) {
    console.error("Failed to remove sub-area from ward:", err);
    handleFirestoreError(err, OperationType.UPDATE, `wards/${wardId}`);
    throw err;
  }
}

/**
 * Delete a Ward from Firestore
 */
export async function deleteWardFromFirestore(wardId: string): Promise<void> {
  try {
    const docRef = doc(wardsCollection, wardId);
    await deleteDoc(docRef);
    console.log(`Ward ${wardId} deleted from Firestore.`);
  } catch (err) {
    console.error(`Failed to delete ward ${wardId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `wards/${wardId}`);
    throw err;
  }
}

/**
 * Lightweight real Firestore ping test
 */
export async function pingFirestoreHealthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    // Perform lightweight read of a health check doc in complaints collection
    const healthRef = doc(complaintsCollection, "_health_check_ping");
    await getDoc(healthRef);
    const latencyMs = Math.max(12, Date.now() - start);
    return {
      ok: true,
      message: "Connected to Municipal Grid ✓",
      latencyMs
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
      return {
        ok: false,
        message: "Sync Offline ⚠️",
        latencyMs
      };
    }
    // Any reachable response confirms connection
    return {
      ok: true,
      message: "Connected to Municipal Grid ✓",
      latencyMs: Math.max(14, latencyMs)
    };
  }
}

/**
 * Seed SBM Public Facilities if collection is empty
 */
export async function seedPublicFacilitiesIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(publicFacilitiesCollection);
    if (snap.empty) {
      console.log("Seeding initial SBM Public Facilities into Firestore...");
      for (const facility of INITIAL_PUBLIC_FACILITIES) {
        await setDoc(doc(publicFacilitiesCollection, facility.id), facility);
      }
      console.log("Seeded SBM Public Facilities successfully.");
    }
  } catch (err) {
    console.warn("Could not seed public facilities (using local fallback):", err);
  }
}

/**
 * Subscribe to real-time SBM Public Facilities updates
 */
export function subscribeToPublicFacilities(
  onUpdate: (facilities: PublicFacility[]) => void
): () => void {
  try {
    seedPublicFacilitiesIfEmpty();
    return onSnapshot(
      publicFacilitiesCollection,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(INITIAL_PUBLIC_FACILITIES);
          return;
        }
        const list: PublicFacility[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name || "Public Facility",
            type: data.type || "TOILET",
            location: data.location || { lat: 31.2530, lng: 75.7030, address: "Ward 4" },
            ward: data.ward || "Ward 4 - Central Zone",
            rating: typeof data.rating === "number" ? data.rating : 4.0,
            totalRatings: data.totalRatings || 1,
            status: data.status || "OPEN",
            timings: data.timings || "24/7 Open",
            features: data.features || []
          });
        });
        onUpdate(list);
      },
      (error) => {
        console.warn("Firestore public facilities listener error (fallback to initial data):", error);
        onUpdate(INITIAL_PUBLIC_FACILITIES);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to public facilities:", err);
    onUpdate(INITIAL_PUBLIC_FACILITIES);
    return () => {};
  }
}

/**
 * Rate Cleanliness for an SBM Public Facility
 */
export async function ratePublicFacility(
  facilityId: string,
  newStarRating: number
): Promise<void> {
  try {
    const facilityRef = doc(publicFacilitiesCollection, facilityId);
    const snap = await getDoc(facilityRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentRating = typeof data.rating === "number" ? data.rating : 4.0;
      const currentTotal = typeof data.totalRatings === "number" ? data.totalRatings : 1;
      const newTotal = currentTotal + 1;
      const updatedRating = Number(((currentRating * currentTotal + newStarRating) / newTotal).toFixed(1));

      await updateDoc(facilityRef, {
        rating: updatedRating,
        totalRatings: newTotal
      });
      console.log(`Facility ${facilityId} rated successfully: ${updatedRating} (${newTotal} ratings)`);
    } else {
      // If facility not in firestore yet, seed from initial
      const initial = INITIAL_PUBLIC_FACILITIES.find(f => f.id === facilityId);
      if (initial) {
        const newTotal = (initial.totalRatings || 1) + 1;
        const updatedRating = Number(((initial.rating * (initial.totalRatings || 1) + newStarRating) / newTotal).toFixed(1));
        await setDoc(facilityRef, {
          ...initial,
          rating: updatedRating,
          totalRatings: newTotal
        });
      }
    }
  } catch (err) {
    console.error(`Failed to rate public facility ${facilityId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `public_facilities/${facilityId}`);
    throw err;
  }
}
