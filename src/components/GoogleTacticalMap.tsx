import React, { useEffect, useRef, useState } from 'react';
import { 
  Filter, 
  Crosshair, 
  X, 
  Clock, 
  Truck, 
  Navigation, 
  MapPin, 
  Sparkles,
  Layers,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit } from '../types';
import { ZONES } from '../mockData';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';
import { getGoogleMapsApiKey, setGoogleMapsApiKey } from '../config/keys';
import { LiveIncidentQueue } from './LiveIncidentQueue';

interface GoogleTacticalMapProps {
  incidents: CrisisIncident[];
  units: MunicipalUnit[];
  selectedIncident: CrisisIncident | null;
  onSelectIncident: (incident: CrisisIncident | null) => void;
  onSelectUnit: (unit: MunicipalUnit | null) => void;
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status']) => void;
  activeZoneCenter?: { lat: number; lng: number } | null;
}

export const GoogleTacticalMap: React.FC<GoogleTacticalMapProps> = ({
  incidents,
  units,
  selectedIncident,
  onSelectIncident,
  onSelectUnit,
  onUpdateIncidentStatus,
  activeZoneCenter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3' | 'CREWS'>('ALL');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(false);

  // Initialize Google Map
  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const defaultCenter = activeZoneCenter || { lat: 31.2530, lng: 75.7030 };

        const map = new maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          mapTypeId: 'roadmap',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
              featureType: "administrative.locality",
              elementType: "labels.text.fill",
              stylers: [{ color: "#d59563" }]
            },
            {
              featureType: "poi",
              elementType: "labels.text.fill",
              stylers: [{ color: "#d59563" }]
            },
            {
              featureType: "poi.park",
              elementType: "geometry",
              stylers: [{ color: "#263c3f" }]
            },
            {
              featureType: "poi.park",
              elementType: "labels.text.fill",
              stylers: [{ color: "#6b9a76" }]
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#38414e" }]
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#212a37" }]
            },
            {
              featureType: "road",
              elementType: "labels.text.fill",
              stylers: [{ color: "#9ca5b3" }]
            },
            {
              featureType: "road.highway",
              elementType: "geometry",
              stylers: [{ color: "#746855" }]
            },
            {
              featureType: "road.highway",
              elementType: "geometry.stroke",
              stylers: [{ color: "#1f2835" }]
            },
            {
              featureType: "road.highway",
              elementType: "labels.text.fill",
              stylers: [{ color: "#f3d19c" }]
            },
            {
              featureType: "transit",
              elementType: "geometry",
              stylers: [{ color: "#2f3948" }]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#17263c" }]
            },
            {
              featureType: "water",
              elementType: "labels.text.fill",
              stylers: [{ color: "#515c6d" }]
            },
            {
              featureType: "water",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#17263c" }]
            }
          ]
        });

        // Draw municipal zone boundary circles
        ZONES.forEach((zone) => {
          const circle = new maps.Circle({
            strokeColor: '#38bdf8',
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            fillColor: '#0284c7',
            fillOpacity: 0.08,
            map,
            center: { lat: zone.lat, lng: zone.lng },
            radius: 650
          });
          circlesRef.current.push(circle);
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Google Maps load issue:", err);
        setMapError(err?.message || "Google Maps could not be initialized");
      });

    return () => {
      isMounted = false;
      markersRef.current.forEach((m) => m.setMap(null));
      polylinesRef.current.forEach((p) => p.setMap(null));
      circlesRef.current.forEach((c) => c.setMap(null));
      markersRef.current = [];
      polylinesRef.current = [];
      circlesRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when activeZoneCenter changes
  useEffect(() => {
    if (mapInstanceRef.current && activeZoneCenter) {
      mapInstanceRef.current.panTo(activeZoneCenter);
      mapInstanceRef.current.setZoom(15);
    }
  }, [activeZoneCenter]);

  // Update Markers & Dispatch Route Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    // Clear previous markers & polylines
    markersRef.current.forEach((m) => m.setMap(null));
    polylinesRef.current.forEach((p) => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    // 1. Draw Incidents
    incidents.forEach((inc) => {
      if (activeFilter === 'P1' && inc.priority !== 'P1_CRITICAL') return;
      if (activeFilter === 'P2' && inc.priority !== 'P2_URGENT') return;
      if (activeFilter === 'P3' && inc.priority !== 'P3_SCHEDULED') return;
      if (activeFilter === 'CREWS') return;

      const isP1 = inc.priority === 'P1_CRITICAL';
      const isP2 = inc.priority === 'P2_URGENT';
      const isResolved = inc.status === 'RESOLVED';
      const isSelected = selectedIncident?.id === inc.id;

      let pinColor = '#3b82f6'; // Blue
      let labelText = 'P3';
      if (isP1) {
        pinColor = '#ef4444'; // Red
        labelText = 'P1';
      } else if (isP2) {
        pinColor = '#f59e0b'; // Amber
        labelText = 'P2';
      } else if (isResolved) {
        pinColor = '#10b981'; // Green
        labelText = '✓';
      }

      // SVG Icon with clean circular badge
      const markerIcon: google.maps.Symbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 12 : 9,
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: isSelected ? 3 : 2
      };

      const marker = new google.maps.Marker({
        position: { lat: inc.location.lat, lng: inc.location.lng },
        map,
        title: `${inc.title} (${inc.priority})`,
        icon: markerIcon,
        label: {
          text: labelText,
          color: '#ffffff',
          fontSize: isSelected ? '11px' : '9px',
          fontWeight: 'bold'
        },
        zIndex: isSelected ? 100 : isP1 ? 80 : 50
      });

      marker.addListener('click', () => {
        onSelectIncident(inc);
      });

      markersRef.current.push(marker);

      // Route Polyline if assigned crew exists
      if (inc.assignedUnitId && inc.status !== 'RESOLVED') {
        const unit = units.find((u) => u.id === inc.assignedUnitId);
        if (unit) {
          const polyline = new google.maps.Polyline({
            path: [
              { lat: unit.lat, lng: unit.lng },
              { lat: inc.location.lat, lng: inc.location.lng }
            ],
            geodesic: true,
            strokeColor: isP1 ? '#ef4444' : '#10b981',
            strokeOpacity: 0.85,
            strokeWeight: 3,
            map
          });
          polylinesRef.current.push(polyline);
        }
      }
    });

    // 2. Draw Municipal Fleet Units
    if (activeFilter === 'ALL' || activeFilter === 'CREWS') {
      units.forEach((unit) => {
        const unitIcon: google.maps.Symbol = {
          path: "M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z",
          scale: 1.2,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          anchor: new google.maps.Point(12, 12)
        };

        const marker = new google.maps.Marker({
          position: { lat: unit.lat, lng: unit.lng },
          map,
          title: `Unit: ${unit.name} (${unit.status})`,
          icon: unitIcon,
          zIndex: 90
        });

        marker.addListener('click', () => {
          onSelectUnit(unit);
        });

        markersRef.current.push(marker);
      });
    }
  }, [incidents, units, activeFilter, selectedIncident, mapLoaded]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setGoogleMapsApiKey(apiKeyInput.trim());
      setShowKeyPrompt(false);
      window.location.reload();
    }
  };

  return (
    <main className="flex-1 relative flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Map Viewport Area */}
      <div className="flex-1 relative min-h-[340px]">
        {/* Top Controls Overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none flex-wrap gap-2">
          {/* Filters Bar */}
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
                {filter === 'ALL' ? 'All Grievances' : filter === 'CREWS' ? 'Repair Fleets' : `${filter} Hazards`}
              </button>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 pointer-events-auto shadow-lg">
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.panTo({ lat: 31.2530, lng: 75.7030 });
                  mapInstanceRef.current.setZoom(14);
                }
              }}
              title="Recenter Municipal Grid"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-400" />
              <span>Center Grid</span>
            </button>
          </div>
        </div>

        {/* Google Map Container Element */}
        <div
          id="google-tactical-map"
          ref={mapContainerRef}
          className="w-full h-full z-0 bg-slate-900"
        />

        {/* Fallback Message Overlay if Google Maps has key prompt */}
        {mapError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-100 mb-1">Google Maps Platform Integration</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Enter your Google Maps API Key or test in live simulated mode.
            </p>
            <div className="flex items-center gap-2 max-w-sm w-full">
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Paste AIzaSy... API Key"
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save & Load
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
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
            <span className="text-emerald-300">Repair Fleet</span>
          </div>
        </div>

        {/* Selected Incident Drawer */}
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

              {/* Severity & SLA */}
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
