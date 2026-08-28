import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
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
  LogOut
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit, UnitStatus, DepartmentType, PriorityLevel } from '../types';
import { ZONES, SWACHHATA_CATEGORIES } from '../mockData';

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
  onLogout
}) => {
  const [selectedWard, setSelectedWard] = useState<string>('Ward 4 - Central Zone');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80');
  const [officerNoteInput, setOfficerNoteInput] = useState<string>('');
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.253, 75.703],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    mapInstanceRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Map Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;

    if (!map || !markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    // Draw Ward Sector Boundaries
    ZONES.forEach((zone) => {
      const isSelectedWard = zone.name === selectedWard;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: isSelectedWard ? '#2d7a70' : '#94a3b8',
        fillColor: isSelectedWard ? '#2d7a70' : '#cbd5e1',
        fillOpacity: isSelectedWard ? 0.08 : 0.03,
        weight: isSelectedWard ? 2 : 1,
        dashArray: '4, 4',
      }).addTo(markersGroup);

      const zoneLabel = L.divIcon({
        html: `<div class="text-[10px] font-bold ${isSelectedWard ? 'text-[#2d7a70] bg-teal-50 border-teal-300' : 'text-slate-500 bg-white border-slate-200'} px-2 py-0.5 rounded shadow-xs border whitespace-nowrap">${zone.name}</div>`,
        className: 'zone-label-icon',
        iconSize: [100, 20],
        iconAnchor: [50, 10],
      });
      L.marker([zone.lat, zone.lng], { icon: zoneLabel }).addTo(markersGroup);
    });

    // Add Incident Markers
    incidents.forEach((inc) => {
      const isSelected = selectedIncident?.id === inc.id;
      const isResolved = inc.status === 'RESOLVED';
      const isCritical = inc.priority === 'P1_CRITICAL';

      const iconHtml = `
        <div class="relative cursor-pointer transition-all ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white ${
            isResolved
              ? 'bg-emerald-600 text-white'
              : isCritical
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-[#2d7a70] text-white'
          }">
            ${isResolved ? '✓' : isCritical ? '!' : '●'}
          </div>
          ${isSelected ? '<div class="absolute -inset-1 rounded-full border-2 border-[#2d7a70] animate-ping"></div>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-incident-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([inc.location.lat, inc.location.lng], { icon: customIcon })
        .addTo(markersGroup)
        .on('click', () => {
          onSelectIncident(inc);
        });

      // If incident has an assigned crew, draw dispatch route
      if (inc.assignedUnitId && inc.status !== 'RESOLVED') {
        const assignedCrew = units.find((u) => u.id === inc.assignedUnitId);
        if (assignedCrew) {
          L.polyline(
            [
              [assignedCrew.lat, assignedCrew.lng],
              [inc.location.lat, inc.location.lng],
            ],
            {
              color: '#2d7a70',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.8,
            }
          ).addTo(routesGroup);
        }
      }
    });

    // Add Unit (Vehicle) Markers
    units.forEach((unit) => {
      const isSelected = selectedUnit?.id === unit.id;
      const isEnRoute = unit.status === 'EN_ROUTE';

      const unitIconHtml = `
        <div class="relative cursor-pointer transition-transform ${isSelected ? 'scale-125 z-40' : 'hover:scale-110'}">
          <div class="w-7 h-7 rounded-lg bg-slate-900 border-2 border-white text-white flex items-center justify-center shadow-md text-xs">
            🚛
          </div>
          ${isEnRoute ? '<span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: unitIconHtml,
        className: 'custom-unit-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([unit.lat, unit.lng], { icon: customIcon })
        .addTo(markersGroup)
        .on('click', () => {
          onSelectUnit(unit);
        });
    });
  }, [incidents, units, selectedIncident, selectedUnit, selectedWard]);

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

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden font-sans">
      {/* Officer Header Strip */}
      <div className="bg-[#2d7a70] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                Ward 4 Officer Command Desk
              </span>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                Active Session
              </span>
            </div>
            <p className="text-[11px] text-teal-100 truncate">
              Asst. Engineer Donald Miller / Sanitary Insp. Sarah Alverez • MoHUA Grievance Cell
            </p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Ward Jurisdiction */}
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="h-8 px-2.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white font-medium focus:outline-none cursor-pointer"
          >
            {ZONES.map((z) => (
              <option key={z.id} value={z.name} className="text-slate-900 bg-white">
                {z.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="h-8 px-2.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="text-slate-900 bg-white">All Departments</option>
            <option value="PUBLIC_WORKS" className="text-slate-900 bg-white">Public Works (PWD)</option>
            <option value="SANITATION" className="text-slate-900 bg-white">Sanitation / SBM</option>
            <option value="WATER_SUPPLY" className="text-slate-900 bg-white">Water Supply Board</option>
            <option value="ELECTRICITY" className="text-slate-900 bg-white">Electricity Wing</option>
          </select>

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
          {/* Map Status Bar */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 pointer-events-auto text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-900">{selectedWard}</span>
              <span className="text-slate-400">|</span>
              <span>{filteredIncidents.length} Grievances</span>
            </div>

            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([31.253, 75.703], 14);
                }
              }}
              className="bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 pointer-events-auto cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#2d7a70]" />
              <span>Recenter Ward</span>
            </button>
          </div>

          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 text-[11px] text-slate-700 z-10">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              <span>P1 Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2d7a70]"></span>
              <span>P2 Urgent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>Resolved</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🚛</span>
              <span>Field Crew</span>
            </div>
          </div>
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
            <span className="text-xs text-slate-500 font-semibold">
              {filteredIncidents.length} Items
            </span>
          </div>

          {/* Selected Incident Action Drawer / Detail */}
          {activeTicket ? (
            <div className="p-4 space-y-4 flex-1">
              {/* Card Header with ID & Priority */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                      <span className="font-mono text-[#2d7a70] font-bold">{activeTicket.id}</span>
                      <span>•</span>
                      <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {activeTicket.department || 'PUBLIC_WORKS'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {activeTicket.title}
                    </h3>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    activeTicket.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeTicket.priority === 'P1_CRITICAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activeTicket.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                  <p className="flex items-center gap-1 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-[#2d7a70] flex-shrink-0" />
                    <span className="font-medium truncate">{activeTicket.location.address}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 pl-4.5">
                    Reported by: <strong className="text-slate-700">{activeTicket.reporterName || 'Citizen'}</strong>
                  </p>
                </div>

                {activeTicket.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-32">
                    <img
                      src={activeTicket.imageUrl}
                      alt={activeTicket.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                      Citizen Photolog
                    </span>
                  </div>
                )}
              </div>

              {/* Area-Wise Assignment & Officer Work Order Controls */}
              <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#2d7a70]" />
                  <span>Ward Officer Actions</span>
                </h4>

                {/* 1. Field Crew Assignment */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Field Engineering Crew:
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {units.map((unit) => {
                      const isAssigned = activeTicket.assignedUnitId === unit.id;
                      return (
                        <div
                          key={unit.id}
                          onClick={() => onAssignCrew(activeTicket.id, unit.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                            isAssigned
                              ? 'bg-teal-50 border-[#2d7a70] text-[#2d7a70] font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold truncate">{unit.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{unit.driverCrew}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isAssigned ? 'bg-[#2d7a70] text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isAssigned ? 'Assigned' : 'Dispatch'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Re-Route Department & Priority Adjustments */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Department:
                    </label>
                    <select
                      value={activeTicket.department || 'PUBLIC_WORKS'}
                      onChange={(e) => onReRouteDepartment?.(activeTicket.id, e.target.value as DepartmentType)}
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="PUBLIC_WORKS">Public Works (PWD)</option>
                      <option value="SANITATION">Sanitation / SBM</option>
                      <option value="WATER_SUPPLY">Water Supply</option>
                      <option value="ELECTRICITY">Electricity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Priority:
                    </label>
                    <select
                      value={activeTicket.priority}
                      onChange={(e) => onAdjustPriority?.(activeTicket.id, e.target.value as PriorityLevel)}
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="P1_CRITICAL">P1 - Critical</option>
                      <option value="P2_URGENT">P2 - Urgent</option>
                      <option value="P3_SCHEDULED">P3 - Scheduled</option>
                    </select>
                  </div>
                </div>

                {/* 3. Status Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  {activeTicket.status !== 'RESOLVED' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUpdateIncidentStatus(activeTicket.id, 'IN_PROGRESS')}
                        className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Mark In Remediation</span>
                      </button>

                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Resolve & Proof</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold">Ticket Resolved & Photologged</span>
                      </div>
                      <button
                        onClick={() => onUpdateIncidentStatus(activeTicket.id, 'OPEN')}
                        className="text-[11px] text-slate-600 underline hover:text-slate-900 cursor-pointer"
                      >
                        Reopen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Incidents Quick Selection Carousel */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-700">Grievance Backlog ({filteredIncidents.length})</p>
                <div className="space-y-2">
                  {filteredIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        activeTicket.id === inc.id
                          ? 'bg-teal-50/50 border-[#2d7a70]'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">{inc.id}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{inc.location.zone}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate mt-0.5">{inc.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No grievances found in selected filter.
            </div>
          )}
        </div>
      </div>

      {/* RESOLUTION & PROOF OF FIX MODAL */}
      {showResolveModal && activeTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#2d7a70] p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Upload Proof of Fix & Resolve</h3>
                <p className="text-xs text-teal-100">{activeTicket.id} • {activeTicket.title}</p>
              </div>
              <button
                onClick={() => setShowResolveModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Proof of Work / Resolved Photolog:
                </label>
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-36">
                  <img
                    src={proofPhotoUrl}
                    alt="Proof preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 left-2 bg-emerald-700/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Resolution Photolog</span>
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Officer Inspection Note:
                </label>
                <textarea
                  value={officerNoteInput}
                  onChange={(e) => setOfficerNoteInput(e.target.value)}
                  placeholder="e.g. Defect rectified by Ward 4 Crew. Cold/Hot bitumen screed leveled and compacted. Cleaned site."
                  className="w-full h-20 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d7a70]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResolveTicket}
                  className="flex-1 h-10 rounded-xl bg-[#2d7a70] hover:bg-[#23635b] text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Resolution</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
