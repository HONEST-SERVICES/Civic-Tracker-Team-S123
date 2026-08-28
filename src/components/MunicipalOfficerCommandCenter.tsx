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
  Crown
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit, UnitStatus, DepartmentType, PriorityLevel, UserProfile } from '../types';
import { ZONES, SWACHHATA_CATEGORIES } from '../mockData';
import { GoogleTacticalMap } from './GoogleTacticalMap';

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
  onOpenStaffManagement
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const defaultWard = currentUser?.assignedWard || 'Ward 4 - Central Zone';
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
          <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white">
            {isSuperAdmin ? <Crown className="w-4 h-4 text-amber-300" /> : <Building2 className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm leading-tight">
                {isSuperAdmin ? 'National Apex Command HQ' : 'Ward Inspection & Remediation Desk'}
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

      {/* Main Split Layout: Map (Left/Center) + Officer Action Panel (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
        {/* Left Side: Geospatial GIS Ward Map */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full relative bg-slate-200 border-r border-slate-200">
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

        {/* Right Side: Grievance Queue & Officer Action Workspace */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-white border-l border-slate-200 overflow-y-auto">
          {/* Status Filter Tabs */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#2d7a70] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'OPEN' ? 'Open' : st === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 font-mono font-medium">
              {filteredIncidents.length} Tickets
            </span>
          </div>

          {/* Active Ticket Detail Box */}
          {activeTicket ? (
            <div className="p-4 space-y-4 flex-1">
              {/* Ticket Header & Status Pill */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#2d7a70]">{activeTicket.id}</span>
                    <h3 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug">
                      {activeTicket.title}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    activeTicket.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : activeTicket.priority === 'P1_CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {activeTicket.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {activeTicket.description}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Location:</span>
                    <span className="font-medium text-slate-800 truncate block">{activeTicket.location.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Department:</span>
                    <span className="font-medium text-slate-800 truncate block">{activeTicket.department}</span>
                  </div>
                </div>
              </div>

              {/* Photo Evidence & AI Vision Tag */}
              {activeTicket.imageUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold">Citizen Geo-Tagged Photo</span>
                    <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      Gemini 2.5 Flash Verified
                    </span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-40 group">
                    <img
                      src={activeTicket.imageUrl}
                      alt={activeTicket.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              {/* Crew Dispatch & Assignment Action */}
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#2d7a70]" />
                    <span>Assign Field Remediation Crew</span>
                  </span>
                  {activeTicket.assignedUnitName && (
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      Assigned: {activeTicket.assignedUnitName}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">Select Available Ward Crew:</label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {units.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => {
                          onAssignCrew(activeTicket.id, unit.id);
                        }}
                        className={`p-2 rounded-lg border text-left text-xs flex items-center justify-between transition cursor-pointer ${
                          activeTicket.assignedUnitId === unit.id
                            ? 'bg-[#2d7a70] text-white border-[#2d7a70]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{unit.name}</p>
                          <p className={`text-[10px] ${activeTicket.assignedUnitId === unit.id ? 'text-teal-100' : 'text-slate-500'}`}>
                            {unit.crewType} • {unit.status}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          activeTicket.assignedUnitId === unit.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {activeTicket.assignedUnitId === unit.id ? 'Active' : 'Dispatch'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Update & Closure Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateIncidentStatus(activeTicket.id, 'IN_PROGRESS')}
                    disabled={activeTicket.status === 'IN_PROGRESS' || activeTicket.status === 'RESOLVED'}
                    className="flex-1 h-9 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition disabled:opacity-40 cursor-pointer"
                  >
                    Mark In Progress
                  </button>

                  <button
                    onClick={() => setShowResolveModal(true)}
                    disabled={activeTicket.status === 'RESOLVED'}
                    className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolve & Close Ticket</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2 flex-1 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-semibold">No complaints match current filters</p>
            </div>
          )}

          {/* Grievance Quick List */}
          <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2 max-h-56 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ward 4 Ticket Queue ({filteredIncidents.length})
            </h4>
            <div className="space-y-1.5">
              {filteredIncidents.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectIncident(t)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                    activeTicket?.id === t.id
                      ? 'bg-teal-50 border-[#2d7a70]'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-slate-800 truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{t.location.address}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : t.priority === 'P1_CRITICAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Proof of Fix & Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Upload Proof of Fix & Close Grievance</span>
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proof of Work Photo URL</label>
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
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
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
