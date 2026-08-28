import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc, 
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
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  signOut,
  User,
  ConfirmationResult,
  ApplicationVerifier
} from "firebase/auth";
import { CrisisIncident, HazardCategory, PriorityLevel, DepartmentType, UserProfile, UserRole, MunicipalUnit } from "../types";
import { INITIAL_INCIDENTS, INITIAL_MUNICIPAL_UNITS } from "../mockData";
import { getFirebaseConfig } from "../config/keys";

const firebaseConfig = getFirebaseConfig();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || "ai-studio-syncdispatch-a04d4492-36cf-4af0-9efe-9dc4ed18c659");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const complaintsCollection = collection(db, "complaints");
export const usersCollection = collection(db, "users");
export const unitsCollection = collection(db, "units");

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: UserProfile }> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const profile = await syncUserProfile(cred.user);
  return { user: cred.user, profile };
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
 * Verify received Phone OTP Code
 */
export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult, 
  otpCode: string
): Promise<{ user: User; profile: UserProfile }> {
  const cred = await confirmationResult.confirm(otpCode);
  const profile = await syncUserProfile(cred.user);
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
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: user.uid,
        name: data.name || user.displayName || "Citizen",
        phone: data.phone || user.phoneNumber || "",
        email: data.email || user.email || "",
        role: (data.role as UserRole) || "CITIZEN",
        assignedWard: data.assignedWard ?? null,
        assignedCrew: data.assignedCrew || undefined,
        designation: data.designation || undefined,
        createdAt: data.createdAt || null,
        photoURL: data.photoURL || user.photoURL || undefined
      };
    }

    // Create new profile if not exists
    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || (user.phoneNumber ? `Citizen (${user.phoneNumber.slice(-4)})` : "Citizen"),
      phone: user.phoneNumber || "",
      email: user.email || "",
      role: "CITIZEN",
      assignedWard: null,
      createdAt: serverTimestamp(),
      photoURL: user.photoURL || undefined
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (err) {
    console.warn("Error syncing user profile with Firestore:", err);
    return {
      uid: user.uid,
      name: user.displayName || (user.phoneNumber ? `Citizen (${user.phoneNumber.slice(-4)})` : "Citizen"),
      phone: user.phoneNumber || "",
      email: user.email || "",
      role: "CITIZEN",
      assignedWard: null,
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
      return {
        uid,
        name: data.name || "Citizen",
        phone: data.phone || "",
        email: data.email || "",
        role: (data.role as UserRole) || "CITIZEN",
        assignedWard: data.assignedWard ?? null,
        assignedCrew: data.assignedCrew || undefined,
        designation: data.designation || undefined,
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

    await updateDoc(userRef, p);
  } catch (err) {
    console.warn("Error updating user role/ward in Firestore:", err);
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
      users.push({
        uid: d.id,
        name: data.name || "Citizen",
        phone: data.phone || "",
        email: data.email || "",
        role: (data.role as UserRole) || "CITIZEN",
        assignedWard: data.assignedWard ?? null,
        assignedCrew: data.assignedCrew || undefined,
        designation: data.designation || undefined,
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
      users.push({
        uid: d.id,
        name: data.name || "Citizen",
        phone: data.phone || "",
        email: data.email || "",
        role: (data.role as UserRole) || "CITIZEN",
        assignedWard: data.assignedWard ?? null,
        assignedCrew: data.assignedCrew || undefined,
        designation: data.designation || undefined,
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
  if (rawStatus === 'RESOLVED') {
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
    actionDirectives: data.actionDirectives || []
  };
}

// Convert CrisisIncident to Firestore payload
export function mapIncidentToFirestore(incident: Partial<CrisisIncident>) {
  let displayStatus = "Registered";
  if (incident.status === 'RESOLVED') {
    displayStatus = "Resolved";
  } else if (incident.status === 'IN_PROGRESS') {
    displayStatus = "In Remediation";
  } else if (incident.status === 'DISPATCHED') {
    displayStatus = "Assigned";
  }

  return {
    id: incident.id,
    title: incident.title || 'Civic Infrastructure Grievance',
    category: incident.category || 'DEEP_POTHOLE',
    status: displayStatus,
    ward: incident.ward || incident.location?.zone || 'Ward 4 - Central Zone',
    location: {
      address: incident.location?.address || 'Ward 4, G.T. Road',
      lat: incident.location?.lat || 31.2530,
      lng: incident.location?.lng || 75.7030,
      zone: incident.ward || incident.location?.zone || 'Ward 4 - Central Zone'
    },
    citizenName: incident.reporterName || 'Citizen',
    citizenPhone: incident.reporterPhone || '',
    citizenUid: incident.citizenUid || '',
    assignedCrew: incident.assignedUnitName || '',
    assignedUnitId: incident.assignedUnitId || '',
    priority: incident.priority || 'P2_URGENT',
    department: incident.department || 'PUBLIC_WORKS',
    riskScore: incident.riskScore || 75,
    imageUrl: incident.imageUrl || '',
    proofOfFixUrl: incident.proofOfFixUrl || '',
    officerNotes: incident.officerNotes || '',
    etaMinutes: incident.etaMinutes || 15,
    description: incident.description || '',
    createdAt: serverTimestamp()
  };
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
      // Seed initial data if collection is completely fresh
      seedInitialComplaints();
      onUpdate(INITIAL_INCIDENTS);
      return;
    }

    const items: CrisisIncident[] = [];
    snapshot.forEach((docSnap) => {
      items.push(mapDocToIncident(docSnap.id, docSnap.data()));
    });
    onUpdate(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'complaints');
    if (onError) onError(err);
  });
}

/**
 * Role-scoped real-time Complaints subscription
 * - CITIZEN: filtered where `citizenUid == auth.currentUser.uid`
 * - FIELD_CREW: filtered where `assignedWard == userProfile.assignedWard` AND `status != 'Draft'`
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
      seedInitialComplaints();
      onUpdate(INITIAL_INCIDENTS);
      return;
    }

    const allItems: CrisisIncident[] = [];
    snapshot.forEach((docSnap) => {
      allItems.push(mapDocToIncident(docSnap.id, docSnap.data()));
    });

    let scopedItems: CrisisIncident[] = allItems;

    if (role === 'CITIZEN') {
      const uid = userProfile?.uid || auth.currentUser?.uid;
      const citizenName = userProfile?.name?.toLowerCase();
      scopedItems = allItems.filter((inc) => {
        if (uid && inc.citizenUid === uid) return true;
        if (citizenName && inc.reporterName && inc.reporterName.toLowerCase() === citizenName) return true;
        if (userProfile?.phone && inc.reporterPhone && inc.reporterPhone.replace(/\s+/g, '') === userProfile.phone.replace(/\s+/g, '')) return true;
        return false;
      });
    } else if (role === 'FIELD_CREW') {
      const ward = userProfile?.assignedWard;
      scopedItems = allItems.filter((inc) => {
        const matchesWard = !ward || inc.ward === ward || inc.location.zone === ward;
        return matchesWard;
      });
    } else if (role === 'WARD_OFFICER') {
      const ward = userProfile?.assignedWard;
      scopedItems = allItems.filter((inc) => {
        if (!ward) return true;
        return inc.ward === ward || inc.location.zone === ward;
      });
    } else if (role === 'SUPER_ADMIN') {
      scopedItems = allItems;
    }

    onUpdate(scopedItems);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'complaints');
    if (onError) onError(err);
  });
}

// Seed initial complaints to Firestore if needed
async function seedInitialComplaints() {
  try {
    for (const inc of INITIAL_INCIDENTS) {
      const docRef = doc(complaintsCollection, inc.id);
      await setDoc(docRef, mapIncidentToFirestore(inc));
    }
  } catch (err) {
    console.warn("Could not seed initial complaints:", err);
  }
}

// Create a new complaint directly in Firestore
export async function createComplaintInFirestore(incident: Partial<CrisisIncident>): Promise<string> {
  try {
    const payload = mapIncidentToFirestore(incident);
    const docRef = await addDoc(complaintsCollection, payload);
    return docRef.id;
  } catch (err) {
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
  } catch (err) {
    console.warn("Direct updateDoc by ID failed, querying by id field:", err);
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
        }
      });
    } catch (innerErr) {
      handleFirestoreError(innerErr, OperationType.UPDATE, `complaints/${incidentId}`);
    }
  }
}
