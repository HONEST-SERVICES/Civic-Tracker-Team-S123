/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  INITIAL_INCIDENTS, 
  INITIAL_MUNICIPAL_UNITS, 
  CRISIS_SCENARIOS 
} from './mockData';
import { 
  CrisisIncident, 
  MunicipalUnit, 
  AgentThoughtStep, 
  UnitStatus,
  UserRole,
  DepartmentType,
  PriorityLevel,
  UserProfile
} from './types';
import { CitizenPortal } from './components/CitizenPortal';
import { MunicipalOfficerCommandCenter } from './components/MunicipalOfficerCommandCenter';
import { FieldCrewWorkOrders } from './components/FieldCrewWorkOrders';
import { VolunteerPortal } from './components/VolunteerPortal';
import { SwachhSurvekshanAuditorDesk } from './components/SwachhSurvekshanAuditorDesk';
import { GeminiAssistantDrawer } from './components/GeminiAssistantDrawer';
import { WardStaffManagementModal } from './components/WardStaffManagementModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { SwachhataAuthScreen } from './components/SwachhataAuthScreen';
import { SwachhataDriveModal, SAMPLE_CAMPAIGNS, CleanlinessCampaign } from './components/SwachhataDriveModal';
import { EventsView } from './components/EventsView';
import { ProfileView } from './components/ProfileView';
import { UserAvatar } from './components/UserAvatar';
import { executeAutonomousDispatch } from './services/geminiService';
import { 
  subscribeToScopedComplaints,
  subscribeToUnits,
  createComplaintInFirestore, 
  updateComplaintInFirestore,
  updateUnitInFirestore,
  onAuthChange,
  logoutUser,
  syncUserProfile,
  createOptimisticUserProfile
} from './services/firebase';
import { 
  Building2, 
  Sparkles, 
  Headphones,
  Headset,
  RotateCcw, 
  ChevronDown, 
  Home, 
  Calendar, 
  Plus, 
  ClipboardList, 
  User, 
  UserCircle,
  Shield, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Settings, 
  LogIn, 
  LogOut, 
  Truck, 
  Users, 
  Crown,
  Award,
  Activity,
  Globe,
  Eye,
  Building,
  MapPin
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { useLanguage } from './context/LanguageContext';

function getDisplayRoleName(role: UserRole, ward?: string | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Master Super Admin';
    case 'WARD_OFFICER':
      return ward ? `${ward} Officer` : 'Ward Officer';
    case 'FIELD_CREW':
    case 'FIELD_CONTRACTOR':
      return 'Field Contractor Lead';
    case 'VOLUNTEER':
    case 'SWACHHATA_DOOT':
      return 'Swachhata Doot';
    case 'SWACHH_SURVEKSHAN_AUDITOR':
      return 'National Quality Auditor';
    case 'CITIZEN':
    default:
      return 'Verified Citizen';
  }
}

export default function App() {
  const { language, setLanguage, t } = useLanguage();

  // Authentication & Current User Profile (Determined solely by Firebase Auth + Firestore role)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Application Data State (Subscribed 100% to Firestore)
  const [incidents, setIncidents] = useState<CrisisIncident[]>([]);
  const [units, setUnits] = useState<MunicipalUnit[]>(INITIAL_MUNICIPAL_UNITS);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

  // Modals & Navigation
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showStaffManagementModal, setShowStaffManagementModal] = useState<boolean>(false);
  const [showGeminiAssistant, setShowGeminiAssistant] = useState<boolean>(false);
  const [showSurveyModal, setShowSurveyModal] = useState<boolean>(false);
  const [commandCenterTab, setCommandCenterTab] = useState<'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE'>('COMMAND_DESK');

  // Cleanliness Drive Campaign State
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [selectedDriveCampaign, setSelectedDriveCampaign] = useState<CleanlinessCampaign>(SAMPLE_CAMPAIGNS[0]);

  // Citizen Mobile Tab Navigation: 'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE' | 'FACILITIES'
  const [citizenTab, setCitizenTab] = useState<'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE' | 'FACILITIES'>('HOME');
  const [isOfficerCitizenMode, setIsOfficerCitizenMode] = useState<boolean>(false);

  const [selectedIncident, setSelectedIncident] = useState<CrisisIncident | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<MunicipalUnit | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Direct Live Camera Intake from Navigation (+)
  const navCameraInputRef = useRef<HTMLInputElement>(null);
  const [pendingCapturedFile, setPendingCapturedFile] = useState<File | null>(null);

  // Helper to normalize route paths
  const normalizeRoutePath = (path: string) => {
    const p = path.toLowerCase().replace(/\/+$/, '');
    return p === '' ? '/' : p;
  };

  // Synchronize internal app views from URL path
  const applyRouteFromPath = (path: string) => {
    const normalized = normalizeRoutePath(path);
    if (normalized === '/file-grievance' || normalized === '/file' || normalized === '/report') {
      setCitizenTab('FORM');
      setIsOfficerCitizenMode(true);
      setShowSurveyModal(false);
    } else if (normalized === '/track' || normalized === '/complaints') {
      setCitizenTab('COMPLAINTS');
      setIsOfficerCitizenMode(true);
      setShowSurveyModal(false);
    } else if (normalized === '/facilities' || normalized === '/sbm' || normalized === '/toilets') {
      setCitizenTab('FACILITIES');
      setIsOfficerCitizenMode(true);
      setShowSurveyModal(false);
    } else if (normalized === '/events' || normalized === '/drives' || normalized === '/campaigns') {
      setCitizenTab('EVENTS');
      setIsOfficerCitizenMode(true);
      setShowSurveyModal(false);
    } else if (normalized === '/survey') {
      setCitizenTab('HOME');
      setIsOfficerCitizenMode(true);
      setShowSurveyModal(true);
    } else if (normalized === '/profile' || normalized === '/account') {
      setCitizenTab('PROFILE');
      setShowSurveyModal(false);
    } else if (normalized === '/command-hq' || normalized === '/command' || normalized === '/gis') {
      setIsOfficerCitizenMode(false);
      setCitizenTab('HOME');
      setCommandCenterTab('COMMAND_DESK');
      setShowSurveyModal(false);
    } else if (normalized === '/governance' || normalized === '/kpi' || normalized === '/wards') {
      setIsOfficerCitizenMode(false);
      setCitizenTab('HOME');
      setCommandCenterTab('WARD_CONFIG');
      setShowSurveyModal(false);
    } else {
      // Default to / or /home
      setCitizenTab('HOME');
      setShowSurveyModal(false);
    }
  };

  // Push or replace URL state and update views
  const navigateTo = (path: string, replace = false) => {
    const targetNorm = normalizeRoutePath(path);
    const currentNorm = normalizeRoutePath(window.location.pathname);
    if (currentNorm !== targetNorm) {
      if (replace) {
        window.history.replaceState(null, '', targetNorm);
      } else {
        window.history.pushState(null, '', targetNorm);
      }
    }
    applyRouteFromPath(targetNorm);
  };

  // Synchronize URL and listen to Hardware Back / Browser Popstate events
  useEffect(() => {
    // Initial sync on mount
    applyRouteFromPath(window.location.pathname);

    const handlePopState = () => {
      // 1. If any modal is active, close the modal first without leaving the page
      if (showAuthModal) {
        setShowAuthModal(false);
        return;
      }
      if (showSettingsModal) {
        setShowSettingsModal(false);
        return;
      }
      if (showStaffManagementModal) {
        setShowStaffManagementModal(false);
        return;
      }
      if (showGeminiAssistant) {
        setShowGeminiAssistant(false);
        return;
      }
      if (showDriveModal) {
        setShowDriveModal(false);
        return;
      }
      if (showSurveyModal) {
        setShowSurveyModal(false);
        return;
      }
      if (showProfileMenu) {
        setShowProfileMenu(false);
        return;
      }

      // 2. Otherwise update current view from popped URL
      applyRouteFromPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    showAuthModal,
    showSettingsModal,
    showStaffManagementModal,
    showGeminiAssistant,
    showDriveModal,
    showSurveyModal,
    showProfileMenu
  ]);

  // Background Agent Thought Logs
  const [thoughtLogs, setThoughtLogs] = useState<AgentThoughtStep[]>([
    {
      id: 'init-step-1',
      timestamp: new Date().toISOString().substring(11, 23),
      type: 'ANALYSIS',
      content: 'Swachhata-MoHUA Automated Redressal Engine Active. Firestore real-time synchronization live.',
      latencyMs: 25
    }
  ]);

  const userRole: UserRole = currentUser?.role || 'CITIZEN';

  // Listen to Firebase Auth state for strict RBAC resolution with instant optimistic update
  useEffect(() => {
    let isInitial = true;
    const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const startTime = performance.now();
        // 1. Instant optimistic profile update (<10ms)
        const optimisticProfile = createOptimisticUserProfile(firebaseUser);
        setCurrentUser((prev) => {
          // If already enriched with custom fields from Firestore, preserve non-default data
          if (prev && prev.uid === firebaseUser.uid && prev.role !== 'CITIZEN') {
            return prev;
          }
          return optimisticProfile;
        });

        // 2. Non-blocking asynchronous Firestore background profile sync
        try {
          const remoteProfile = await syncUserProfile(firebaseUser);
          setCurrentUser(remoteProfile);
        } catch (e) {
          console.warn('[Firebase Diagnostic] Background profile sync warning:', e);
        }

        const elapsed = Math.round(performance.now() - startTime);
        if (isInitial) {
          console.log(`[Auth Performance] Auth state initialized in: ${elapsed} ms`);
          isInitial = false;
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Subscribe to real-time scoped Firestore complaints based on active role
  useEffect(() => {
    const unsubscribeComplaints = subscribeToScopedComplaints(
      userRole,
      currentUser,
      (firestoreComplaints) => {
        setIncidents(firestoreComplaints || []);
        setIsFirestoreConnected(true);
      },
      (error) => {
        console.warn('Firestore complaints subscription warning:', error);
      }
    );

    return () => {
      if (unsubscribeComplaints) unsubscribeComplaints();
    };
  }, [userRole, currentUser?.uid, currentUser?.assignedWard]);

  // Subscribe to real-time municipal response units from Firestore
  useEffect(() => {
    const unsubscribeUnits = subscribeToUnits(
      (firestoreUnits) => {
        if (firestoreUnits && firestoreUnits.length > 0) {
          setUnits(firestoreUnits);
        }
      },
      (error) => {
        console.warn('Firestore units subscription warning:', error);
      }
    );

    return () => {
      if (unsubscribeUnits) unsubscribeUnits();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      // Clear authenticated session and revert to clean unauthenticated home view
      setCurrentUser(null);
      setCitizenTab('HOME');
      setSelectedIncident(null);
      setSelectedUnit(null);
      setShowSettingsModal(false);
      setShowGeminiAssistant(false);
      setShowProfileMenu(false);
      setShowSurveyModal(false);
      setThoughtLogs([]);
      navigateTo('/', true);
    }
  };

  // Core Autonomous Dispatch Trigger & Firestore Write
  const handleDispatchIncident = async (incidentData: Partial<CrisisIncident>) => {
    setIsDispatching(true);

    const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
    const newTicketId = incidentData.id || `Ticket #${randomTicketNum}`;
    const fullIncident: CrisisIncident = {
      id: newTicketId,
      title: incidentData.title || 'Civic Infrastructure Grievance',
      description: incidentData.description || 'Grievance registered via Swachhata-MoHUA portal.',
      category: incidentData.category || 'DEEP_POTHOLE',
      priority: incidentData.priority || 'P2_URGENT',
      department: incidentData.department || 'PUBLIC_WORKS',
      status: 'OPEN',
      riskScore: incidentData.riskScore || 75,
      location: incidentData.location || {
        lat: 31.2530,
        lng: 75.7030,
        zone: 'Ward 4 - Sector 4',
        address: 'Ward 4, G.T. Road'
      },
      imageUrl: incidentData.imageUrl,
      createdAt: Date.now(),
      reporterName: incidentData.reporterName || currentUser?.name || 'Citizen',
      reporterPhone: incidentData.reporterPhone || currentUser?.phone || '',
      citizenUid: currentUser?.uid || '',
      ward: incidentData.ward || incidentData.location?.zone || 'Ward 4 - Central Zone',
      aiConfidence: typeof incidentData.aiConfidence === 'number' ? incidentData.aiConfidence : 98,
      aiReasoning: incidentData.aiReasoning || incidentData.description || '',
      requiresManualVerification: Boolean(incidentData.requiresManualVerification),
      hasVoiceNote: Boolean(incidentData.hasVoiceNote),
      audioNoteBase64: incidentData.audioNoteBase64 || ''
    };

    // 1. Optimistic Local Update
    setIncidents(prev => [fullIncident, ...prev]);
    setSelectedIncident(fullIncident);

    // 2. Persist to Firestore with 5s timeout
    try {
      await Promise.race([
        createComplaintInFirestore(fullIncident),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 5000))
      ]);
    } catch (err) {
      console.warn('Firestore create complaint notice:', err);
    }

    // 3. Autonomous Crew Dispatch Calculation with 5s timeout
    try {
      const result = await Promise.race([
        executeAutonomousDispatch(fullIncident, units),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Dispatch calculation timeout')), 5000))
      ]);

      if (result && result.thoughtLogs && result.thoughtLogs.length > 0) {
        setThoughtLogs(prev => [...prev.slice(-49), ...result.thoughtLogs].slice(-50));
      }

      if (result && result.dispatchedUnit) {
        const assignedUnit = result.dispatchedUnit;
        const eta = result.dispatchResultPayload?.etaMinutes || 12;

        const updates: Partial<CrisisIncident> = {
          status: 'DISPATCHED',
          assignedUnitId: assignedUnit.id,
          assignedUnitName: assignedUnit.name,
          etaMinutes: eta,
          targetResolutionMinutes: eta * 3,
          dispatchedAt: Date.now()
        };

        // Sync dispatch updates to Firestore
        updateComplaintInFirestore(newTicketId, updates).catch(console.warn);
        updateUnitInFirestore(assignedUnit.id, {
          status: 'EN_ROUTE',
          assignedIncidentId: fullIncident.id,
          currentZone: fullIncident.location.zone
        }).catch(console.warn);

        // Update local incidents and units
        setIncidents(prev => prev.map(inc => {
          if (inc.id === fullIncident.id) {
            return {
              ...inc,
              ...updates,
              aiSummary: `Auto-Assigned Ward Inspector: ${assignedUnit.name} (ETA: ~${eta} mins)`
            };
          }
          return inc;
        }));

        setUnits(prev => prev.map(u => {
          if (u.id === assignedUnit.id) {
            return {
              ...u,
              status: 'EN_ROUTE',
              assignedIncidentId: fullIncident.id,
              currentZone: fullIncident.location.zone
            };
          }
          return u;
        }));

        setSelectedIncident({
          ...fullIncident,
          ...updates
        });
      }
    } catch (error) {
      console.warn('Redressal dispatch notice:', error);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleUpdateIncidentStatus = async (
    incidentId: string, 
    newStatus: CrisisIncident['status'],
    resolutionProofUrl?: string,
    resolutionNotes?: string,
    extraUpdates?: Partial<CrisisIncident>
  ) => {
    try {
      await updateComplaintInFirestore(incidentId, {
        status: newStatus,
        resolutionProofUrl,
        resolutionNotes,
        resolvedAt: newStatus === 'RESOLVED' ? Date.now() : undefined,
        ...extraUpdates
      });
    } catch (err) {
      console.warn('Firestore incident status update err:', err);
    }

    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: newStatus,
          resolutionProofUrl: resolutionProofUrl || inc.resolutionProofUrl,
          resolutionNotes: resolutionNotes || inc.resolutionNotes,
          resolvedAt: newStatus === 'RESOLVED' ? Date.now() : inc.resolvedAt,
          ...extraUpdates
        };
      }
      return inc;
    }));

    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident(prev => prev ? {
        ...prev,
        status: newStatus,
        resolutionProofUrl: resolutionProofUrl || prev.resolutionProofUrl,
        resolutionNotes: resolutionNotes || prev.resolutionNotes,
        resolvedAt: newStatus === 'RESOLVED' ? Date.now() : prev.resolvedAt,
        ...extraUpdates
      } : null);
    }
  };

  const handleUpdateUnitStatus = async (unitId: string, newStatus: UnitStatus) => {
    try {
      await updateUnitInFirestore(unitId, { status: newStatus });
    } catch (err) {
      console.warn('Firestore unit update err:', err);
    }

    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        return { ...u, status: newStatus };
      }
      return u;
    }));
  };

  const handleAssignCrew = async (incidentId: string, unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    try {
      await updateComplaintInFirestore(incidentId, {
        assignedUnitId: unit.id,
        assignedUnitName: unit.name,
        status: 'DISPATCHED',
        etaMinutes: 15
      });

      await updateUnitInFirestore(unit.id, {
        status: 'EN_ROUTE',
        assignedIncidentId: incidentId
      });
    } catch (err) {
      console.warn('Firestore assign crew err:', err);
    }

    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          assignedUnitId: unit.id,
          assignedUnitName: unit.name,
          status: 'DISPATCHED',
          etaMinutes: 15
        };
      }
      return inc;
    }));

    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          status: 'EN_ROUTE',
          assignedIncidentId: incidentId
        };
      }
      return u;
    }));
  };

  const handleReRouteDepartment = async (incidentId: string, dept: DepartmentType) => {
    try {
      await updateComplaintInFirestore(incidentId, { department: dept });
    } catch (err) {
      console.warn('Firestore department update err:', err);
    }
    setIncidents(prev => prev.map(inc => (inc.id === incidentId ? { ...inc, department: dept } : inc)));
  };

  const handleAdjustPriority = async (incidentId: string, priority: PriorityLevel) => {
    try {
      await updateComplaintInFirestore(incidentId, { priority });
    } catch (err) {
      console.warn('Firestore priority update err:', err);
    }
    setIncidents(prev => prev.map(inc => (inc.id === incidentId ? { ...inc, priority } : inc)));
  };

  // 1. AUTH RESOLUTION GATE: Prevent login screen flash on hard reload
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#EEF2F6] flex flex-col items-center justify-center space-y-4">
        <img src="/logo.png" alt="CivicPulse" className="h-12 w-auto animate-pulse" />
        <div className="w-8 h-8 border-3 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Unauthenticated User View: Render official Swachhata Auth screen
  if (!currentUser) {
    return (
      <SwachhataAuthScreen
        onSuccess={(profile) => {
          setCurrentUser(profile);
          navigateTo('/');
        }}
      />
    );
  }

    const isOfficerCommandView = (userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') && citizenTab !== 'PROFILE' && !isOfficerCitizenMode;

    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none text-slate-900">
        {/* Floating/Header Pill for Officer Citizen Mode */}
        {isOfficerCitizenMode && userRole !== 'CITIZEN' && (
          <div className="py-1.5 px-3 bg-amber-500 text-slate-950 flex items-center justify-between text-xs font-medium shadow-xs relative z-50 border-b border-amber-600">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse shrink-0"></span>
              <span className="tracking-tight font-extrabold text-slate-950 truncate">
                Viewing as Citizen (Officer Mode) • Active Session Preserved
              </span>
            </div>
            <button
              id="switch-back-to-command-hq-btn"
              onClick={() => navigateTo('/command-hq')}
              className="bg-slate-950 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition-all shrink-0 ml-2 cursor-pointer"
            >
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch Back to Command HQ</span>
            </button>
          </div>
        )}

        {/* 1. TOP HEADER (Rendered for Citizen, Crew, Volunteers and Profile views) */}
        {!isOfficerCommandView && (
          <header className="h-14 px-3 sm:px-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200/90 shadow-xs relative z-40 gap-2">
            {/* Left: CivicPulse Logo & Title (Universal Home Link) */}
            <div 
              onClick={() => {
                if (userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') {
                  setCommandCenterTab('COMMAND_DESK');
                  navigateTo('/command-hq');
                } else {
                  setCitizenTab('HOME');
                  navigateTo('/');
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer select-none group transition-all duration-200 hover:opacity-90 active:scale-95"
              title="Return to Home Dashboard"
            >
              <img 
                src="/logo.png" 
                alt="CivicPulse Logo" 
                className="h-8 sm:h-10 w-auto object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="truncate font-bold tracking-tight text-slate-900 text-sm sm:text-base md:text-lg group-hover:text-blue-900 transition-colors">
                    {t('appName')}
                  </span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-1.5 py-0.5 rounded font-semibold hidden sm:inline">
                    Live Matrix
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate hidden md:block font-normal">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>

            {/* Center / Freed Header Real Estate: Prominent High-Elevation "Civic Support & AI Assistant" Trigger Button */}
            <div className="flex items-center justify-center min-w-0">
              <button
                id="header-copilot-trigger-btn"
                onClick={() => setShowGeminiAssistant(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 sm:px-3.5 py-1.5 rounded-full shadow-xs hover:shadow-md border border-slate-700/80 transition-all duration-200 flex items-center gap-2 text-xs font-semibold active:scale-95 cursor-pointer shrink-0 group"
              >
                <div className="relative flex items-center justify-center text-teal-300 group-hover:text-teal-200 transition-colors">
                  <Headset className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
                </div>
                <span className="hidden xs:inline sm:inline whitespace-nowrap text-slate-100 font-bold">Civic AI Assistant</span>
                <span className="bg-slate-800/90 text-teal-300 border border-teal-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
                  Live Help
                </span>
              </button>
            </div>

            {/* Right: Clean Profile Avatar / Sign In Action */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {!authLoading && !currentUser ? (
                <button
                  id="header-signin-btn"
                  onClick={() => setShowAuthModal(true)}
                  className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              ) : citizenTab === 'PROFILE' ? null : (
                /* User Profile Menu Trigger */
                <div className="relative">
                  <button
                    id="header-profile-btn"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    title="User Profile & Settings"
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-xs overflow-hidden"
                  >
                    <UserAvatar
                      photoURL={currentUser?.photoURL}
                      name={currentUser?.name}
                      size="md"
                      className="w-full h-full"
                    />
                  </button>

                  {/* Profile Dropdown Drawer */}
                  {showProfileMenu && currentUser && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2">
                      <div className="pb-3 border-b border-slate-100 flex items-center gap-2.5">
                        <UserAvatar
                          photoURL={currentUser?.photoURL}
                          name={currentUser?.name}
                          size="md"
                          className="w-10 h-10 ring-2 ring-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</h4>
                          <div className="mt-0.5">
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {getDisplayRoleName(currentUser.role, currentUser.assignedWard)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.email || currentUser.phone}</p>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          id="menu-profile-btn"
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigateTo('/profile');
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
                        >
                          <User className="w-4 h-4 text-orange-600" />
                          <span>My Profile & ID</span>
                        </button>

                        <button
                          id="menu-gemini-btn"
                          onClick={() => {
                            setShowGeminiAssistant(true);
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span>AI Civic Copilot</span>
                        </button>

                        <button
                          id="menu-settings-btn"
                          onClick={() => {
                            setShowSettingsModal(true);
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-slate-500" />
                          <span>Preferences & Settings</span>
                        </button>

                        {userRole === 'SUPER_ADMIN' && (
                          <button
                            id="menu-staff-btn"
                            onClick={() => {
                              setShowStaffManagementModal(true);
                              setShowProfileMenu(false);
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Users className="w-4 h-4 text-slate-500" />
                            <span>Staff Delegations</span>
                          </button>
                        )}

                        {userRole !== 'CITIZEN' && (
                          <button
                            id="menu-toggle-view-btn"
                            onClick={() => {
                              setShowProfileMenu(false);
                              if (isOfficerCitizenMode) {
                                navigateTo('/command-hq');
                              } else {
                                navigateTo('/');
                              }
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100/80 rounded-lg transition flex items-center gap-2 font-bold cursor-pointer border border-amber-200/80"
                          >
                            <Eye className="w-4 h-4 text-amber-600" />
                            <span>{isOfficerCitizenMode ? 'Switch to Command HQ' : 'Switch to Citizen View'}</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          id="menu-signout-btn"
                          onClick={() => {
                            setShowProfileMenu(false);
                            handleSignOut();
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

      {/* 2. MAIN APPLICATION WORKSPACE ROUTED STRICTLY BY FIRESTORE RBAC */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* GLOBAL PROFILE VIEW: Rendered whenever PROFILE tab is selected by any role */}
        {citizenTab === 'PROFILE' ? (
          <div className="flex-1 overflow-hidden">
            <ProfileView
              currentUser={currentUser}
              onSignOut={handleSignOut}
              onSwitchToTacticalDesk={() => {
                navigateTo('/command-hq');
              }}
              onOpenStaffManagement={() => setShowStaffManagementModal(true)}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onOpenSettingsModal={() => setShowSettingsModal(true)}
              onOpenGeminiCopilot={() => setShowGeminiAssistant(true)}
              onUpdateUserProfile={(updated) => setCurrentUser(updated)}
            />
          </div>
        ) : (
          <>
            {/* VIEW A: WARD OFFICER & SUPER ADMIN COMMAND DESK */}
            {!isOfficerCitizenMode && (userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') && (
              <MunicipalOfficerCommandCenter
                incidents={incidents}
                units={units}
                selectedIncident={selectedIncident}
                selectedUnit={selectedUnit}
                onSelectIncident={setSelectedIncident}
                onSelectUnit={setSelectedUnit}
                onUpdateIncidentStatus={handleUpdateIncidentStatus}
                onUpdateUnitStatus={handleUpdateUnitStatus}
                onAssignCrew={handleAssignCrew}
                onReRouteDepartment={handleReRouteDepartment}
                onAdjustPriority={handleAdjustPriority}
                onLogout={handleSignOut}
                onSwitchToCitizen={() => {
                  setIsOfficerCitizenMode(true);
                  navigateTo('/');
                }}
                currentUser={currentUser}
                onOpenStaffManagement={() => setShowStaffManagementModal(true)}
                onOpenProfile={() => navigateTo('/profile')}
                onOpenGeminiCopilot={() => setShowGeminiAssistant(true)}
                initialTab={commandCenterTab}
                onTabChange={(tab) => {
                  setCommandCenterTab(tab);
                  if (tab === 'COMMAND_DESK') navigateTo('/command-hq');
                  else if (tab === 'WARD_CONFIG') navigateTo('/governance');
                  else if (tab === 'PROFILE') navigateTo('/profile');
                }}
              />
            )}

            {/* VIEW B: FIELD CREW & FIELD CONTRACTOR WORK ORDERS */}
            {!isOfficerCitizenMode && (userRole === 'FIELD_CREW' || userRole === 'FIELD_CONTRACTOR') && (
              <FieldCrewWorkOrders
                incidents={incidents}
                currentUser={currentUser}
                onUpdateIncidentStatus={(id, st, proofUrl, notes) => handleUpdateIncidentStatus(id, st, proofUrl, notes)}
              />
            )}

            {/* VIEW C: SWACHHATA DOOT & VOLUNTEER HUB */}
            {!isOfficerCitizenMode && (userRole === 'VOLUNTEER' || userRole === 'SWACHHATA_DOOT') && (
              <div className="flex-1 overflow-y-auto">
                <VolunteerPortal
                  incidents={incidents}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* VIEW D: SWACHH SURVEKSHAN NATIONAL QUALITY AUDIT DESK */}
            {!isOfficerCitizenMode && userRole === 'SWACHH_SURVEKSHAN_AUDITOR' && (
              <div className="flex-1 overflow-y-auto">
                <SwachhSurvekshanAuditorDesk
                  incidents={incidents}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* VIEW E: CITIZEN SWACHHATA PORTAL */}
            {(userRole === 'CITIZEN' || isOfficerCitizenMode) && (
              <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {citizenTab === 'EVENTS' ? (
                  <div className="flex-1 overflow-y-auto">
                    <EventsView
                      onSelectCampaign={(campaign) => {
                        setSelectedDriveCampaign(campaign);
                        setShowDriveModal(true);
                      }}
                      onOpenCampaignModal={(campaign) => {
                        setSelectedDriveCampaign(campaign);
                        setShowDriveModal(true);
                      }}
                    />
                  </div>
                ) : (
                  <CitizenPortal
                    incidents={incidents}
                    onSubmitIncident={handleDispatchIncident}
                    isDispatching={isDispatching}
                    activeScreen={citizenTab === 'FORM' ? 'FORM' : citizenTab === 'CATEGORIES' ? 'CATEGORIES' : citizenTab === 'COMPLAINTS' ? 'COMPLAINTS' : citizenTab === 'FACILITIES' ? 'FACILITIES' : 'HOME'}
                    onNavigate={(scr) => {
                      if (scr === 'FORM' || scr === 'CATEGORIES') {
                        navigateTo('/file-grievance');
                      } else if (scr === 'COMPLAINTS') {
                        navigateTo('/track');
                      } else if (scr === 'FACILITIES') {
                        navigateTo('/facilities');
                      } else {
                        navigateTo('/');
                      }
                    }}
                    currentUser={currentUser}
                    onOpenAuth={() => setShowAuthModal(true)}
                    onUpdateUserProfile={(updated) => setCurrentUser(updated)}
                    showSurveyModal={showSurveyModal}
                    onOpenSurvey={() => navigateTo('/survey')}
                    onCloseSurvey={() => {
                      setShowSurveyModal(false);
                      navigateTo('/', true);
                    }}
                    initialCapturedFile={pendingCapturedFile}
                    onClearPendingFile={() => setPendingCapturedFile(null)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Hidden Native Camera Input triggered directly by mobile floating (+) button */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        id="mobile-nav-live-camera-input"
        ref={navCameraInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPendingCapturedFile(file);
            navigateTo('/file-grievance');
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* 3. SWACHHATA AUTHENTIC FIXED BOTTOM MOBILE BAR (Role-Tailored for Citizens & Staff) */}
      <nav className="block md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 flex justify-around items-center h-16 shadow-lg select-none px-2 text-slate-900">
        {(userRole === 'CITIZEN' || isOfficerCitizenMode) ? (
          <>
            {/* Tab 1: Home */}
            <button
              id="mobile-nav-home"
              onClick={() => {
                setCitizenTab('HOME');
                navigateTo('/');
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out ${
                  citizenTab === 'HOME' && !showSurveyModal
                    ? 'bg-slate-900/10 backdrop-blur-md border border-slate-900/15 shadow-xs text-slate-900 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-[11px] leading-tight">{t('home')}</span>
              </div>
            </button>

            {/* Tab 2: Drives */}
            <button
              id="mobile-nav-drives"
              onClick={() => {
                setCitizenTab('EVENTS');
                navigateTo('/events');
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out ${
                  citizenTab === 'EVENTS'
                    ? 'bg-slate-900/10 backdrop-blur-md border border-slate-900/15 shadow-xs text-slate-900 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[11px] leading-tight">Drives</span>
              </div>
            </button>

            {/* Center Elevated Floating (+) Button -> Post */}
            <div className="flex-1 flex justify-center -mt-6">
              <button
                id="mobile-nav-post-complaint"
                onClick={() => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                  } else {
                    // Instantly trigger native camera capture!
                    if (navCameraInputRef.current) {
                      navCameraInputRef.current.click();
                    } else {
                      navigateTo('/file-grievance');
                    }
                  }
                }}
                title="Capture Hazard with Live Camera"
                className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center shadow-md border-4 border-slate-50 transition-all cursor-pointer group"
              >
                <Plus className="w-6 h-6 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Tab 4: Facilities */}
            <button
              id="mobile-nav-facilities"
              onClick={() => {
                setCitizenTab('FACILITIES');
                navigateTo('/facilities');
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out ${
                  citizenTab === 'FACILITIES'
                    ? 'bg-slate-900/10 backdrop-blur-md border border-slate-900/15 shadow-xs text-slate-900 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span className="text-[11px] leading-tight">{t('facilities')}</span>
              </div>
            </button>

            {/* Tab 5: Profile */}
            <button
              id="mobile-nav-profile"
              onClick={() => {
                setCitizenTab('PROFILE');
                navigateTo('/profile');
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out ${
                  citizenTab === 'PROFILE'
                    ? 'bg-slate-900/10 backdrop-blur-md border border-slate-900/15 shadow-xs text-slate-900 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-[11px] leading-tight">{t('profile')}</span>
              </div>
            </button>
          </>
        ) : (userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') ? (
          <>
            {/* Officer Tab 1: GIS Tactical Desk */}
            <button
              id="mobile-officer-nav-desk"
              onClick={() => navigateTo('/command-hq')}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out ${
                  citizenTab !== 'PROFILE' && !isOfficerCitizenMode
                    ? 'bg-slate-900/10 backdrop-blur-md border border-slate-900/15 shadow-xs text-[#115e59] font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-[11px] leading-tight">GIS Desk</span>
              </div>
            </button>

            {/* Officer Tab 2: Manage Staff */}
            <button
              id="mobile-officer-nav-staff"
              onClick={() => setShowStaffManagementModal(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102">
                <Users className="w-5 h-5" />
                <span className="text-[11px] leading-tight">Staff</span>
              </div>
            </button>

            {/* Officer Tab 3: Gemini Support Assistant */}
            <button
              id="mobile-officer-nav-copilot"
              onClick={() => setShowGeminiAssistant(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out text-slate-700 hover:text-slate-900 font-medium scale-100 hover:scale-102">
                <Headset className="w-5 h-5 text-teal-600" />
                <span className="text-[11px] leading-tight">AI Help</span>
              </div>
            </button>

            {/* Officer Tab 4: Profile */}
            <button
              id="mobile-officer-nav-profile"
              onClick={() => navigateTo('/profile')}
              className="flex flex-col items-center justify-center flex-1 py-1 text-xs cursor-pointer group"
            >
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ease-out ${
                  citizenTab === 'PROFILE'
                    ? 'bg-slate-900/10 backdrop-blur-md border border-slate-900/15 shadow-xs text-slate-900 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-700 font-medium scale-100 hover:scale-102'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-[11px] leading-tight">{t('profile')}</span>
              </div>
            </button>
          </>
        ) : (userRole === 'FIELD_CREW' || userRole === 'FIELD_CONTRACTOR') ? (
          <>
            {/* Crew Tab 1: Work Orders */}
            <button
              id="mobile-crew-nav-orders"
              onClick={() => navigateTo('/')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab !== 'PROFILE' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Truck className="w-5 h-5" />
              <span>Work Orders</span>
            </button>

            {/* Crew Tab 2: AI Dispatch Assistant */}
            <button
              id="mobile-crew-nav-copilot"
              onClick={() => setShowGeminiAssistant(true)}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer text-slate-500 hover:text-slate-700 font-medium"
            >
              <Headset className="w-5 h-5 text-teal-600" />
              <span>AI Help</span>
            </button>

            {/* Crew Tab 3: Profile */}
            <button
              id="mobile-crew-nav-profile"
              onClick={() => navigateTo('/profile')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </>
        ) : (userRole === 'VOLUNTEER' || userRole === 'SWACHHATA_DOOT') ? (
          <>
            {/* Volunteer Tab 1: Hub */}
            <button
              id="mobile-volunteer-nav-hub"
              onClick={() => navigateTo('/')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab !== 'PROFILE' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Award className="w-5 h-5" />
              <span>Volunteer Hub</span>
            </button>

            {/* Volunteer Tab 2: Cleanliness Drives */}
            <button
              id="mobile-volunteer-nav-drives"
              onClick={() => {
                setSelectedDriveCampaign(SAMPLE_CAMPAIGNS[0]);
                setShowDriveModal(true);
              }}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer text-slate-500 hover:text-slate-700 font-medium"
            >
              <Calendar className="w-5 h-5" />
              <span>Drives</span>
            </button>

            {/* Volunteer Tab 3: Profile */}
            <button
              id="mobile-volunteer-nav-profile"
              onClick={() => navigateTo('/profile')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </>
        ) : (
          <>
            {/* Auditor / Other Role Tab 1: Desk */}
            <button
              id="mobile-auditor-nav-desk"
              onClick={() => navigateTo('/')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab !== 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>Audit Desk</span>
            </button>

            {/* Auditor Tab 2: Profile */}
            <button
              id="mobile-auditor-nav-profile"
              onClick={() => navigateTo('/profile')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </>
        )}
      </nav>

      {/* 4. MODALS */}
      {/* Staff Management Modal */}
      {showStaffManagementModal && (
        <WardStaffManagementModal
          isOpen={showStaffManagementModal}
          onClose={() => setShowStaffManagementModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(profile) => {
            setCurrentUser(profile);
            setShowAuthModal(false);
          }}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Interactive Gemini AI Copilot Assistant Drawer */}
      <GeminiAssistantDrawer
        isOpen={showGeminiAssistant}
        onClose={() => setShowGeminiAssistant(false)}
        userRole={userRole}
        currentUser={currentUser}
        userWard={currentUser?.assignedWard || 'Ward 4 - Central Zone'}
        incidents={incidents}
        availableUnits={units}
        onApplyDraft={(draft) => {
          if (userRole === 'CITIZEN') {
            setCitizenTab('FORM');
          }
        }}
        onInspectTicket={(ticketId) => {
          setShowGeminiAssistant(false);
          if (userRole === 'CITIZEN') {
            setCitizenTab('TRACK');
          }
        }}
      />

      {/* Swachhata Cleanliness Drive Campaign Modal */}
      <SwachhataDriveModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        campaign={selectedDriveCampaign}
      />
    </div>
  );
}
