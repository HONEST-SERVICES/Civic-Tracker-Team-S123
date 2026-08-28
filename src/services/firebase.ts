import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  setDoc,
  getDocs
} from "firebase/firestore";
import { CrisisIncident, HazardCategory, PriorityLevel, DepartmentType } from "../types";
import { INITIAL_INCIDENTS } from "../mockData";

const firebaseConfig = {
  apiKey: "AIzaSyBTEeCUBJOGkeQBYrcunJR8JFMiWOJrNXs",
  authDomain: "omnisync-pothole.firebaseapp.com",
  projectId: "omnisync-pothole",
  storageBucket: "omnisync-pothole.firebasestorage.app",
  messagingSenderId: "375848058708",
  appId: "1:375848058708:web:efe864b4152e76d3f7d2c1",
  measurementId: "G-X0BKP2X3RF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const complaintsCollection = collection(db, "complaints");

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
    ward: incident.location?.zone || 'Ward 4',
    location: {
      address: incident.location?.address || 'Ward 4, G.T. Road',
      lat: incident.location?.lat || 31.2530,
      lng: incident.location?.lng || 75.7030,
      zone: incident.location?.zone || 'Ward 4'
    },
    citizenName: incident.reporterName || 'Citizen',
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

// Listen to real-time updates from Firestore
export function subscribeToComplaints(
  onUpdate: (incidents: CrisisIncident[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(complaintsCollection, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      // Seed initial data if empty
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
    console.warn("Firestore onSnapshot error (fallback to local):", err);
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

// Create a new complaint in Firestore
export async function createComplaintInFirestore(incident: Partial<CrisisIncident>): Promise<string> {
  const payload = mapIncidentToFirestore(incident);
  const docRef = await addDoc(complaintsCollection, payload);
  return docRef.id;
}

// Update complaint status / fields in Firestore
export async function updateComplaintInFirestore(
  incidentId: string, 
  updates: Partial<CrisisIncident> & { proofUrl?: string; notes?: string }
) {
  try {
    // Try to find the document with id == incidentId or matching field
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
    // If doc ID didn't match directly, query for doc where id == incidentId
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
  }
}
