/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Activity
} from 'lucide-react';

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

  // Cleanliness Drive Campaign State
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [selectedDriveCampaign, setSelectedDriveCampaign] = useState<CleanlinessCampaign>(SAMPLE_CAMPAIGNS[0]);

  // Synchronize Interface Theme from Local Storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('swachhata_user_preferences');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (e) {
      console.warn('Theme init notice:', e);
    }
  }, []);

  // Citizen Mobile Tab Navigation: 'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE' | 'FACILITIES'
  const [citizenTab, setCitizenTab] = useState<'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE' | 'FACILITIES'>('HOME');

  const [selectedIncident, setSelectedIncident] = useState<CrisisIncident | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<MunicipalUnit | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

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
      setThoughtLogs([]);
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
      citizenUid: currentUser?.uid || ''
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
        setThoughtLogs(prev => [...prev, ...result.thoughtLogs]);
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
    resolutionNotes?: string
  ) => {
    try {
      await updateComplaintInFirestore(incidentId, {
        status: newStatus,
        resolutionProofUrl,
        resolutionNotes,
        resolvedAt: newStatus === 'RESOLVED' ? Date.now() : undefined
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
          resolvedAt: newStatus === 'RESOLVED' ? Date.now() : inc.resolvedAt
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
        resolvedAt: newStatus === 'RESOLVED' ? Date.now() : prev.resolvedAt
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

  // If user is not logged in, render the official Swachhata Auth screen
  if (!currentUser) {
    return (
      <SwachhataAuthScreen
        onSuccess={(profile) => {
          setCurrentUser(profile);
        }}
      />
    );
  }

    const isOfficerCommandView = (userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') && citizenTab !== 'PROFILE';

    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
        {/* 1. TOP HEADER (Rendered for Citizen, Crew, Volunteers and Profile views) */}
        {!isOfficerCommandView && (
          <header className="h-14 bg-white text-slate-900 px-3 sm:px-5 flex items-center justify-between border-b border-slate-200/80 shadow-xs relative z-40">
            {/* Left: CivicPulse Logo & Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src="/logo.png" 
                alt="CivicPulse Logo" 
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-lg flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold tracking-tight text-slate-900 text-base sm:text-lg">CivicPulse</span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-1.5 py-0.5 rounded font-semibold hidden sm:inline">
                    Live Matrix
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate hidden md:block font-normal">
                  Civic Grievance Redressal & Field Dispatch Matrix
                </p>
              </div>
            </div>

            {/* Center: Live Municipal Sync Status Badge (Desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200 text-[11px] px-2.5 py-1 rounded-full font-medium shadow-xs">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" strokeWidth={1.75} />
                <span>Civic Network Online</span>
              </div>
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
              ) : (
                /* User Profile Menu Trigger */
                <div className="relative">
                  <button
                    id="header-profile-btn"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    title="User Profile & Settings"
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-xs overflow-hidden"
                  >
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserCircle className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
                    )}
                  </button>

                  {/* Profile Dropdown Drawer */}
                  {showProfileMenu && currentUser && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2">
                      <div className="pb-3 border-b border-slate-100 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 font-bold overflow-hidden">
                          {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
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
                            setCitizenTab('PROFILE');
                            setShowProfileMenu(false);
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
                          <span>Gemini AI Copilot</span>
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
              onSwitchToTacticalDesk={() => setCitizenTab('HOME')}
              onOpenStaffManagement={() => setShowStaffManagementModal(true)}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onOpenSettingsModal={() => setShowSettingsModal(true)}
              onOpenGeminiCopilot={() => setShowGeminiAssistant(true)}
            />
          </div>
        ) : (
          <>
            {/* VIEW A: WARD OFFICER & SUPER ADMIN COMMAND DESK */}
            {(userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') && (
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
                currentUser={currentUser}
                onOpenStaffManagement={() => setShowStaffManagementModal(true)}
                onOpenProfile={() => setCitizenTab('PROFILE')}
              />
            )}

            {/* VIEW B: FIELD CREW & FIELD CONTRACTOR WORK ORDERS */}
            {(userRole === 'FIELD_CREW' || userRole === 'FIELD_CONTRACTOR') && (
              <FieldCrewWorkOrders
                incidents={incidents}
                currentUser={currentUser}
                onUpdateIncidentStatus={(id, st, proofUrl, notes) => handleUpdateIncidentStatus(id, st, proofUrl, notes)}
              />
            )}

            {/* VIEW C: SWACHHATA DOOT & VOLUNTEER HUB */}
            {(userRole === 'VOLUNTEER' || userRole === 'SWACHHATA_DOOT') && (
              <div className="flex-1 overflow-y-auto">
                <VolunteerPortal
                  incidents={incidents}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* VIEW D: SWACHH SURVEKSHAN NATIONAL QUALITY AUDIT DESK */}
            {userRole === 'SWACHH_SURVEKSHAN_AUDITOR' && (
              <div className="flex-1 overflow-y-auto">
                <SwachhSurvekshanAuditorDesk
                  incidents={incidents}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* VIEW E: CITIZEN SWACHHATA PORTAL */}
            {userRole === 'CITIZEN' && (
              <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {citizenTab === 'EVENTS' ? (
                  <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto space-y-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#115e59]">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">Ward 4 Cleanliness Drives & SBM Events</h3>
                          <p className="text-xs text-slate-500">Community participation initiatives in Central Zone</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <div 
                          onClick={() => {
                            setSelectedDriveCampaign(SAMPLE_CAMPAIGNS[0]);
                            setShowDriveModal(true);
                          }}
                          className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-50 flex items-center justify-between transition cursor-pointer group"
                        >
                          <div>
                            <p className="font-bold text-xs text-teal-900 group-hover:text-[#115e59]">Sunday Mega Plastic-Free Market Drive</p>
                            <p className="text-[11px] text-teal-700">Verad Gate Market • Sunday 07:00 AM • 48 Registered</p>
                          </div>
                          <span className="text-xs font-bold text-white bg-[#115e59] group-hover:bg-[#0f4f4b] px-2.5 py-1 rounded-lg transition shadow-xs">Join Drive</span>
                        </div>

                        <div 
                          onClick={() => {
                            setSelectedDriveCampaign(SAMPLE_CAMPAIGNS[1]);
                            setShowDriveModal(true);
                          }}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer group"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-800 group-hover:text-slate-900">Ward 4 Stormwater Drain Awareness Campaign</p>
                            <p className="text-[11px] text-slate-500">Community Hall, Sector 3 • Friday 05:00 PM • 32 Registered</p>
                          </div>
                          <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">View Campaign</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CitizenPortal
                    incidents={incidents}
                    onSubmitIncident={handleDispatchIncident}
                    isDispatching={isDispatching}
                    activeScreen={citizenTab === 'FORM' ? 'FORM' : citizenTab === 'CATEGORIES' ? 'CATEGORIES' : citizenTab === 'COMPLAINTS' ? 'COMPLAINTS' : citizenTab === 'FACILITIES' ? 'FACILITIES' : 'HOME'}
                    onNavigate={(scr) => setCitizenTab(scr)}
                    currentUser={currentUser}
                    onOpenAuth={() => setShowAuthModal(true)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. SWACHHATA AUTHENTIC FIXED BOTTOM MOBILE BAR (Role-Tailored for Citizens & Staff) */}
      <nav className="block md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 flex justify-around items-center h-16 shadow-lg select-none px-2">
        {userRole === 'CITIZEN' ? (
          <>
            {/* Tab 1: Home */}
            <button
              id="mobile-nav-home"
              onClick={() => setCitizenTab('HOME')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'HOME' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            {/* Tab 2: Events / Activity */}
            <button
              id="mobile-nav-events"
              onClick={() => setCitizenTab('EVENTS')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'EVENTS' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Events</span>
            </button>

            {/* Center Elevated Floating (+) Button */}
            <div className="flex-1 flex justify-center -mt-6">
              <button
                id="mobile-nav-post-complaint"
                onClick={() => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                  } else {
                    setCitizenTab('CATEGORIES');
                  }
                }}
                title="Post a Complaint"
                className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center shadow-md border-4 border-slate-50 transition-all cursor-pointer"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            {/* Tab 3: Complaints */}
            <button
              id="mobile-nav-complaints"
              onClick={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                } else {
                  setCitizenTab('COMPLAINTS');
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'COMPLAINTS' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Complaints</span>
            </button>

            {/* Tab 4: Profile */}
            <button
              id="mobile-nav-profile"
              onClick={() => setCitizenTab('PROFILE')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </>
        ) : (userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN') ? (
          <>
            {/* Officer Tab 1: GIS Tactical Desk */}
            <button
              id="mobile-officer-nav-desk"
              onClick={() => setCitizenTab('HOME')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab !== 'PROFILE' ? 'text-[#115e59] font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>GIS Desk</span>
            </button>

            {/* Officer Tab 2: Manage Staff */}
            <button
              id="mobile-officer-nav-staff"
              onClick={() => setShowStaffManagementModal(true)}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer text-slate-500 hover:text-slate-700 font-medium"
            >
              <Users className="w-5 h-5" />
              <span>Staff</span>
            </button>

            {/* Officer Tab 3: Gemini Copilot */}
            <button
              id="mobile-officer-nav-copilot"
              onClick={() => setShowGeminiAssistant(true)}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
            >
              <Sparkles className="w-5 h-5" />
              <span>AI Copilot</span>
            </button>

            {/* Officer Tab 4: Profile */}
            <button
              id="mobile-officer-nav-profile"
              onClick={() => setCitizenTab('PROFILE')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-xs transition-colors cursor-pointer ${
                citizenTab === 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </>
        ) : (userRole === 'FIELD_CREW' || userRole === 'FIELD_CONTRACTOR') ? (
          <>
            {/* Crew Tab 1: Work Orders */}
            <button
              id="mobile-crew-nav-orders"
              onClick={() => setCitizenTab('HOME')}
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
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Copilot</span>
            </button>

            {/* Crew Tab 3: Profile */}
            <button
              id="mobile-crew-nav-profile"
              onClick={() => setCitizenTab('PROFILE')}
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
              onClick={() => setCitizenTab('HOME')}
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
              onClick={() => setCitizenTab('PROFILE')}
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
              onClick={() => setCitizenTab('HOME')}
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
              onClick={() => setCitizenTab('PROFILE')}
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
        userWard={currentUser?.assignedWard || 'Ward 4 - Central Zone'}
        incidents={incidents}
        availableUnits={units}
        onApplyDraft={(draft) => {
          if (userRole === 'CITIZEN') {
            setCitizenTab('FORM');
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
