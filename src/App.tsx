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
  PriorityLevel
} from './types';
import { CitizenPortal } from './components/CitizenPortal';
import { MunicipalOfficerCommandCenter } from './components/MunicipalOfficerCommandCenter';
import { SettingsModal } from './components/SettingsModal';
import { executeAutonomousDispatch } from './services/geminiService';
import { 
  subscribeToComplaints, 
  createComplaintInFirestore, 
  updateComplaintInFirestore 
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
  Shield,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Radio,
  Settings
} from 'lucide-react';

export default function App() {
  // Application State
  const [incidents, setIncidents] = useState<CrisisIncident[]>(INITIAL_INCIDENTS);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const [units, setUnits] = useState<MunicipalUnit[]>(() => {
    const saved = localStorage.getItem('syncdispatch_units');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_MUNICIPAL_UNITS;
  });

  // RBAC State: 'CITIZEN' (default) vs 'OFFICER'
  const [userRole, setUserRole] = useState<UserRole>('CITIZEN');
  const [showOfficerLoginModal, setShowOfficerLoginModal] = useState<boolean>(false);
  const [officerPin, setOfficerPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Citizen Navigation State: 'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE'
  const [citizenTab, setCitizenTab] = useState<'HOME' | 'EVENTS' | 'CATEGORIES' | 'FORM' | 'COMPLAINTS' | 'PROFILE'>('HOME');

  const [selectedIncident, setSelectedIncident] = useState<CrisisIncident | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<MunicipalUnit | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState<boolean>(false);

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

  // Connect to Firestore real-time complaints stream
  useEffect(() => {
    const unsubscribe = subscribeToComplaints(
      (firestoreIncidents) => {
        if (firestoreIncidents && firestoreIncidents.length > 0) {
          setIncidents(firestoreIncidents);
          setIsFirestoreConnected(true);
        }
      },
      (error) => {
        console.warn('Firestore connection fallback:', error);
        setIsFirestoreConnected(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Persist units state locally
  useEffect(() => {
    localStorage.setItem('syncdispatch_units', JSON.stringify(units));
  }, [units]);

  // Core Autonomous Dispatch Trigger & Firestore Write
  const handleDispatchIncident = async (incidentData: Partial<CrisisIncident>) => {
    setIsDispatching(true);

    const newTicketId = incidentData.id || `W0488610C${Math.floor(Math.random() * 899999 + 100000)}`;
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
      reporterName: incidentData.reporterName || 'Sangit'
    };

    // 1. Optimistic Local Update
    setIncidents(prev => [fullIncident, ...prev]);
    setSelectedIncident(fullIncident);

    // 2. Persist to Firestore
    try {
      await createComplaintInFirestore(fullIncident);
    } catch (err) {
      console.warn('Firestore create complaint err:', err);
    }

    // 3. Autonomous Crew Dispatch Calculation
    try {
      const result = await executeAutonomousDispatch(fullIncident, units);

      if (result.thoughtLogs && result.thoughtLogs.length > 0) {
        setThoughtLogs(prev => [...prev, ...result.thoughtLogs]);
      }

      if (result.dispatchedUnit) {
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
        await updateComplaintInFirestore(newTicketId, updates);

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
      console.error('Redressal dispatch error:', error);
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

  const handleResetData = () => {
    setIncidents(INITIAL_INCIDENTS);
    setUnits(INITIAL_MUNICIPAL_UNITS);
    setSelectedIncident(null);
    setSelectedUnit(null);
  };

  const handleOfficerLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (officerPin === '1234' || officerPin === '') {
      setUserRole('OFFICER');
      setShowOfficerLoginModal(false);
      setOfficerPin('');
      setPinError('');
    } else {
      setPinError('Invalid PIN. Use default 1234 or tap Quick Login.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden font-sans select-none">
      {/* 1. SWACHHATA RICH TEAL TOP HEADER */}
      <header className="w-full bg-[#2d7a70] text-white px-4 md:px-6 py-3 flex items-center justify-between gap-2 shadow-md z-30 flex-shrink-0">
        {/* Left: Brand Identity */}
        <div className="text-base font-bold tracking-tight flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
            <span className="text-sm">🇮🇳</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-extrabold text-sm sm:text-base">Swachhata</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold hidden sm:inline">
                MoHUA
              </span>
            </div>
            <p className="text-[10px] text-teal-100 truncate hidden md:block">
              Ministry of Housing and Urban Affairs • Ward 4 Civic Redressal
            </p>
          </div>
        </div>

        {/* Center: Live Firestore Status Badge & Role Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full border border-white/20 text-xs">
            <span className={`w-2 h-2 rounded-full ${userRole === 'OFFICER' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
            <span className="font-semibold text-white">
              {userRole === 'OFFICER' ? 'Officer Desk (Ward 4)' : 'Citizen Mode'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] px-2.5 py-1 rounded-full font-medium">
            <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
            <span>omnisync-pothole Firestore</span>
          </div>
        </div>

        {/* Right: Quick Actions & Role Switcher */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick Scenario Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowScenarioMenu(!showScenarioMenu)}
              disabled={isDispatching}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs font-medium cursor-pointer shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Simulate Issue</span>
              <ChevronDown className={`w-3.5 h-3.5 text-teal-100 transition-transform ${showScenarioMenu ? 'rotate-180' : ''}`} />
            </button>

            {showScenarioMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-slate-900">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 border-b border-slate-100">
                  Simulate Grievance Scenario:
                </div>
                {CRISIS_SCENARIOS.map((sc, idx) => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setShowScenarioMenu(false);
                      handleSimulateScenario(idx);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-bold text-slate-900 truncate">{sc.title}</span>
                    <span className="text-[10px] text-slate-500 truncate">{sc.zone} • {sc.category.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Toggle Trigger */}
          {userRole === 'CITIZEN' ? (
            <button
              onClick={() => setShowOfficerLoginModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white text-[#2d7a70] hover:bg-teal-50 text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Staff Login</span>
            </button>
          ) : (
            <button
              onClick={() => setUserRole('CITIZEN')}
              className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30 shadow-xs flex items-center gap-1 cursor-pointer transition"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Citizen View</span>
            </button>
          )}

          {/* Settings / API Key modal button */}
          <button
            id="settings-toggle-btn"
            onClick={() => setShowSettingsModal(true)}
            title="Configure Gemini & Firebase API Keys"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer shadow-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Reset */}
          <button
            onClick={handleResetData}
            title="Reset default data"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEW CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {userRole === 'CITIZEN' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {citizenTab === 'EVENTS' ? (
              <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <h2 className="text-base font-bold text-[#2d7a70] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Ward 4 Civic Cleanliness Events & Drives</span>
                  </h2>
                  <p className="text-xs text-slate-600">
                    Community engagement and Swachhata Shramdaan activities in Central Ward 4:
                  </p>
                  <div className="space-y-2.5 pt-2">
                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                      <p className="text-xs font-bold text-slate-900">Ward 4 Zero-Pothole Verification Drive</p>
                      <p className="text-[11px] text-slate-600">This Saturday • Main Commercial Spine • Lead by Asst. Eng. Miller</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-xs font-bold text-slate-900">SBM Community Plastic Segregation Awareness</p>
                      <p className="text-[11px] text-slate-600">Sector 4 Community Hall • 10:00 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : citizenTab === 'PROFILE' ? (
              <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-[#2d7a70]/40">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                        alt="Profile"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Sangit</h3>
                      <p className="text-xs text-slate-500">+91 98765 43210</p>
                      <span className="text-[10px] font-bold text-[#2d7a70] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 mt-1 inline-block">
                        Registered Citizen • Ward 4
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                    <p><strong>Jurisdiction:</strong> Ward 4 - Central Zone</p>
                    <p><strong>Complaints In Grid:</strong> {incidents.length} Registered</p>
                    <p><strong>Database:</strong> Google Cloud Firestore (Live Sync)</p>
                    <p><strong>App Version:</strong> Swachhata-MoHUA v4.8.2</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => setShowOfficerLoginModal(true)}
                      className="w-full h-11 bg-[#2d7a70] hover:bg-[#23635b] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Switch to Municipal Staff / Ward Officer Login</span>
                    </button>

                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-600" />
                      <span>Configure API Keys & Firebase Connection</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <CitizenPortal
                incidents={incidents}
                onSubmitIncident={handleDispatchIncident}
                isDispatching={isDispatching}
                onOpenOfficerLogin={() => setShowOfficerLoginModal(true)}
                activeScreen={citizenTab === 'FORM' ? 'FORM' : citizenTab === 'CATEGORIES' ? 'CATEGORIES' : citizenTab === 'COMPLAINTS' ? 'COMPLAINTS' : 'HOME'}
                onNavigate={(scr) => setCitizenTab(scr)}
              />
            )}
          </div>
        ) : (
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
            onLogout={() => setUserRole('CITIZEN')}
          />
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

      {/* 4. OFFICER / WARD ENGINEER PIN LOGIN MODAL */}
      {showOfficerLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#2d7a70] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-300" />
                <h3 className="text-sm font-bold">Municipal Officer Authentication</h3>
              </div>
              <button
                onClick={() => {
                  setShowOfficerLoginModal(false);
                  setPinError('');
                }}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOfficerLogin} className="p-5 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-[#2d7a70] flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Ward 4 Officer Portal</h4>
                <p className="text-xs text-slate-500">
                  Enter 4-digit Municipal Staff PIN to access officer triage & crew dispatch.
                </p>
              </div>

              <div className="space-y-1">
                <input
                  type="password"
                  maxLength={4}
                  value={officerPin}
                  onChange={(e) => {
                    setOfficerPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Enter PIN (Default: 1234)"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d7a70]"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs text-rose-600 text-center font-medium mt-1">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#2d7a70] hover:bg-[#23635b] text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Verify & Enter Officer Desk
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOfficerPin('1234');
                    setUserRole('OFFICER');
                    setShowOfficerLoginModal(false);
                    setPinError('');
                  }}
                  className="w-full h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Quick Demo Login (Staff PIN: 1234)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings & Key Configuration Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
