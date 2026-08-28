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
import { DemoRoleSwitcher, DEMO_PRESETS } from './components/DemoRoleSwitcher';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { SwachhataAuthScreen } from './components/SwachhataAuthScreen';
import { SwachhataDriveModal, SAMPLE_CAMPAIGNS, CleanlinessCampaign } from './components/SwachhataDriveModal';
import { executeAutonomousDispatch } from './services/geminiService';
import { 
  subscribeToScopedComplaints,
  subscribeToUnits,
  createComplaintInFirestore, 
  updateComplaintInFirestore,
  updateUnitInFirestore,
  onAuthChange,
  logoutUser,
  syncUserProfile
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
  Crown 
} from 'lucide-react';

export default function App() {
  // Authentication & Current User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const preset = DEMO_PRESETS[0];
    return {
      uid: preset.uid,
      name: preset.name,
      phone: preset.phone,
      email: preset.email,
      role: preset.role,
      assignedWard: preset.ward,
      designation: preset.designation
    };
  });

  // Application Data State (Subscribed 100% to Firestore)
  const [incidents, setIncidents] = useState<CrisisIncident[]>(INITIAL_INCIDENTS);
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

  // Citizen Mobile Tab Navigation: 'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE'
  const [citizenTab, setCitizenTab] = useState<'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE'>('HOME');

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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await syncUserProfile(firebaseUser);
          setCurrentUser(profile);
        } catch (e) {
          console.warn('Error fetching auth user profile:', e);
        }
      }
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
      (firestoreIncidents) => {
        if (firestoreIncidents && firestoreIncidents.length > 0) {
          setIncidents(firestoreIncidents);
          setIsFirestoreConnected(true);
        }
      },
      (error) => {
        console.warn('Firestore complaints subscription warning:', error);
        setIsFirestoreConnected(false);
      }
    );

    return () => {
      if (unsubscribeComplaints) unsubscribeComplaints();
    };
  }, [userRole, currentUser?.assignedWard, currentUser?.uid]);

  // Subscribe to real-time units from Firestore
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
      // Complete state & session cache flush
      setCurrentUser(null);
      setSelectedIncident(null);
      setSelectedUnit(null);
      setShowSettingsModal(false);
      setShowGeminiAssistant(false);
      setThoughtLogs([]);
    }
  };

  const handleRolePresetSwitch = (profile: UserProfile) => {
    setCurrentUser(profile);
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
      reporterName: incidentData.reporterName || currentUser?.name || 'Sangit',
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

  // Status transitions from officer desk with Firestore Sync
  const handleUpdateIncidentStatus = async (
    incidentId: string, 
    newStatus: CrisisIncident['status'], 
    proofUrl?: string, 
    notes?: string
  ) => {
    // 1. Sync to Firestore
    try {
      await updateComplaintInFirestore(incidentId, {
        status: newStatus,
        proofOfFixUrl: proofUrl,
        officerNotes: notes
      });
    } catch (err) {
      console.warn('Firestore update complaint err:', err);
    }

    // 2. Local State Sync
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated: CrisisIncident = {
          ...inc,
          status: newStatus,
          proofOfFixUrl: proofUrl || inc.proofOfFixUrl,
          officerNotes: notes || inc.officerNotes,
          resolvedAt: newStatus === 'RESOLVED' ? Date.now() : inc.resolvedAt
        };
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(updated);
        }
        return updated;
      }
      return inc;
    }));

    // If resolved, free up the assigned unit
    if (newStatus === 'RESOLVED') {
      const target = incidents.find(i => i.id === incidentId);
      if (target?.assignedUnitId) {
        await updateUnitInFirestore(target.assignedUnitId, {
          status: 'AVAILABLE',
          assignedIncidentId: undefined
        });

        setUnits(prev => prev.map(u => {
          if (u.id === target.assignedUnitId) {
            return {
              ...u,
              status: 'AVAILABLE',
              assignedIncidentId: undefined
            };
          }
          return u;
        }));
      }
    }
  };

  const handleUpdateUnitStatus = (unitId: string, newStatus: UnitStatus) => {
    updateUnitInFirestore(unitId, { status: newStatus }).catch(console.warn);
    setUnits(prev => prev.map(u => (u.id === unitId ? { ...u, status: newStatus } : u)));
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

  const handleSimulateScenario = (index: number) => {
    const scenario = CRISIS_SCENARIOS[index] || CRISIS_SCENARIOS[0];
    handleDispatchIncident({
      title: scenario.title,
      description: scenario.description,
      category: scenario.category,
      priority: scenario.priority,
      department: scenario.department,
      riskScore: scenario.priority === 'P1_CRITICAL' ? 95 : 78,
      location: {
        lat: scenario.lat,
        lng: scenario.lng,
        zone: scenario.zone,
        address: scenario.address
      },
      imageUrl: scenario.imageUrl,
      reporterName: 'MoHUA Ward Sensor'
    });
  };

  // If user is completely logged out, display full Swachhata Auth screen
  if (!currentUser) {
    return <SwachhataAuthScreen onSuccess={(profile) => setCurrentUser(profile)} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans select-none">
      {/* 1. SWACHHATA OFFICIAL DEEP FOREST TEAL TOP HEADER */}
      <header className="w-full bg-[#115e59] text-white px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 shadow-sm border-b border-teal-800/40 z-30 flex-shrink-0">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
            <span className="text-sm">🇮🇳</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-bold tracking-tight text-base sm:text-lg">Swachhata</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold hidden sm:inline">
                MoHUA
              </span>
            </div>
            <p className="text-[10px] text-teal-100/90 truncate hidden md:block font-normal">
              Ministry of Housing and Urban Affairs • Ward-Scoped Redressal
            </p>
          </div>
        </div>

        {/* Center: Live Municipal Sync Status Badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] px-2.5 py-1 rounded-full font-medium">
            <Radio className="w-3 h-3 text-emerald-300 animate-pulse" strokeWidth={1.75} />
            <span>Municipal Grid Online</span>
          </div>
        </div>

        {/* Right: Clean Role Pill & Profile Icon */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Clean Role Pill */}
          <DemoRoleSwitcher
            currentRole={userRole}
            currentUser={currentUser}
            onSwitchRole={handleRolePresetSwitch}
          />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="User Profile & Settings"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              <UserCircle className="w-5 h-5 text-white" strokeWidth={1.75} />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2">
                <div className="pb-3 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#115e59] shrink-0 font-bold">
                    <User className="w-5 h-5 text-[#115e59]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</h4>
                    <p className="text-[11px] text-[#115e59] font-medium truncate">{currentUser.designation}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>

                <div className="py-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowGeminiAssistant(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-[#115e59] rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Gemini AI Copilot</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSettingsModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Settings & Cloud Status</span>
                  </button>

                  {userRole === 'SUPER_ADMIN' && (
                    <button
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
        </div>
      </header>

      {/* Dynamic Network / Sync Indicator Bar (Active during Firestore read/write & dispatch) */}
      <div className="h-0.5 w-full bg-teal-900/50 relative overflow-hidden flex-shrink-0">
        <div 
          className={`h-full transition-all duration-300 ${
            isDispatching 
              ? 'w-full bg-amber-400 animate-pulse' 
              : isFirestoreConnected 
              ? 'w-full bg-emerald-400/80' 
              : 'w-full bg-rose-500 animate-pulse'
          }`} 
        />
      </div>

      {/* 2. MAIN APPLICATION CONTENT ROUTING (ROLE-BASED) */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
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
            onLogout={() => {
              const citizenPreset = DEMO_PRESETS[0];
              setCurrentUser(citizenPreset);
            }}
            currentUser={currentUser}
            onOpenStaffManagement={() => setShowStaffManagementModal(true)}
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
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#2d7a70]">
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
                        <p className="font-bold text-xs text-teal-900 group-hover:text-[#2d7a70]">Sunday Mega Plastic-Free Market Drive</p>
                        <p className="text-[11px] text-teal-700">Verad Gate Market • Sunday 07:00 AM • 48 Registered</p>
                      </div>
                      <span className="text-xs font-bold text-white bg-[#2d7a70] group-hover:bg-[#23635b] px-2.5 py-1 rounded-lg transition shadow-xs">Join Drive</span>
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
            ) : citizenTab === 'PROFILE' ? (
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center">
                <div className="w-full max-w-2xl bg-white rounded-2xl p-5 md:p-8 border border-slate-200 shadow-sm space-y-6">
                  {currentUser ? (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-teal-50 border-2 border-[#2d7a70]/40 flex items-center justify-center text-2xl font-bold text-[#2d7a70] shrink-0 shadow-xs">
                          {currentUser.photoURL ? (
                            <img
                              src={currentUser.photoURL}
                              alt={currentUser.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span>{currentUser.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 truncate">{currentUser.name}</h3>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {currentUser.phone || currentUser.email || 'peelaavinash04@gmail.com'}
                          </p>
                          <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                            <span className="text-[11px] font-bold text-[#2d7a70] bg-teal-50 px-3 py-0.5 rounded-full border border-teal-200">
                              Role: {currentUser.role.replace(/_/g, ' ')}
                            </span>
                            {currentUser.assignedWard && (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200">
                                {currentUser.assignedWard}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-slate-200"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Sanitized Citizen / Officer Metadata Grid */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Citizen Verification & Deployment Info
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 font-medium block text-[11px]">Assigned Ward</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          {currentUser?.assignedWard || 'Ward 4 - Central Zone'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 font-medium block text-[11px]">Account Created</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Jan 2025'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 font-medium block text-[11px]">Primary Contact</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                          {currentUser?.phone || '+91 98765 43210'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 font-medium block text-[11px]">System Status</span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">Redressal Online</span>
                        </div>
                        <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200 text-xs inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Online ✓
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full min-h-[48px] bg-[#2d7a70] hover:bg-[#23635b] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Switch to Municipal Staff / Ward Officer Login</span>
                    </button>

                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                    >
                      <Settings className="w-4 h-4 text-slate-600" />
                      <span>Preferences & Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <CitizenPortal
                incidents={incidents}
                onSubmitIncident={handleDispatchIncident}
                isDispatching={isDispatching}
                activeScreen={citizenTab === 'FORM' ? 'FORM' : citizenTab === 'CATEGORIES' ? 'CATEGORIES' : citizenTab === 'COMPLAINTS' ? 'COMPLAINTS' : 'HOME'}
                onNavigate={(scr) => setCitizenTab(scr)}
                currentUser={currentUser}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* 3. SWACHHATA AUTHENTIC FIXED BOTTOM MOBILE BAR (Visible in Citizen Mode on mobile screens) */}
      {userRole === 'CITIZEN' && (
        <nav className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex justify-around items-center h-16 shadow-lg select-none px-2">
          {/* Tab 1: Home */}
          <button
            onClick={() => setCitizenTab('HOME')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] transition-colors cursor-pointer ${
              citizenTab === 'HOME' ? 'text-[#2d7a70] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          {/* Tab 2: Events / Activity */}
          <button
            onClick={() => setCitizenTab('EVENTS')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] transition-colors cursor-pointer ${
              citizenTab === 'EVENTS' ? 'text-[#2d7a70] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Events</span>
          </button>

          {/* Center Elevated Floating (+) Button */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={() => setCitizenTab('CATEGORIES')}
              title="Post a Complaint"
              className="w-13 h-13 rounded-full bg-[#2d7a70] hover:bg-[#23635b] active:scale-95 text-white flex items-center justify-center shadow-lg border-4 border-slate-100 transition-all cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Tab 3: Complaints */}
          <button
            onClick={() => setCitizenTab('COMPLAINTS')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] transition-colors cursor-pointer ${
              citizenTab === 'COMPLAINTS' ? 'text-[#2d7a70] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Complaints</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => setCitizenTab('PROFILE')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] transition-colors cursor-pointer ${
              citizenTab === 'PROFILE' ? 'text-[#2d7a70] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
        </nav>
      )}

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
