import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Navigation, 
  AlertTriangle, 
  Clock, 
  Truck, 
  Crosshair,
  Filter,
  CheckCircle2,
  X,
  Sparkles,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit } from '../types';
import { ZONES } from '../mockData';
import { LiveIncidentQueue } from './LiveIncidentQueue';

interface TacticalGeospatialMapProps {
  incidents: CrisisIncident[];
  units: MunicipalUnit[];
  selectedIncident: CrisisIncident | null;
  onSelectIncident: (incident: CrisisIncident | null) => void;
  onSelectUnit: (unit: MunicipalUnit | null) => void;
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status']) => void;
  activeZoneCenter?: { lat: number; lng: number } | null;
}

export const TacticalGeospatialMap: React.FC<TacticalGeospatialMapProps> = ({
  incidents,
  units,
  selectedIncident,
  onSelectIncident,
  onSelectUnit,
  onUpdateIncidentStatus,
  activeZoneCenter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3' | 'CREWS'>('ALL');

  // Initialize Leaflet Map with clean road tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center coordinates for municipal grid (Lat: 31.253, Lng: 75.703)
    const map = L.map(mapContainerRef.current, {
      center: [31.253, 75.703],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // Clean Dark Matter Basemap without distorting filters
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map center when active zone changes
  useEffect(() => {
    if (mapInstanceRef.current && activeZoneCenter) {
      mapInstanceRef.current.flyTo([activeZoneCenter.lat, activeZoneCenter.lng], 15, {
        duration: 1.2
      });
    }
  }, [activeZoneCenter]);

  // Update Markers & Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;

    if (!map || !markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    // Draw Municipal Zone Boundaries (Subtle circles)
    ZONES.forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: 650,
        color: '#334155',
        weight: 1.5,
        fillColor: '#1e293b',
        fillOpacity: 0.1,
        dashArray: '3, 4'
      });
      markersGroup.addLayer(circle);
    });

    // Draw Incidents with Clean Pin Badges
    incidents.forEach((inc) => {
      if (activeFilter === 'P1' && inc.priority !== 'P1_CRITICAL') return;
      if (activeFilter === 'P2' && inc.priority !== 'P2_URGENT') return;
      if (activeFilter === 'P3' && inc.priority !== 'P3_SCHEDULED') return;
      if (activeFilter === 'CREWS') return;

      const isP1 = inc.priority === 'P1_CRITICAL';
      const isP2 = inc.priority === 'P2_URGENT';
      const isResolved = inc.status === 'RESOLVED';
      const isSelected = selectedIncident?.id === inc.id;

      let colorBadge = 'bg-blue-600 border-blue-400 text-white';
      if (isP1) {
        colorBadge = 'bg-red-600 border-red-400 text-white';
      } else if (isP2) {
        colorBadge = 'bg-amber-600 border-amber-300 text-white';
      } else if (isResolved) {
        colorBadge = 'bg-emerald-700 border-emerald-500 text-white opacity-70';
      }

      const iconHtml = `
        <div class="relative cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group">
          <div class="flex items-center justify-center w-7 h-7 rounded-full border-2 ${colorBadge} shadow-lg ${isSelected ? 'ring-3 ring-white scale-110' : ''} transition-transform">
            <span class="text-[11px] font-bold">${isP1 ? 'P1' : isP2 ? 'P2' : isResolved ? '✓' : 'P3'}</span>
          </div>
          <div class="absolute -bottom-5 text-[10px] font-semibold bg-slate-900 text-slate-200 px-1.5 py-0.2 rounded border border-slate-700 shadow-md whitespace-nowrap">
            ${inc.category === 'STRUCTURAL_SINKHOLE' ? 'Cave-in' : inc.category.split('_')[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-hazard-pin',
        iconSize: [28, 28],
      });

      const marker = L.marker([inc.location.lat, inc.location.lng], { icon: customIcon });
      marker.on('click', () => {
        onSelectIncident(inc);
      });

      markersGroup.addLayer(marker);

      // Route line if crew is assigned and active
      if (inc.assignedUnitId && inc.status !== 'RESOLVED') {
        const assignedUnit = units.find(u => u.id === inc.assignedUnitId);
        if (assignedUnit) {
          const routeLine = L.polyline(
            [
              [assignedUnit.lat, assignedUnit.lng],
              [inc.location.lat, inc.location.lng]
            ],
            {
              color: isP1 ? '#ef4444' : '#10b981',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 8',
              lineCap: 'round',
            }
          );
          routesGroup.addLayer(routeLine);
        }
      }
    });

    // Draw Municipal Response Units / Crews
    if (activeFilter === 'ALL' || activeFilter === 'CREWS') {
      units.forEach((unit) => {
        const isDispatched = unit.status === 'DISPATCHED' || unit.status === 'EN_ROUTE';

        const unitIconHtml = `
          <div class="relative cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="flex items-center justify-center w-7 h-7 rounded-md border-2 bg-slate-900 border-emerald-400 text-emerald-400 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-600 shadow whitespace-nowrap">
              ${unit.name.split(' ')[0]} ${unit.id.split('-')[1] || ''}
            </div>
          </div>
        `;

        const unitIcon = L.divIcon({
          html: unitIconHtml,
          className: 'custom-crew-pin',
          iconSize: [28, 28],
        });

        const marker = L.marker([unit.lat, unit.lng], { icon: unitIcon });
        marker.on('click', () => {
          onSelectUnit(unit);
        });

        markersGroup.addLayer(marker);
      });
    }
  }, [incidents, units, activeFilter, selectedIncident]);

  return (
    <main className="flex-1 relative flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Map Viewport */}
      <div className="flex-1 relative min-h-[340px]">
        {/* Map Header Controls */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none flex-wrap gap-2">
          {/* Left Category Filters */}
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 pointer-events-auto shadow-lg">
            <div className="px-2 text-xs font-medium text-slate-400 flex items-center gap-1.5 border-r border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter:</span>
            </div>

            {(['ALL', 'P1', 'P2', 'P3', 'CREWS'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All Incidents' : filter === 'CREWS' ? 'Repair Fleets' : `${filter} Hazards`}
              </button>
            ))}
          </div>

          {/* Right Recenter Control */}
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 pointer-events-auto shadow-lg">
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([31.253, 75.703], 14);
                }
              }}
              title="Recenter City GIS Map"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-400" />
              <span>Center Grid</span>
            </button>
          </div>
        </div>

        {/* Primary Leaflet Map */}
        <div
          id="municipal-leaflet-map"
          ref={mapContainerRef}
          className="w-full h-full z-0"
        />

        {/* Map Legend */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs shadow-lg font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">P1 Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">P2 Urgent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-300">P3 Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
            <span className="text-emerald-300">Municipal Unit</span>
          </div>
        </div>

        {/* Selected Incident Drawer / Card */}
        {selectedIncident && (
          <div className="absolute top-14 right-3 left-3 sm:left-auto sm:w-96 z-20 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-4 backdrop-blur-xl animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  selectedIncident.priority === 'P1_CRITICAL'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : selectedIncident.priority === 'P2_URGENT'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                }`}>
                  {selectedIncident.priority === 'P1_CRITICAL' ? 'P1 Critical' : 'P2 Urgent'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedIncident.id}
                </span>
              </div>
              <button
                onClick={() => onSelectIncident(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Incident Details */}
            <div className="space-y-3">
              <div className="flex gap-3">
                {selectedIncident.imageUrl && (
                  <img
                    src={selectedIncident.imageUrl}
                    alt={selectedIncident.title}
                    className="w-20 h-20 rounded-lg object-cover border border-slate-800 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex-1 overflow-hidden min-w-0">
                  <h3 className="font-semibold text-slate-100 text-xs line-clamp-2">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {selectedIncident.description}
                  </p>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{selectedIncident.location.address}</span>
                  </div>
                </div>
              </div>

              {/* Resolution SLA & Assigned Crew */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">
                    Risk Severity
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">
                    {selectedIncident.riskScore}% Severity Index
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">
                    Target SLA
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {selectedIncident.status === 'RESOLVED'
                        ? 'Completed'
                        : `${selectedIncident.targetResolutionMinutes || 45} mins left`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Crew Card */}
              {selectedIncident.assignedUnitId && (
                <div className="bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-200">
                        {selectedIncident.assignedUnitName || selectedIncident.assignedUnitId}
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        ETA: ~{selectedIncident.etaMinutes || 8} mins • En Route to Site
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Dispatched
                  </span>
                </div>
              )}

              {/* Action Directives */}
              {selectedIncident.actionDirectives && selectedIncident.actionDirectives.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">Municipal Directives:</div>
                  <div className="space-y-1">
                    {selectedIncident.actionDirectives.map((directive, idx) => (
                      <div key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold">•</span>
                        <span>{directive}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Control */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-400">Status:</span>
                <div className="flex items-center gap-1 flex-1">
                  {(['OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateIncidentStatus(selectedIncident.id, st)}
                      className={`flex-1 py-1 px-1 rounded text-xs font-medium transition-colors cursor-pointer text-center ${
                        selectedIncident.status === st
                          ? 'bg-slate-200 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {st === 'OPEN' ? 'Pending' : st === 'DISPATCHED' ? 'Dispatched' : st === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Live Incident Queue Table */}
      <LiveIncidentQueue
        incidents={incidents}
        selectedIncident={selectedIncident}
        onSelectIncident={onSelectIncident}
        onUpdateIncidentStatus={onUpdateIncidentStatus}
      />
    </main>
  );
};
