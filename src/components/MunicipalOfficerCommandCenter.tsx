import React, { useEffect, useState } from 'react';
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
  LogOut,
  Eye,
  Radio,
  AlertTriangle
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit, UnitStatus, DepartmentType, PriorityLevel, UserProfile } from '../types';
import { ZONES } from '../mockData';
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
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status'], proofUrl?: string, notes?: string) => void;
  onUpdateUnitStatus: (unitId: string, status: UnitStatus) => void;
  onAssignCrew: (incidentId: string, unitId: string) => void;
  onReRouteDepartment?: (incidentId: string, dept: DepartmentType) => void;
  onAdjustPriority?: (incidentId: string, priority: PriorityLevel) => void;
  onLogout?: () => void;
  onSwitchToCitizen?: () => void;
  currentUser?: UserProfile | null;
  onOpenStaffManagement?: () => void;
  onOpenProfile?: () => void;
  initialTab?: 'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE';
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
  initialTab = 'COMMAND_DESK'
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const hasWardManagePerm = isSuperAdmin || (currentUser?.permissions?.includes('MANAGE_WARDS') || currentUser?.permissions?.includes('ALL_ACCESS'));
  const defaultWard = currentUser?.assignedWard || 'Ward 4 - Central Zone';
  const [activeTab, setActiveTab] = useState<'COMMAND_DESK' | 'WARD_CONFIG' | 'PROFILE'>(initialTab);
  const [selectedWard, setSelectedWard] = useState<string>(defaultWard);
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'PENDING_MANUAL_TRIAGE'>('ALL');
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80');
  const [officerNoteInput, setOfficerNoteInput] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  // Sync ward if user profile changes
  useEffect(() => {
    if (currentUser?.assignedWard && !isSuperAdmin) {
      setSelectedWard(currentUser.assignedWard);
    }
  }, [currentUser, isSuperAdmin]);

  // Count manual triage items
  const manualTriageCount = incidents.filter(i => i.requiresManualVerification || i.status === 'PENDING_MANUAL_TRIAGE' || i.isCivicIssue === false).length;

  // Filter incidents for officer desk
  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus === 'PENDING_MANUAL_TRIAGE') {
      return Boolean(inc.requiresManualVerification || inc.status === 'PENDING_MANUAL_TRIAGE' || inc.isCivicIssue === false);
    }
    if (filterStatus === 'OPEN' && (inc.status === 'RESOLVED' || inc.status === 'PENDING_MANUAL_TRIAGE')) return false;
    if (filterStatus === 'RESOLVED' && inc.status !== 'RESOLVED') return false;
    if (filterStatus === 'IN_PROGRESS' && (inc.status === 'OPEN' || inc.status === 'RESOLVED' || inc.status === 'PENDING_MANUAL_TRIAGE')) return false;
    if (filterDepartment !== 'ALL' && inc.department !== filterDepartment) return false;
    return true;
  });

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
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden font-sans select-none">
      
      {/* 1. STREAMLINED TOP GOVTECH HEADER (SINGLE PURE WHITE BAR) */}
      <header className="bg-white border-b border-slate-200/90 h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs flex-shrink-0 z-30">
        {/* Left: CivicPulse Brand, Title & User Pill */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="CivicPulse" 
              className="w-8 h-8 object-contain rounded-lg flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-tight truncate">
                CivicPulse Command HQ
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                <span>GovTech Operations Matrix</span>
              </div>
            </div>
          </div>

          {/* User Info Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="text-slate-900 font-bold">{userDisplayName}</span>
            <span className="text-slate-400">•</span>
            <span className="text-teal-700">{userRoleLabel}</span>
          </div>
        </div>

        {/* Center: View Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('COMMAND_DESK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'COMMAND_DESK'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 text-teal-600" />
            <span>GIS Command Map</span>
          </button>

          {hasWardManagePerm && (
            <button
              onClick={() => setActiveTab('WARD_CONFIG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'WARD_CONFIG'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Ward Governance</span>
            </button>
          )}

          <button
            onClick={() => onOpenProfile ? onOpenProfile() : setActiveTab('PROFILE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-600" />
            <span>Profile</span>
          </button>
        </div>

        {/* Right: Ward Selector, Manage Staff & Switch to Citizen */}
        <div className="flex items-center gap-2 text-xs">
          {/* Ward Selector */}
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

          {/* Manage Staff Trigger */}
          {onOpenStaffManagement && (
            <button
              onClick={onOpenStaffManagement}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              title="Manage Ward Staff & RBAC Delegations"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden lg:inline">Manage Staff</span>
            </button>
          )}

          {/* Switch back to Citizen View (No Logout) */}
          {(onSwitchToCitizen || onLogout) && (
            <button
              onClick={onSwitchToCitizen || onLogout}
              className="h-9 px-3 sm:px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              title="View App as a Citizen without logging out"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Switch to Citizen</span>
            </button>
          )}
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

      {/* RENDER TAB 3: OPERATIONAL 3-COLUMN DESKTOP GRID */}
      {activeTab === 'COMMAND_DESK' && (
        <div className="h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-slate-100 text-slate-900 overflow-hidden">
          
          {/* COLUMN 1: LEFT FILTERS & KPIS (3 Cols) */}
          <div className="col-span-12 lg:col-span-3 h-full flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm overflow-y-auto">
            <div className="space-y-4">
              {/* Jurisdiction Zone Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    Jurisdiction Zone
                  </span>
                  <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                    Live Active
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedWard}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    In-Charge: <strong className="text-slate-800">{userDisplayName}</strong>
                  </p>
                </div>
              </div>

              {/* Live KPI Summary Matrix */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Ward Live Telemetry & KPIs
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Logged</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">{incidents.length}</p>
                    <span className="text-[10px] text-teal-700 font-semibold">100% Synced</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <p className="text-[10px] font-semibold text-rose-700 uppercase">Open / Pending</p>
                    <p className="text-xl font-extrabold text-rose-900 mt-0.5">
                      {incidents.filter(i => i.status === 'OPEN').length}
                    </p>
                    <span className="text-[10px] text-rose-600 font-semibold">Needs Dispatch</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-semibold text-amber-700 uppercase">In Progress</p>
                    <p className="text-xl font-extrabold text-amber-900 mt-0.5">
                      {incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DISPATCHED').length}
                    </p>
                    <span className="text-[10px] text-amber-600 font-semibold">Crews Active</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Resolved</p>
                    <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
                      {incidents.filter(i => i.status === 'RESOLVED').length}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Verified SOP</span>
                  </div>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Status Filter</span>
                  <span className="text-slate-400 font-mono text-[10px]">{filteredIncidents.length} shown</span>
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
                      {st === 'ALL' ? 'All Tickets' : st === 'OPEN' ? 'Open (Pending)' : st === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
                    </button>
                  ))}
                </div>

                {/* Dedicated Manual Verification Queue Trigger */}
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
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
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

            {/* Bottom Action Trigger */}
            {onOpenStaffManagement && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={onOpenStaffManagement}
                  className="w-full h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200"
                >
                  <Users className="w-3.5 h-3.5 text-teal-700" />
                  <span>Manage Ward Staff & RBAC</span>
                </button>
              </div>
            )}
          </div>

          {/* COLUMN 2: CENTER MAP & LIVE INCIDENT TABLE (5 Cols) */}
          <div className="col-span-12 lg:col-span-5 h-full flex flex-col gap-4 overflow-hidden">
            {/* Top 55% Height: Interactive GIS Tactical Map */}
            <div className="h-[55%] min-h-0 w-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative bg-slate-100">
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

            {/* Bottom 45% Height: Live Incident Queue table */}
            <div className="h-[45%] min-h-0 w-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white flex flex-col">
              <LiveIncidentQueue
                incidents={filteredIncidents}
                selectedIncident={selectedIncident}
                onSelectIncident={onSelectIncident}
                onUpdateIncidentStatus={onUpdateIncidentStatus}
              />
            </div>
          </div>

          {/* COLUMN 3: RIGHT INCIDENT ACTION DESK (4 Cols) */}
          <div className="col-span-12 lg:col-span-4 h-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Incident Action Desk
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  {filteredIncidents.length} in Queue
                </span>
              </div>

              {/* Quick Ticket Selector Carousel */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {filteredIncidents.slice(0, 8).map((ticket) => {
                  const isSelected = activeTicket?.id === ticket.id;
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => onSelectIncident(ticket)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-sm border border-blue-600'
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
                <div className="space-y-3.5">
                  {/* Ticket Header & Status Pill */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
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

                  {/* Photo Attachment Container */}
                  {activeTicket.imageUrl && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Citizen Geo-Photo Attachment:</label>
                      <div className="h-40 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-900 shadow-xs">
                        <img
                          src={activeTicket.imageUrl}
                          alt="Hazard"
                          className="max-h-48 w-full object-cover rounded-xl border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Triage Gate Officer Action Card */}
                  {(activeTicket.requiresManualVerification || activeTicket.status === 'PENDING_MANUAL_TRIAGE' || activeTicket.isCivicIssue === false) && (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 shadow-xs">
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
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Route Ticket</span>
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
                          className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Dismiss Non-Civic Image</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Field Crew Assignment Section */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-teal-700" />
                        <span>Dispatch / Assign Field Crew:</span>
                      </label>
                      {activeTicket.assignedUnitName && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
                            className={`p-2 rounded-xl border text-xs flex items-center justify-between transition ${
                              isAssigned 
                                ? 'bg-teal-50 border-teal-500 text-teal-900' 
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold truncate">{u.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{u.vehicleType} • {u.status}</p>
                            </div>
                            <button
                              onClick={() => onAssignCrew(activeTicket.id, u.id)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                                isAssigned
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700'
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
              <div className="pt-3 border-t border-slate-100">
                {activeTicket.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
      )}

      {/* RESOLVE GRIEVANCE MODAL */}
      {showResolveModal && activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in">
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
    </div>
  );
};
