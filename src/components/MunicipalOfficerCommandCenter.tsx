import React, { useEffect, useState, useMemo } from 'react';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  CheckCircle, 
  FileCheck, 
  Users, 
  Layers, 
  Map as MapIcon, 
  User, 
  Eye, 
  Radio, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Columns2,
  Table,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ZoomIn,
  X,
  ExternalLink,
  ShieldCheck,
  Activity,
  Flame,
  AlertCircle,
  Headset,
  Settings,
  Menu
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit, UnitStatus, DepartmentType, PriorityLevel, UserProfile } from '../types';
import { ZONES } from '../mockData';
import { wipeAllComplaints, seedDemoComplaints } from '../services/firebase';
import { GoogleTacticalMap } from './GoogleTacticalMap';
import { LiveIncidentQueue } from './LiveIncidentQueue';
import { MunicipalGovernanceView } from './MunicipalGovernanceView';
import { ProfileView } from './ProfileView';

interface MunicipalOfficerCommandCenterProps {
  incidents: CrisisIncident[];
  units: MunicipalUnit[];
  selectedIncident: CrisisIncident | null;
  selectedUnit: MunicipalUnit | null;
  onSelectIncident: (incident: CrisisIncident | null) => void;
  onSelectUnit: (unit: MunicipalUnit | null) => void;
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status'], proofUrl?: string, notes?: string, metadata?: any) => void;
  onUpdateUnitStatus: (unitId: string, status: UnitStatus) => void;
  onAssignCrew: (incidentId: string, unitId: string) => void;
  onReRouteDepartment?: (incidentId: string, dept: DepartmentType) => void;
  onAdjustPriority?: (incidentId: string, priority: PriorityLevel) => void;
  onLogout?: () => void;
  onSwitchToCitizen?: () => void;
  currentUser?: UserProfile | null;
  onOpenStaffManagement?: () => void;
  onOpenProfile?: () => void;
  onOpenGeminiCopilot?: () => void;
  initialTab?: 'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE';
  onTabChange?: (tab: 'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE') => void;
}

export const MunicipalOfficerCommandCenter: React.FC<MunicipalOfficerCommandCenterProps> = ({
  incidents,
  units,
  selectedIncident,
  selectedUnit,
  onSelectIncident,
  onSelectUnit,
  onUpdateIncidentStatus,
  onUpdateUnitStatus,
  onAssignCrew,
  onLogout,
  onSwitchToCitizen,
  currentUser,
  onOpenStaffManagement,
  onOpenProfile,
  onOpenGeminiCopilot,
  initialTab = 'COMMAND_DESK',
  onTabChange
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const hasWardManagePerm = isSuperAdmin || (currentUser?.permissions?.includes('MANAGE_WARDS') || currentUser?.permissions?.includes('ALL_ACCESS'));
  const defaultWard = currentUser?.assignedWard || 'Ward 4 - Central Zone';
  const [activeTab, setActiveTab] = useState<'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE'>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSwitchTab = (tab: 'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Workspace Layout & Collapse States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showSystemSettingsModal, setShowSystemSettingsModal] = useState<boolean>(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [splitMode, setSplitMode] = useState<'SPLIT' | 'EXPANDED_MAP' | 'EXPANDED_TABLE'>('SPLIT');
  const [centerPillFilter, setCenterPillFilter] = useState<'ALL' | 'CRITICAL' | 'URGENT' | 'FLEETS'>('ALL');

  const [selectedWard, setSelectedWard] = useState<string>(defaultWard);
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'PENDING_MANUAL_TRIAGE'>('ALL');
  const [mobileSubTab, setMobileSubTab] = useState<'MAP' | 'QUEUE' | 'DISPATCH'>('MAP');
  
  // Lightbox & Modal states
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80');
  const [officerNoteInput, setOfficerNoteInput] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [isWipingDb, setIsWipingDb] = useState<boolean>(false);
  const [isSeedingDb, setIsSeedingDb] = useState<boolean>(false);
  const [showWipeModal, setShowWipeModal] = useState<boolean>(false);
  const [adminToastMsg, setAdminToastMsg] = useState<string | null>(null);

  // Sync ward if user profile changes
  useEffect(() => {
    if (currentUser?.assignedWard && !isSuperAdmin) {
      setSelectedWard(currentUser.assignedWard);
    }
  }, [currentUser, isSuperAdmin]);

  const handleWipeAllComplaints = async () => {
    setIsWipingDb(true);
    try {
      const res = await wipeAllComplaints();
      if (res.success) {
        setAdminToastMsg('✅ All complaints purged. Database is now clean.');
      } else {
        setAdminToastMsg('❌ ' + res.message);
      }
    } catch (err: any) {
      setAdminToastMsg('❌ ' + (err?.message || 'Error wiping complaints'));
    } finally {
      setIsWipingDb(false);
      setShowWipeModal(false);
      setTimeout(() => {
        setAdminToastMsg(null);
      }, 5000);
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeedingDb(true);
    try {
      const res = await seedDemoComplaints();
      if (res.success) {
        setAdminToastMsg('✅ Demo incident scenarios loaded.');
      } else {
        setAdminToastMsg('❌ ' + res.message);
      }
    } catch (err: any) {
      setAdminToastMsg('❌ ' + (err?.message || 'Error loading demo scenarios'));
    } finally {
      setIsSeedingDb(false);
      setTimeout(() => {
        setAdminToastMsg(null);
      }, 5000);
    }
  };

  // Count manual triage items
  const manualTriageCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      if (inc.requiresManualVerification || inc.status === 'PENDING_MANUAL_TRIAGE' || inc.isCivicIssue === false) {
        count++;
      }
    }
    return count;
  }, [incidents]);

  // Filter incidents for officer desk with memoization
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Center Pill Filter overrides
      if (centerPillFilter === 'CRITICAL' && inc.priority !== 'P1_CRITICAL') return false;
      if (centerPillFilter === 'URGENT' && inc.priority !== 'P2_URGENT') return false;

      if (filterStatus === 'PENDING_MANUAL_TRIAGE') {
        return Boolean(inc.requiresManualVerification || inc.status === 'PENDING_MANUAL_TRIAGE' || inc.isCivicIssue === false);
      }
      if (filterStatus === 'OPEN' && (inc.status === 'RESOLVED' || inc.status === 'PENDING_MANUAL_TRIAGE')) return false;
      if (filterStatus === 'RESOLVED' && inc.status !== 'RESOLVED') return false;
      if (filterStatus === 'IN_PROGRESS' && (inc.status === 'OPEN' || inc.status === 'RESOLVED' || inc.status === 'PENDING_MANUAL_TRIAGE')) return false;
      if (filterDepartment !== 'ALL' && inc.department !== filterDepartment) return false;
      return true;
    });
  }, [incidents, filterStatus, filterDepartment, centerPillFilter]);

  const activeTicket = selectedIncident || filteredIncidents[0];

  const handleResolveTicket = () => {
    if (!activeTicket) return;
    onUpdateIncidentStatus(activeTicket.id, 'RESOLVED', proofPhotoUrl, officerNoteInput || 'Work inspected and defect rectified according to standard SOP.');
    setShowResolveModal(false);
    setOfficerNoteInput('');
  };

  const selectedZoneObj = ZONES.find(z => z.name === selectedWard) || ZONES[0];
  const userDisplayName = currentUser?.name || 'Officer';
  const userRoleLabel = isSuperAdmin ? 'Super Admin' : (currentUser?.designation || 'Ward Officer');

  return (
    <div className="flex h-full w-full bg-[#EEF2F6] overflow-hidden font-sans select-none">
      
      {/* =======================================================
          1. LEFT NAVIGATION SIDEBAR (GovTech Admin / Officer HQ Navigation)
         ======================================================= */}
      <aside 
        className={`${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shadow-xl z-40 transition-all duration-300 relative flex-shrink-0 hidden md:flex`}
      >
        {/* Sidebar Header: Brand + Collapse Button */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/90 shrink-0">
          {!isSidebarCollapsed && (
            <div 
              onClick={() => handleSwitchTab('COMMAND_DESK')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              title="Return to GIS Command Desk"
            >
              <img 
                src="/logo.png" 
                alt="CivicPulse" 
                className="h-8 w-auto object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <h1 className="font-bold text-sm text-white tracking-tight leading-none truncate group-hover:text-teal-300 transition-colors">
                  CivicPulse HQ
                </h1>
                <span className="text-[10px] text-teal-400 font-semibold tracking-wide">Command Center</span>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <img 
              src="/logo.png" 
              alt="CivicPulse" 
              className="h-8 w-auto mx-auto object-contain cursor-pointer" 
              onClick={() => handleSwitchTab('COMMAND_DESK')}
            />
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-4 px-2 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Navigation Group 1: Core Operations */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                Operational Matrix
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleSwitchTab('COMMAND_DESK')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'COMMAND_DESK'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                title="GIS Command Map & Ticket Operations"
              >
                <MapIcon className="w-4 h-4 text-teal-400 shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">GIS Command Map</span>
                    {incidents.length > 0 && (
                      <span className="bg-slate-800 text-teal-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {incidents.length}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {hasWardManagePerm && (
                <button
                  onClick={() => handleSwitchTab('WARD_CONFIG')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'WARD_CONFIG'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title="Ward Governance & Service Metrics"
                >
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Ward Governance</span>}
                </button>
              )}

              {onOpenStaffManagement && (
                <button
                  onClick={onOpenStaffManagement}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800 ${
                    isSidebarCollapsed ? 'justify-center px-0' : ''
                  }`}
                  title="Manage Ward Staff & RBAC Delegations"
                >
                  <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Staff Management</span>}
                </button>
              )}

              <button
                onClick={() => onOpenProfile ? onOpenProfile() : handleSwitchTab('PROFILE')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'PROFILE'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                title="Officer Profile & Preferences"
              >
                <User className="w-4 h-4 text-amber-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Officer Profile</span>}
              </button>
            </div>
          </div>

          {/* Navigation Group 2: AI & System Maintenance */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                AI & Admin Tools
              </div>
            )}
            <div className="space-y-1">
              {onOpenGeminiCopilot && (
                <button
                  onClick={onOpenGeminiCopilot}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-slate-800/80 hover:bg-slate-800 text-teal-300 border border-teal-500/20 ${
                    isSidebarCollapsed ? 'justify-center px-0' : ''
                  }`}
                  title="Open Civic AI Assistant"
                >
                  <Headset className="w-4 h-4 text-teal-400 shrink-0" />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate text-white font-semibold">Civic AI Assistant</span>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                        Live
                      </span>
                    </div>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowSystemSettingsModal(true)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800 ${
                  isSidebarCollapsed ? 'justify-center px-0' : ''
                }`}
                title="System Settings, Data Seeding & Maintenance"
              >
                <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">System Maintenance</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Citizen Switch & User Profile */}
        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
          {(onSwitchToCitizen || onLogout) && (
            <button
              onClick={onSwitchToCitizen || onLogout}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
              title="View app as a Citizen"
            >
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              {!isSidebarCollapsed && <span>Switch to Citizen View</span>}
            </button>
          )}

          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                {userDisplayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-xs truncate">{userDisplayName}</div>
                <div className="text-[10px] text-teal-400 font-medium truncate">{userRoleLabel}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* =======================================================
          2. MAIN VIEW AREA (Header + Tab Content)
         ======================================================= */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        {/* Streamlined Clean Top Header */}
        <header className="bg-white border-b border-slate-300 shadow-xs h-14 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-30 gap-4">
          {/* Left: Mobile Sidebar Toggle / Active Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Toggle Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo.png" alt="CivicPulse" className="h-7 w-auto md:hidden" />
              <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                {activeTab === 'COMMAND_DESK' && 'GIS Command Map & Incident Matrix'}
                {activeTab === 'WARD_CONFIG' && 'Ward Governance & Operations'}
                {activeTab === 'PROFILE' && 'Officer Profile'}
              </span>
              <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
                Live Operations
              </span>
            </div>
          </div>

          {/* Right Header Actions: Ward Selector, AI Help, Settings Gear & User Info */}
          <div className="flex items-center gap-2.5 text-xs shrink-0">
            {/* Ward Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              {isSuperAdmin ? (
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs pr-1"
                >
                  {ZONES.map((z) => (
                    <option key={z.name} value={z.name} className="bg-white text-slate-900">
                      {z.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-slate-900">{selectedWard}</span>
              )}
            </div>

            {/* AI Assistant Quick Trigger */}
            {onOpenGeminiCopilot && (
              <button
                onClick={onOpenGeminiCopilot}
                className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition text-xs border border-slate-700"
                title="Open Civic AI Assistant"
              >
                <Headset className="w-3.5 h-3.5 text-teal-300" />
                <span className="hidden sm:inline">AI Help</span>
              </button>
            )}

            {/* System Settings Quick Gear Button */}
            <button
              onClick={() => setShowSystemSettingsModal(true)}
              className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition border border-slate-200"
              title="System Maintenance & Database Actions"
            >
              <Settings className="w-4 h-4 text-slate-700" />
            </button>

            {/* User Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <div className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">
                {userDisplayName.charAt(0)}
              </div>
              <span className="text-slate-900 font-bold">{userDisplayName}</span>
            </div>
          </div>
        </header>

      {/* RENDER TAB 1: MUNICIPAL GOVERNANCE & WARD CONFIG */}
      {activeTab === 'WARD_CONFIG' && (
        <div className="flex-1 flex overflow-hidden">
          <MunicipalGovernanceView currentUser={currentUser || null} />
        </div>
      )}

      {/* RENDER TAB 2: PROFILE VIEW FOR OFFICERS & ADMIN */}
      {activeTab === 'PROFILE' && (
        <div className="flex-1 flex overflow-hidden">
          <ProfileView
            currentUser={currentUser || null}
            onSignOut={onLogout || (() => {})}
            onSwitchToTacticalDesk={() => setActiveTab('COMMAND_DESK')}
            onOpenStaffManagement={onOpenStaffManagement}
          />
        </div>
      )}

      {/* RENDER TAB 3: COMMAND DESK */}
      {activeTab === 'COMMAND_DESK' && (
        <div className="flex-1 w-full overflow-hidden bg-[#EEF2F6] text-slate-900 flex flex-col min-h-0">
          
          {/* =======================================================
              MOBILE VIEW (< 768px): App-Grade Touch Navigation
             ======================================================= */}
          <div className="md:hidden flex-1 flex flex-col p-3 overflow-hidden min-h-0 space-y-2">
            {/* Floating Segmented Pill Switcher */}
            <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-1 text-xs font-bold shrink-0">
              <button
                onClick={() => setMobileSubTab('MAP')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileSubTab === 'MAP'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Tactical Map</span>
              </button>
              <button
                onClick={() => setMobileSubTab('QUEUE')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  mobileSubTab === 'QUEUE'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Queue</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  mobileSubTab === 'QUEUE' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {filteredIncidents.length}
                </span>
              </button>
              <button
                onClick={() => setMobileSubTab('DISPATCH')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileSubTab === 'DISPATCH'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Dispatch</span>
              </button>
            </div>

            {/* MOBILE SUB-VIEW 1: TACTICAL MAP */}
            {mobileSubTab === 'MAP' && (
              <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Edge-to-Edge Tactical Map Container */}
                <div className="h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative bg-slate-100">
                  <GoogleTacticalMap
                    incidents={filteredIncidents}
                    units={units}
                    selectedIncident={selectedIncident}
                    selectedUnit={selectedUnit}
                    onSelectIncident={onSelectIncident}
                    onSelectUnit={onSelectUnit}
                    onUpdateIncidentStatus={(id, st) => onUpdateIncidentStatus(id, st)}
                    activeZoneCenter={{ lat: selectedZoneObj.lat, lng: selectedZoneObj.lng }}
                  />
                </div>

                {/* Floating Bottom Action Card for Selected Ticket */}
                {activeTicket && (
                  <div className="absolute bottom-3 left-3 right-3 z-20 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl flex items-center justify-between animate-slide-up">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-teal-800">{activeTicket.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          activeTicket.priority === 'P1_CRITICAL' ? 'bg-rose-100 text-rose-800' :
                          activeTicket.priority === 'P2_URGENT' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activeTicket.priority === 'P1_CRITICAL' ? 'P1 Critical' : activeTicket.priority === 'P2_URGENT' ? 'P2 Urgent' : 'P3 Normal'}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 truncate mt-0.5">{activeTicket.title}</p>
                    </div>
                    <button
                      onClick={() => setMobileSubTab('DISPATCH')}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shrink-0 flex items-center gap-1.5 cursor-pointer transition shadow-xs active:scale-95"
                    >
                      <span>Dispatch</span>
                      <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE SUB-VIEW 2: INCIDENT QUEUE */}
            {mobileSubTab === 'QUEUE' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto pr-0.5">
                {/* 4 KPI Summary Cards with Soft Gradients */}
                <div className="grid grid-cols-4 gap-1.5 shrink-0">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200/80 text-blue-900 text-center shadow-2xs">
                    <p className="text-[9px] font-bold uppercase opacity-80">Total</p>
                    <p className="text-base font-extrabold">{incidents.length}</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-200/80 text-rose-900 text-center shadow-2xs">
                    <p className="text-[9px] font-bold uppercase opacity-80">Open</p>
                    <p className="text-base font-extrabold">{incidents.filter(i => i.status === 'OPEN').length}</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-200/80 text-amber-900 text-center shadow-2xs">
                    <p className="text-[9px] font-bold uppercase opacity-80">Active</p>
                    <p className="text-base font-extrabold">{incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DISPATCHED').length}</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200/80 text-emerald-900 text-center shadow-2xs">
                    <p className="text-[9px] font-bold uppercase opacity-80">Resolved</p>
                    <p className="text-base font-extrabold">{incidents.filter(i => i.status === 'RESOLVED').length}</p>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">All Civic Departments</option>
                    <option value="Solid Waste Management">Solid Waste Management</option>
                    <option value="Sanitation & Public Health">Sanitation & Public Health</option>
                    <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                    <option value="Electrical & Streetlights">Electrical & Streetlights</option>
                    <option value="Water Supply & Drainage">Water Supply & Drainage</option>
                  </select>
                </div>

                {/* Mobile Incident Feed Cards */}
                <div className="space-y-2 pb-6">
                  {filteredIncidents.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2 shadow-2xs">
                      <Layers className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">No grievances matching current filter.</p>
                    </div>
                  ) : (
                    filteredIncidents.map((incident) => {
                      const isSelected = activeTicket?.id === incident.id;
                      return (
                        <div
                          key={incident.id}
                          onClick={() => {
                            onSelectIncident(incident);
                            setMobileSubTab('DISPATCH');
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white flex flex-col gap-2.5 active:scale-[0.99] shadow-xs ${
                            isSelected
                              ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
                              : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          {/* Card Header: Priority, ID & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                incident.priority === 'P1_CRITICAL'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : incident.priority === 'P2_URGENT'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {incident.priority === 'P1_CRITICAL' ? 'P1 Critical' : incident.priority === 'P2_URGENT' ? 'P2 Urgent' : 'P3 Normal'}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-500">{incident.id}</span>
                            </div>

                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                              incident.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              incident.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              incident.status === 'DISPATCHED' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {incident.status === 'OPEN' ? 'Pending' : incident.status.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Card Title & Location */}
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-1">
                              {incident.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{incident.location.address}</span>
                            </p>
                          </div>

                          {/* Card Footer: Dept & Quick Action */}
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                            <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                              {incident.department}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span>{incident.assignedUnitName || 'Unassigned'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* MOBILE SUB-VIEW 3: DISPATCH DESK */}
            {mobileSubTab === 'DISPATCH' && (
              <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 overflow-y-auto">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-teal-700" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Incident Dispatch Desk
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {filteredIncidents.length} in Queue
                    </span>
                  </div>

                  {/* Quick Ticket Selector Carousel */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {filteredIncidents.slice(0, 10).map((ticket) => {
                      const isSelected = activeTicket?.id === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => onSelectIncident(ticket)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {ticket.id}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Ticket Details */}
                  {activeTicket ? (
                    <div className="space-y-3.5">
                      {/* Ticket Header Card */}
                      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold text-teal-800">{activeTicket.id}</span>
                            <h3 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug break-words">
                              {activeTicket.title}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{activeTicket.location.address}</span>
                            </p>
                          </div>

                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            activeTicket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            activeTicket.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            activeTicket.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {activeTicket.status}
                          </span>
                        </div>

                        {/* AI Classification Pill */}
                        <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-900 px-2.5 py-1 rounded-xl text-xs font-semibold">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{activeTicket.category || 'Civic Infrastructure'} • SLA Active</span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] pt-1.5 border-t border-slate-200/70 text-slate-600">
                          <span className="font-semibold">Dept: <span className="text-slate-900 font-bold">{activeTicket.department}</span></span>
                          <span>•</span>
                          <span className="font-semibold">Priority: <span className="text-slate-900 font-bold">{activeTicket.priority}</span></span>
                          <span>•</span>
                          <span>Reporter: <strong>{activeTicket.reporterName || 'Citizen'}</strong></span>
                        </div>
                      </div>

                      {/* Photo Attachment Container with Lightbox Trigger */}
                      {activeTicket.imageUrl && (
                        <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 block">Citizen Geo-Photo Attachment:</label>
                            <button
                              onClick={() => setLightboxImage(activeTicket.imageUrl!)}
                              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                            >
                              <ZoomIn className="w-3 h-3" />
                              <span>Zoom</span>
                            </button>
                          </div>
                          <div 
                            onClick={() => setLightboxImage(activeTicket.imageUrl!)}
                            className="h-44 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-900 shadow-xs cursor-pointer group"
                          >
                            <img
                              src={activeTicket.imageUrl}
                              alt="Hazard"
                              className="max-h-48 w-full object-cover transition-transform group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="p-2 rounded-full bg-white/90 text-slate-900 shadow-md">
                                <ZoomIn className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Manual Triage Gate Officer Action Card */}
                      {(activeTicket.requiresManualVerification || activeTicket.status === 'PENDING_MANUAL_TRIAGE' || activeTicket.isCivicIssue === false) && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5 shadow-xs">
                          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Manual Triage Gate: Flagged Non-Civic Media</span>
                          </div>
                          <p className="text-xs text-amber-900 leading-relaxed">
                            {activeTicket.rejectionReason || 'Media was flagged during AI analysis as potentially non-civic or ambiguous. Officer verification required before crew dispatch.'}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                onUpdateIncidentStatus(
                                  activeTicket.id, 
                                  'OPEN', 
                                  undefined, 
                                  'Verified manually by officer. Approved for dispatch.',
                                  { requiresManualVerification: false, isCivicIssue: true }
                                );
                              }}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve & Route</span>
                            </button>

                            <button
                              onClick={() => {
                                onUpdateIncidentStatus(
                                  activeTicket.id, 
                                  'RESOLVED', 
                                  undefined, 
                                  'Dismissed during manual triage: Non-civic visual submission.',
                                  { requiresManualVerification: false, isCivicIssue: false }
                                );
                              }}
                              className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Field Crew Assignment Section */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-teal-700" />
                            <span>1-Tap Field Crew Dispatch:</span>
                          </label>
                          {activeTicket.assignedUnitName && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Assigned: {activeTicket.assignedUnitName}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {units.map((u) => {
                            const isAssigned = activeTicket.assignedUnitId === u.id;
                            return (
                              <div
                                key={u.id}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                                  isAssigned 
                                    ? 'bg-teal-50 border-teal-500 text-teal-900' 
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold truncate">{u.name}</p>
                                    <span className={`w-2 h-2 rounded-full ${
                                      u.status === 'AVAILABLE' ? 'bg-emerald-500' :
                                      u.status === 'EN_ROUTE' ? 'bg-blue-500' : 'bg-amber-500'
                                    }`} />
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate">{u.vehicleType} • {u.status}</p>
                                </div>
                                <button
                                  onClick={() => onAssignCrew(activeTicket.id, u.id)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shadow-2xs ${
                                    isAssigned
                                      ? 'bg-slate-900 text-white'
                                      : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800'
                                  }`}
                                >
                                  {isAssigned ? 'Assigned' : 'Dispatch'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <FileCheck className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs">No grievances found matching this filter.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Inspect & Resolve Trigger */}
                {activeTicket && (
                  <div className="pt-3 border-t border-slate-100 mt-3">
                    {activeTicket.status !== 'RESOLVED' ? (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Inspect, Verify Fix & Resolve Ticket</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Grievance Resolved & Verified</span>
                        </div>
                        {activeTicket.officerNotes && (
                          <p className="text-[11px] text-emerald-800 mt-1 italic">
                            "{activeTicket.officerNotes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =======================================================
              DESKTOP VIEW (md+): Modular Collapsible Workspace
             ======================================================= */}
          <div className="hidden md:flex flex-1 min-h-0 w-full p-4 gap-4 overflow-hidden">
            
            {/* 1. LEFT PANEL: Telemetry & Ward Controls (Collapsible w-80 or w-16) */}
            <div className={`h-full flex flex-col justify-between bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.03] transition-all duration-300 ease-in-out shrink-0 overflow-y-auto ${
              isLeftCollapsed ? 'w-16 p-2.5 items-center' : 'w-80 p-4'
            }`}>
              
              {/* Top Controls & Header */}
              <div className="w-full space-y-4">
                {/* Header bar with Collapse Toggle */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  {!isLeftCollapsed && (
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-teal-700" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Ward Telemetry
                      </h2>
                    </div>
                  )}
                  <button
                    onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer mx-auto"
                    title={isLeftCollapsed ? 'Expand Telemetry Panel' : 'Collapse Telemetry Panel'}
                  >
                    {isLeftCollapsed ? <PanelLeftOpen className="w-4 h-4 text-teal-700" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>
                </div>

                {/* Collapsed Strip View */}
                {isLeftCollapsed ? (
                  <div className="flex flex-col items-center gap-3 w-full pt-1">
                    {/* Collapsed KPI icon chips */}
                    <div 
                      onClick={() => { setFilterStatus('ALL'); setIsLeftCollapsed(false); }}
                      className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-center cursor-pointer hover:scale-105 transition shadow-2xs"
                      title={`Total: ${incidents.length}`}
                    >
                      <Layers className="w-4 h-4 mx-auto text-blue-600" />
                      <span className="text-[10px] font-extrabold block mt-0.5">{incidents.length}</span>
                    </div>

                    <div 
                      onClick={() => { setFilterStatus('OPEN'); setIsLeftCollapsed(false); }}
                      className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-center cursor-pointer hover:scale-105 transition shadow-2xs relative"
                      title={`Open / Pending: ${incidents.filter(i => i.status === 'OPEN').length}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-600 absolute top-1 right-1 animate-pulse" />
                      <Flame className="w-4 h-4 mx-auto text-rose-600" />
                      <span className="text-[10px] font-extrabold block mt-0.5">{incidents.filter(i => i.status === 'OPEN').length}</span>
                    </div>

                    <div 
                      onClick={() => { setFilterStatus('IN_PROGRESS'); setIsLeftCollapsed(false); }}
                      className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center cursor-pointer hover:scale-105 transition shadow-2xs"
                      title={`In Progress: ${incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DISPATCHED').length}`}
                    >
                      <Truck className="w-4 h-4 mx-auto text-amber-600" />
                      <span className="text-[10px] font-extrabold block mt-0.5">{incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DISPATCHED').length}</span>
                    </div>

                    <div 
                      onClick={() => { setFilterStatus('RESOLVED'); setIsLeftCollapsed(false); }}
                      className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center cursor-pointer hover:scale-105 transition shadow-2xs"
                      title={`Resolved: ${incidents.filter(i => i.status === 'RESOLVED').length}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-600" />
                      <span className="text-[10px] font-extrabold block mt-0.5">{incidents.filter(i => i.status === 'RESOLVED').length}</span>
                    </div>

                    {/* Manual Triage icon chip */}
                    <div 
                      onClick={() => { setFilterStatus('PENDING_MANUAL_TRIAGE'); setIsLeftCollapsed(false); }}
                      className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-center cursor-pointer hover:scale-105 transition shadow-2xs mt-2 relative"
                      title={`Manual Verification Queue: ${manualTriageCount}`}
                    >
                      <AlertTriangle className="w-4 h-4 mx-auto text-amber-700" />
                      <span className="text-[10px] font-extrabold block mt-0.5">{manualTriageCount}</span>
                    </div>
                  </div>
                ) : (
                  /* Expanded Full Panel View */
                  <div className="space-y-4">
                    {/* Jurisdiction Zone Card */}
                    <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          Jurisdiction
                        </span>
                        <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                          Active SOP
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{selectedWard}</h3>
                      <p className="text-xs text-slate-500">
                        In-Charge: <strong className="text-slate-800">{userDisplayName}</strong>
                      </p>
                    </div>

                    {/* Elevated Telemetry KPI Micro-Cards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Real-Time Telemetry
                        </label>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Sync
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {/* Total Logged */}
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200/80 text-blue-900 shadow-2xs">
                          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-blue-600" />
                            <span>Total</span>
                          </p>
                          <p className="text-xl font-extrabold mt-0.5">{incidents.length}</p>
                          <span className="text-[10px] font-semibold opacity-90">100% Verified</span>
                        </div>

                        {/* Open / Pending */}
                        <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-200/80 text-rose-900 shadow-2xs">
                          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span>Pending</span>
                          </p>
                          <p className="text-xl font-extrabold mt-0.5">
                            {incidents.filter(i => i.status === 'OPEN').length}
                          </p>
                          <span className="text-[10px] font-semibold opacity-90">Needs Dispatch</span>
                        </div>

                        {/* In Progress */}
                        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-200/80 text-amber-900 shadow-2xs">
                          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600" />
                            <span>Active</span>
                          </p>
                          <p className="text-xl font-extrabold mt-0.5">
                            {incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DISPATCHED').length}
                          </p>
                          <span className="text-[10px] font-semibold opacity-90">Crews On-Site</span>
                        </div>

                        {/* Resolved */}
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200/80 text-emerald-900 shadow-2xs">
                          <p className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Resolved</span>
                          </p>
                          <p className="text-xl font-extrabold mt-0.5">
                            {incidents.filter(i => i.status === 'RESOLVED').length}
                          </p>
                          <span className="text-[10px] font-semibold opacity-90">SOP Closed</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Filter Grid */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>Status Filter</span>
                        <span className="text-slate-400 font-mono text-[10px]">{filteredIncidents.length} matching</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                              filterStatus === st
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {st === 'ALL' ? 'All Tickets' : st === 'OPEN' ? 'Open' : st === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
                          </button>
                        ))}
                      </div>

                      {/* Manual Verification Queue Trigger */}
                      <button
                        onClick={() => setFilterStatus('PENDING_MANUAL_TRIAGE')}
                        className={`w-full mt-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          filterStatus === 'PENDING_MANUAL_TRIAGE'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Manual Verification Queue</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          filterStatus === 'PENDING_MANUAL_TRIAGE' ? 'bg-white text-amber-900' : 'bg-amber-200 text-amber-900'
                        }`}>
                          {manualTriageCount}
                        </span>
                      </button>
                    </div>

                    {/* Department Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Municipal Department
                      </label>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer shadow-2xs"
                      >
                        <option value="ALL">All Civic Departments</option>
                        <option value="Solid Waste Management">Solid Waste Management</option>
                        <option value="Sanitation & Public Health">Sanitation & Public Health</option>
                        <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                        <option value="Electrical & Streetlights">Electrical & Streetlights</option>
                        <option value="Water Supply & Drainage">Water Supply & Drainage</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Trigger */}
              {!isLeftCollapsed && onOpenStaffManagement && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={onOpenStaffManagement}
                    className="w-full h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200 shadow-2xs"
                  >
                    <Users className="w-3.5 h-3.5 text-teal-700" />
                    <span>Manage Ward Staff & RBAC</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. CENTER STAGE: Map & Live Incident Table Splitter */}
            <div className="flex-1 min-w-0 h-full flex flex-col gap-3 overflow-hidden transition-all duration-300 ease-in-out">
              
              {/* Unified Center Pill Dock & Split View Mode Controls */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs px-3.5 py-2 flex items-center justify-between shrink-0">
                {/* Left: Tactical Filter Dock */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => { setCenterPillFilter('ALL'); setFilterStatus('ALL'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      centerPillFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>All Incidents</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-inherit">
                      {incidents.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setCenterPillFilter('CRITICAL'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      centerPillFilter === 'CRITICAL'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    <span>Critical P1</span>
                  </button>

                  <button
                    onClick={() => { setCenterPillFilter('URGENT'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      centerPillFilter === 'URGENT'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span>Urgent P2</span>
                  </button>

                  <button
                    onClick={() => { setCenterPillFilter('FLEETS'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      centerPillFilter === 'FLEETS'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Active Fleets ({units.length})</span>
                  </button>
                </div>

                {/* Right: Split Mode Toggle Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={() => setSplitMode('SPLIT')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      splitMode === 'SPLIT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Split Mode (60% Map / 40% Incident Queue)"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Split View</span>
                  </button>
                  <button
                    onClick={() => setSplitMode('EXPANDED_MAP')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      splitMode === 'EXPANDED_MAP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Expanded Map Mode (Full-Height GIS Focus)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Full Map</span>
                  </button>
                  <button
                    onClick={() => setSplitMode('EXPANDED_TABLE')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      splitMode === 'EXPANDED_TABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Expanded Queue Mode (Full-Height Queue Table)"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Full Queue</span>
                  </button>
                </div>
              </div>

              {/* Dynamic View Containers based on splitMode */}
              <div className="flex-1 min-h-0 w-full flex flex-col gap-3 overflow-hidden">
                {/* GIS Tactical Map Container */}
                {(splitMode === 'SPLIT' || splitMode === 'EXPANDED_MAP') && (
                  <div className={`w-full rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] overflow-hidden relative bg-slate-100 transition-all duration-300 ${
                    splitMode === 'SPLIT' ? 'flex-[6] min-h-[300px]' : 'flex-1'
                  }`}>
                    <GoogleTacticalMap
                      incidents={filteredIncidents}
                      units={units}
                      selectedIncident={selectedIncident}
                      selectedUnit={selectedUnit}
                      onSelectIncident={onSelectIncident}
                      onSelectUnit={onSelectUnit}
                      onUpdateIncidentStatus={(id, st) => onUpdateIncidentStatus(id, st)}
                      activeZoneCenter={{ lat: selectedZoneObj.lat, lng: selectedZoneObj.lng }}
                    />
                  </div>
                )}

                {/* Incident Queue Table Container */}
                {(splitMode === 'SPLIT' || splitMode === 'EXPANDED_TABLE') && (
                  <div className={`w-full rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] overflow-hidden bg-white flex flex-col transition-all duration-300 ${
                    splitMode === 'SPLIT' ? 'flex-[4] min-h-[220px]' : 'flex-1'
                  }`}>
                    <LiveIncidentQueue
                      incidents={filteredIncidents}
                      selectedIncident={selectedIncident}
                      onSelectIncident={onSelectIncident}
                      onUpdateIncidentStatus={onUpdateIncidentStatus}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. RIGHT PANEL: Incident Action Desk (Collapsible w-96 or w-14) */}
            <div className={`h-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.03] transition-all duration-300 ease-in-out shrink-0 flex flex-col justify-between overflow-y-auto ${
              isRightCollapsed ? 'w-14 p-2 items-center' : 'w-96 p-4'
            }`}>
              
              {/* Header & Main Content */}
              <div className="w-full space-y-3.5">
                {/* Header with Collapse Button */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <button
                    onClick={() => setIsRightCollapsed(!isRightCollapsed)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                    title={isRightCollapsed ? 'Expand Dispatch Desk' : 'Collapse Dispatch Desk'}
                  >
                    {isRightCollapsed ? <PanelRightOpen className="w-4 h-4 text-teal-700" /> : <PanelRightClose className="w-4 h-4" />}
                  </button>

                  {!isRightCollapsed && (
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-teal-700" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Dispatch Desk
                      </h3>
                    </div>
                  )}

                  {!isRightCollapsed && (
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {filteredIncidents.length} in Queue
                    </span>
                  )}
                </div>

                {/* Collapsed State Strip */}
                {isRightCollapsed ? (
                  <div className="flex flex-col items-center gap-3 pt-2">
                    <div 
                      onClick={() => setIsRightCollapsed(false)}
                      className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-center cursor-pointer hover:scale-105 transition shadow-2xs"
                      title={activeTicket ? `Active: ${activeTicket.id}` : 'No ticket selected'}
                    >
                      <FileCheck className="w-4 h-4 mx-auto text-teal-700" />
                      <span className="text-[9px] font-mono font-bold block mt-1 truncate">
                        {activeTicket?.id?.slice(-3) || '—'}
                      </span>
                    </div>

                    <div 
                      onClick={() => setIsRightCollapsed(false)}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-center cursor-pointer hover:scale-105 transition"
                      title="Open Dispatch Controls"
                    >
                      <Truck className="w-4 h-4 mx-auto text-slate-600" />
                    </div>
                  </div>
                ) : (
                  /* Expanded Action Desk */
                  <div className="space-y-3.5">
                    {/* Quick Ticket Selector Carousel */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {filteredIncidents.slice(0, 10).map((ticket) => {
                        const isSelected = activeTicket?.id === ticket.id;
                        return (
                          <button
                            key={ticket.id}
                            onClick={() => onSelectIncident(ticket)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {ticket.id}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Ticket Details & Action Panel */}
                    {activeTicket ? (
                      <div className="space-y-3">
                        {/* Ticket Summary Card */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-mono text-xs font-bold text-teal-800">{activeTicket.id}</span>
                              <h3 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug break-words">
                                {activeTicket.title}
                              </h3>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{activeTicket.location.address}</span>
                              </p>
                            </div>

                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              activeTicket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              activeTicket.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              activeTicket.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {activeTicket.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[11px] pt-1.5 border-t border-slate-200/70 text-slate-600">
                            <span className="font-semibold">Dept: <span className="text-slate-900 font-bold">{activeTicket.department}</span></span>
                            <span>•</span>
                            <span className="font-semibold">Priority: <span className="text-slate-900 font-bold">{activeTicket.priority}</span></span>
                            <span>•</span>
                            <span>Reporter: <strong>{activeTicket.reporterName || 'Citizen'}</strong></span>
                          </div>
                        </div>

                        {/* AI Classification & SLA Insight Pill */}
                        <div className="p-3 bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-slate-50 border border-teal-200/80 rounded-2xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                              AI Classification & Triage
                            </span>
                            <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full border border-teal-200">
                              98% Confidence
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">
                            Categorized as <strong className="text-slate-900">{activeTicket.category || activeTicket.department}</strong> with active standard MoHUA SLA dispatch protocol.
                          </p>
                        </div>

                        {/* Photo Attachment Container with Lightbox Expand Trigger */}
                        {activeTicket.imageUrl && (
                          <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800 block">Citizen Geo-Photo Attachment:</label>
                              <button
                                onClick={() => setLightboxImage(activeTicket.imageUrl!)}
                                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                              >
                                <ZoomIn className="w-3 h-3" />
                                <span>Expand Lightbox</span>
                              </button>
                            </div>
                            <div 
                              onClick={() => setLightboxImage(activeTicket.imageUrl!)}
                              className="h-36 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-900 shadow-xs cursor-pointer group"
                            >
                              <img
                                src={activeTicket.imageUrl}
                                alt="Hazard"
                                className="max-h-48 w-full object-cover transition-transform group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="p-2 rounded-full bg-white/90 text-slate-900 shadow-md">
                                  <ZoomIn className="w-4 h-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Manual Triage Gate Officer Action Card */}
                        {(activeTicket.requiresManualVerification || activeTicket.status === 'PENDING_MANUAL_TRIAGE' || activeTicket.isCivicIssue === false) && (
                          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5 shadow-xs">
                            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>Manual Triage Gate: Flagged Non-Civic Media</span>
                            </div>
                            <p className="text-xs text-amber-900 leading-relaxed">
                              {activeTicket.rejectionReason || 'Media was flagged during AI analysis as potentially non-civic or ambiguous. Officer verification required before crew dispatch.'}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  onUpdateIncidentStatus(
                                    activeTicket.id, 
                                    'OPEN', 
                                    undefined, 
                                    'Verified manually by officer. Approved for dispatch.',
                                    { requiresManualVerification: false, isCivicIssue: true }
                                  );
                                }}
                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve & Route</span>
                              </button>

                              <button
                                onClick={() => {
                                  onUpdateIncidentStatus(
                                    activeTicket.id, 
                                    'RESOLVED', 
                                    undefined, 
                                    'Dismissed during manual triage: Non-civic visual submission.',
                                    { requiresManualVerification: false, isCivicIssue: false }
                                  );
                                }}
                                className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>Dismiss</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 1-Click Crew Dispatch Drawer */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-teal-700" />
                              <span>1-Click Crew Dispatch:</span>
                            </label>
                            {activeTicket.assignedUnitName && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                Assigned: {activeTicket.assignedUnitName}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                            {units.map((u) => {
                              const isAssigned = activeTicket.assignedUnitId === u.id;
                              return (
                                <div
                                  key={u.id}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                                    isAssigned 
                                      ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs' 
                                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold truncate">{u.name}</p>
                                      <span className={`w-2 h-2 rounded-full ${
                                        u.status === 'AVAILABLE' ? 'bg-emerald-500' :
                                        u.status === 'EN_ROUTE' ? 'bg-blue-500' : 'bg-amber-500'
                                      }`} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">{u.vehicleType} • {u.status}</p>
                                  </div>
                                  <button
                                    onClick={() => onAssignCrew(activeTicket.id, u.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shadow-2xs ${
                                      isAssigned
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800'
                                    }`}
                                  >
                                    {isAssigned ? 'Assigned' : 'Dispatch'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <FileCheck className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs">No grievances found matching this filter.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Inspect & Resolve Trigger */}
              {!isRightCollapsed && activeTicket && (
                <div className="pt-3 border-t border-slate-100">
                  {activeTicket.status !== 'RESOLVED' ? (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Inspect, Verify Fix & Resolve Ticket</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Grievance Resolved & Verified</span>
                      </div>
                      {activeTicket.officerNotes && (
                        <p className="text-[11px] text-emerald-800 mt-1 italic">
                          "{activeTicket.officerNotes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* HIGH-RESOLUTION PHOTO LIGHTBOX MODAL */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9995] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 p-2 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-xs cursor-pointer"
                title="Open original in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-xs cursor-pointer"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Hazard High-Resolution Inspection"
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* RESOLVE GRIEVANCE MODAL */}
      {showResolveModal && activeTicket && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-[9999] bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 animate-in zoom-in-95 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verify Resolution & Close Ticket</span>
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Completion / Fix Photo URL</label>
                <input
                  type="text"
                  value={proofPhotoUrl}
                  onChange={(e) => setProofPhotoUrl(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              {proofPhotoUrl && (
                <div className="h-32 rounded-xl overflow-hidden border border-slate-200">
                  <img src={proofPhotoUrl} alt="Proof preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Engineer / Inspector Closure Note</label>
                <textarea
                  value={officerNoteInput}
                  onChange={(e) => setOfficerNoteInput(e.target.value)}
                  placeholder="e.g. Defect rectified according to standard Operating Procedure."
                  rows={2}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveTicket}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Confirm & Archive Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Admin & Operations Maintenance Modal */}
      {showSystemSettingsModal && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-[9999] bg-white rounded-2xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 space-y-5 animate-in zoom-in-95 font-sans">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">
                  <Settings className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">System Maintenance & Admin Tools</h3>
                  <p className="text-xs text-slate-500">Configure database datasets, demo seeding, and system status</p>
                </div>
              </div>
              <button
                onClick={() => setShowSystemSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Tool 1: Demo Data Seeding */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Baseline Demo Data Generator</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Safe Action</span>
                </div>
                <p className="text-xs text-slate-600">
                  Generates baseline demo incident complaints (potholes, garbage, streetlights) across municipal wards for live presentation & testing.
                </p>
                <button
                  onClick={() => {
                    setShowSystemSettingsModal(false);
                    handleSeedDemoData();
                  }}
                  disabled={isWipingDb || isSeedingDb}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSeedingDb ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isSeedingDb ? 'Seeding Demo Data...' : 'Seed Baseline Demo Data'}</span>
                </button>
              </div>

              {/* Tool 2: Sensitive Data Purge (Wipe) */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Purge All Database Complaints</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">Destructive</span>
                </div>
                <p className="text-xs text-slate-600">
                  Permanently deletes all grievance tickets from Firestore, leaving an empty database state for clean initialization.
                </p>
                <button
                  onClick={() => {
                    setShowSystemSettingsModal(false);
                    setShowWipeModal(true);
                  }}
                  disabled={isWipingDb || isSeedingDb}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Wipe Complaints Database</span>
                </button>
              </div>

              {/* System Telemetry Overview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Operational System Telemetry</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/70">
                  <div>
                    <span className="text-slate-500">Database:</span>{' '}
                    <strong className="text-slate-900">Firestore (Live)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Active Incidents:</span>{' '}
                    <strong className="text-slate-900">{incidents.length} Tickets</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Active Ward:</span>{' '}
                    <strong className="text-slate-900">{selectedWard}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">User Role:</span>{' '}
                    <strong className="text-teal-700">{userRoleLabel}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSystemSettingsModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Wipe All Complaints Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-[9999] bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 animate-in zoom-in-95 font-sans">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-200">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Wipe All Complaints?</h3>
                <p className="text-xs text-slate-500">Permanently clear database (Empty State)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              Permanently clear all complaints and leave the system empty for testing? This will delete all active grievance tickets from Firestore, clear field unit assignments, and set all municipal response units to <strong>AVAILABLE</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowWipeModal(false)}
                disabled={isWipingDb}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAllComplaints}
                disabled={isWipingDb}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isWipingDb ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isWipingDb ? 'Wiping...' : 'Yes, Wipe Everything'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {adminToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs animate-slide-up">
          <span>{adminToastMsg}</span>
        </div>
      )}
    </div>
  );
};
