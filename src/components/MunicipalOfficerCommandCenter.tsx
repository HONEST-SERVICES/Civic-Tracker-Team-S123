import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Crosshair, 
  CheckCircle, 
  FileCheck, 
  Camera, 
  ArrowRight, 
  Filter, 
  Shield, 
  Upload, 
  RefreshCw, 
  Send, 
  Sliders, 
  ChevronRight, 
  UserCheck, 
  LogOut, 
  Users, 
  Lock, 
  Crown,
  Layers,
  Map as MapIcon,
  User
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit, UnitStatus, DepartmentType, PriorityLevel, UserProfile } from '../types';
import { ZONES, SWACHHATA_CATEGORIES } from '../mockData';
import { GoogleTacticalMap } from './GoogleTacticalMap';
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
  onReRouteDepartment,
  onAdjustPriority,
  onLogout,
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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80');
  const [officerNoteInput, setOfficerNoteInput] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  // Sync ward if user profile changes
  useEffect(() => {
    if (currentUser?.assignedWard && !isSuperAdmin) {
      setSelectedWard(currentUser.assignedWard);
    }
  }, [currentUser, isSuperAdmin]);

  // Filter incidents for officer desk
  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus === 'OPEN' && inc.status === 'RESOLVED') return false;
    if (filterStatus === 'RESOLVED' && inc.status !== 'RESOLVED') return false;
    if (filterStatus === 'IN_PROGRESS' && (inc.status === 'OPEN' || inc.status === 'RESOLVED')) return false;
    if (filterDepartment !== 'ALL' && inc.department !== filterDepartment) return false;
    return true;
  });

  const activeTicket = selectedIncident || filteredIncidents[0];

  const handleResolveTicket = () => {
    if (!activeTicket) return;
    onUpdateIncidentStatus(activeTicket.id, 'RESOLVED', proofPhotoUrl, officerNoteInput || 'Work inspected and defect rectified according to MoHUA standard.');
    setShowResolveModal(false);
    setOfficerNoteInput('');
  };

  const selectedZoneObj = ZONES.find(z => z.name === selectedWard) || ZONES[0];

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden font-sans">
      {/* Officer Header Strip */}
      <div className="bg-[#2d7a70] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="CivicPulse" 
            className="w-8 h-8 object-contain rounded-lg flex-shrink-0 bg-white/10 p-0.5 border border-white/25"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm leading-tight">
                {isSuperAdmin ? 'CivicPulse Apex Command HQ' : 'CivicPulse Ward Command Desk'}
              </h2>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white">
                {currentUser?.designation || (isSuperAdmin ? 'Joint Secretary, MoHUA' : 'Ward Assistant Engineer')}
              </span>
            </div>
            <p className="text-[11px] text-teal-100">
              Logged in: <strong className="text-white">{currentUser?.name || 'Officer'}</strong> • {isSuperAdmin ? 'Full Jurisdiction Access' : `Assigned: ${selectedWard}`}
            </p>
          </div>
        </div>

        {/* Center Workspace Tab Navigation for Super Admin & Officers */}
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('COMMAND_DESK')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'COMMAND_DESK'
                ? 'bg-white text-[#2d7a70] shadow-xs'
                : 'text-teal-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>GIS Command Map</span>
          </button>

          {hasWardManagePerm && (
            <button
              onClick={() => setActiveTab('WARD_CONFIG')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'WARD_CONFIG'
                  ? 'bg-white text-[#2d7a70] shadow-xs'
                  : 'text-teal-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ward Config & Governance</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white text-[#2d7a70] shadow-xs'
                : 'text-teal-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </div>

        {/* Quick Ward / Action Switchers */}
        <div className="flex items-center gap-2 text-xs">
          {/* Ward Switcher: Super Admin can switch any ward */}
          <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10">
            <MapPin className="w-3.5 h-3.5 text-teal-200" />
            <span className="text-[11px] text-teal-200">Ward:</span>
            {isSuperAdmin ? (
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="bg-transparent font-bold text-white focus:outline-hidden cursor-pointer text-xs"
              >
                {ZONES.map((z) => (
                  <option key={z.name} value={z.name} className="bg-slate-900 text-white">
                    {z.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-white">{selectedWard}</span>
            )}
          </div>

          {/* Manage Ward Staff & RBAC Trigger (Officers & Super Admin) */}
          {onOpenStaffManagement && (
            <button
              onClick={onOpenStaffManagement}
              className="h-8 px-2.5 rounded-lg bg-teal-800/80 hover:bg-teal-900 border border-teal-400/40 text-teal-100 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              title="Manage Ward Staff & RBAC Delegations"
            >
              <Users className="w-3.5 h-3.5 text-teal-300" />
              <span className="hidden sm:inline">Manage Staff</span>
            </button>
          )}

          {/* Logout switch back to Citizen */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="h-8 px-3 rounded-lg bg-white text-[#2d7a70] hover:bg-teal-50 font-bold shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch to Citizen</span>
            </button>
          )}
        </div>
      </div>

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

      {/* RENDER TAB 3: OPERATIONAL GIS COMMAND MAP & ACTION DESK (BALANCED 3-COLUMN DESKTOP WORKSPACE) */}
      {activeTab === 'COMMAND_DESK' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* COLUMN 1 / LEFT (25% Width): Navigation, Ward/Zone Selector, Status & Dept Filters, Live KPI Counters */}
          <div className="w-full lg:w-72 xl:w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto z-10 shadow-xs">
            <div className="p-4 space-y-4">
              
              {/* Jurisdiction & Zone Header Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2d7a70]" />
                    Jurisdiction Zone
                  </span>
                  <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full border border-teal-300">
                    Live Active
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedWard}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Officer In-Charge: <strong>{currentUser?.name || 'Assistant Engineer'}</strong>
                  </p>
                </div>
              </div>

              {/* Live KPI Summary Matrix */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Ward Live Telemetry & KPIs
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-medium text-slate-500">Total Registered</p>
                    <p className="text-lg font-extrabold text-slate-900 mt-0.5">{incidents.length}</p>
                    <span className="text-[10px] text-teal-700 font-semibold">100% Synced</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <p className="text-[10px] font-medium text-rose-700">Open / Pending</p>
                    <p className="text-lg font-extrabold text-rose-900 mt-0.5">
                      {incidents.filter(i => i.status === 'OPEN').length}
                    </p>
                    <span className="text-[10px] text-rose-600 font-semibold">Needs Dispatch</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-medium text-amber-700">In Progress</p>
                    <p className="text-lg font-extrabold text-amber-900 mt-0.5">
                      {incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DISPATCHED').length}
                    </p>
                    <span className="text-[10px] text-amber-600 font-semibold">Crews on Field</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] font-medium text-emerald-700">Resolved Today</p>
                    <p className="text-lg font-extrabold text-emerald-900 mt-0.5">
                      {incidents.filter(i => i.status === 'RESOLVED').length}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Verified SOP</span>
                  </div>
                </div>
              </div>

              {/* Status Filter Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Status Filter</span>
                  <span className="text-slate-400 font-normal font-mono">{filteredIncidents.length} shown</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                        filterStatus === st
                          ? 'bg-[#2d7a70] text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {st === 'ALL' ? 'All Tickets' : st === 'OPEN' ? 'Open (Pending)' : st === 'IN_PROGRESS' ? 'Dispatched' : 'Resolved'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Municipal Department
                </label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Civic Departments</option>
                  <option value="Solid Waste Management">Solid Waste Management</option>
                  <option value="Sanitation & Public Health">Sanitation & Public Health</option>
                  <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                  <option value="Electrical & Streetlights">Electrical & Streetlights</option>
                  <option value="Water Supply & Drainage">Water Supply & Drainage</option>
                </select>
              </div>

              {/* Action Shortcuts */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {onOpenStaffManagement && (
                  <button
                    onClick={onOpenStaffManagement}
                    className="w-full h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200"
                  >
                    <Users className="w-3.5 h-3.5 text-[#2d7a70]" />
                    <span>Manage Ward Staff & RBAC</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2 / CENTER (45% Width): Interactive Geospatial Map (Google Maps / GIS Layer) */}
          <div className="w-full lg:flex-1 h-80 lg:h-full relative bg-slate-200 border-r border-slate-200 flex flex-col min-w-0">
            {/* GIS Top Status Overlay */}
            <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2.5 text-xs text-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-bold">GIS Live Tactical View:</span>
              <span className="font-semibold text-slate-600">{selectedWard}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500 font-mono">{filteredIncidents.length} Markers</span>
            </div>

            <GoogleTacticalMap
              incidents={filteredIncidents}
              units={units}
              selectedIncident={selectedIncident}
              onSelectIncident={onSelectIncident}
              onSelectUnit={onSelectUnit}
              onUpdateIncidentStatus={(id, st) => onUpdateIncidentStatus(id, st)}
              activeZoneCenter={{ lat: selectedZoneObj.lat, lng: selectedZoneObj.lng }}
            />
          </div>

          {/* COLUMN 3 / RIGHT (30% Width): Live Incident Feed & Action Panel */}
          <div className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col flex-shrink-0 h-full border-l border-slate-200 overflow-y-auto">
            
            {/* Incident Feed Header */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#2d7a70]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Incident Action Desk
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#2d7a70] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {filteredIncidents.length} in Queue
              </span>
            </div>

            {/* Quick Ticket Selector Carousel / List */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex gap-2 overflow-x-auto no-scrollbar">
              {filteredIncidents.slice(0, 8).map((ticket) => {
                const isSelected = activeTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => onSelectIncident(ticket)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-[#2d7a70] text-white border-[#2d7a70] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {ticket.id}
                  </button>
                );
              })}
            </div>

            {/* Active Ticket Details & Action Panel */}
            {activeTicket ? (
              <div className="p-4 space-y-4 flex-1">
                {/* Ticket Header & Status Pill */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-[#2d7a70]">{activeTicket.id}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug break-words">
                        {activeTicket.title}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{activeTicket.location.address}</span>
                      </p>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      activeTicket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                      activeTicket.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                      activeTicket.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {activeTicket.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] pt-1 border-t border-slate-200/60 text-slate-600">
                    <span className="font-semibold">Dept: <span className="text-slate-900 font-bold">{activeTicket.department}</span></span>
                    <span>•</span>
                    <span className="font-semibold">Priority: <span className="text-slate-900 font-bold">{activeTicket.priority}</span></span>
                    <span>•</span>
                    <span>Reporter: <strong>{activeTicket.reporterName || 'Citizen'}</strong></span>
                  </div>
                </div>

                {/* Complaint Photo & Vision Scan */}
                {activeTicket.imageUrl && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Citizen Geo-Photo Attachment:</label>
                    <div className="h-44 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-900 shadow-inner">
                      <img
                        src={activeTicket.imageUrl}
                        alt="Hazard"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {/* AI / Gemini Assessment Notes */}
                {activeTicket.aiSummary && (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1 text-xs text-slate-800">
                    <div className="flex items-center gap-1 text-[#2d7a70] font-bold">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Swachhata Automated Triage Assessment</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{activeTicket.aiSummary}</p>
                  </div>
                )}

                {/* Action 1: Assign Municipal Field Unit */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#2d7a70]" />
                      <span>Dispatch / Assign Field Crew Unit:</span>
                    </label>
                    {activeTicket.assignedUnitName && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Assigned: {activeTicket.assignedUnitName}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {units.map((u) => {
                      const isAssigned = activeTicket.assignedUnitId === u.id;
                      return (
                        <div
                          key={u.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition ${
                            isAssigned 
                              ? 'bg-teal-50 border-[#2d7a70] text-[#2d7a70]' 
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{u.vehicleType} • Status: {u.status}</p>
                          </div>
                          <button
                            onClick={() => onAssignCrew(activeTicket.id, u.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                              isAssigned
                                ? 'bg-[#2d7a70] text-white'
                                : 'bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700'
                            }`}
                          >
                            {isAssigned ? 'Assigned' : 'Dispatch'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action 2: Inspect & Resolve Grievance with Proof */}
                {activeTicket.status !== 'RESOLVED' ? (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Inspect, Verify Fix & Resolve Ticket</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Grievance Resolved & Verified</span>
                    </div>
                    {activeTicket.proofOfFixUrl && (
                      <div className="mt-2 h-28 rounded-lg overflow-hidden border border-emerald-200">
                        <img src={activeTicket.proofOfFixUrl} alt="Proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {activeTicket.officerNotes && (
                      <p className="text-[11px] text-emerald-800 mt-1 italic">
                        "{activeTicket.officerNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No grievances found matching this filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESOLVE GRIEVANCE MODAL */}
      {showResolveModal && activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verify Resolution & Close Ticket</span>
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Completion / Fix Photo URL</label>
                <input
                  type="text"
                  value={proofPhotoUrl}
                  onChange={(e) => setProofPhotoUrl(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              {proofPhotoUrl && (
                <div className="h-32 rounded-lg overflow-hidden border border-slate-200">
                  <img src={proofPhotoUrl} alt="Proof preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Engineer / Inspector Closure Note</label>
                <textarea
                  value={officerNoteInput}
                  onChange={(e) => setOfficerNoteInput(e.target.value)}
                  placeholder="e.g. Defect rectified according to MoHUA Standard Operating Procedure."
                  rows={2}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveTicket}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
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
