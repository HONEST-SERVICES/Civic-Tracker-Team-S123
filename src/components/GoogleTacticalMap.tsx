import React, { useEffect, useRef, useState } from 'react';
import { 
  Filter, 
  Crosshair, 
  X, 
  Clock, 
  Truck, 
  Navigation, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Star, 
  Sun, 
  Globe 
} from 'lucide-react';
import { CrisisIncident, MunicipalUnit, PublicFacility } from '../types';
import { INITIAL_PUBLIC_FACILITIES } from '../mockData';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';
import { getGoogleMapsApiKey, setGoogleMapsApiKey } from '../config/keys';
import { subscribeToPublicFacilities, ratePublicFacility } from '../services/firebase';
import { LiveIncidentQueue } from './LiveIncidentQueue';

interface GoogleTacticalMapProps {
  incidents: CrisisIncident[];
  units: MunicipalUnit[];
  selectedIncident: CrisisIncident | null;
  onSelectIncident: (incident: CrisisIncident | null) => void;
  onSelectUnit: (unit: MunicipalUnit | null) => void;
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status']) => void;
  activeZoneCenter?: { lat: number; lng: number } | null;
  focusedFacility?: PublicFacility | null;
  theme?: 'light' | 'dark';
}

const LIGHT_STREET_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  }
];

export const GoogleTacticalMap: React.FC<GoogleTacticalMapProps> = ({
  incidents,
  units,
  selectedIncident,
  onSelectIncident,
  onSelectUnit,
  onUpdateIncidentStatus,
  activeZoneCenter,
  focusedFacility
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const facilityMarkersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3' | 'CREWS'>('ALL');
  const [mapStyle, setMapStyle] = useState<'STREET' | 'SATELLITE'>('STREET');
  const [showSbmFacilities, setShowSbmFacilities] = useState<boolean>(true);
  const [publicFacilities, setPublicFacilities] = useState<PublicFacility[]>(INITIAL_PUBLIC_FACILITIES);
  const [selectedFacility, setSelectedFacility] = useState<PublicFacility | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getGoogleMapsApiKey() || '');
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [isRatingSaving, setIsRatingSaving] = useState<boolean>(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string | null>(null);

  // Subscribe to real-time public facilities from Firestore
  useEffect(() => {
    const unsubFacilities = subscribeToPublicFacilities((facilities) => {
      if (facilities && facilities.length > 0) {
        setPublicFacilities(facilities);
      }
    });
    return () => unsubFacilities();
  }, []);

  // Sync focused facility from parent prop
  useEffect(() => {
    if (focusedFacility) {
      setSelectedFacility(focusedFacility);
      if (mapInstanceRef.current && focusedFacility.location) {
        mapInstanceRef.current.panTo({
          lat: focusedFacility.location.lat,
          lng: focusedFacility.location.lng
        });
        mapInstanceRef.current.setZoom(16);
      }
    }
  }, [focusedFacility]);

  // Handle Pan to active zone center
  useEffect(() => {
    if (activeZoneCenter && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(activeZoneCenter);
      mapInstanceRef.current.setZoom(14);
    }
  }, [activeZoneCenter]);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        await loadGoogleMapsApi();

        if (!isMounted || !mapContainerRef.current) return;

        const defaultCenter = activeZoneCenter || { lat: 31.2530, lng: 75.7030 };

        const map = new google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          mapTypeId: mapStyle === 'SATELLITE' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP,
          styles: LIGHT_STREET_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });

        mapInstanceRef.current = map;
        setMapError(null);
      } catch (err: any) {
        console.warn('Google Maps load notice:', err);
        if (isMounted) {
          setMapError('Google Maps API Key required or offline fallback.');
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update map type
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(
      mapStyle === 'SATELLITE' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
    );
    mapInstanceRef.current.setOptions({ styles: LIGHT_STREET_STYLES });
  }, [mapStyle]);

  // Render Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    facilityMarkersRef.current.forEach((m) => m.setMap(null));
    facilityMarkersRef.current = [];

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    // Filter incidents
    const filteredIncidents = incidents.filter((inc) => {
      if (activeFilter === 'P1') return inc.priority === 'P1_CRITICAL';
      if (activeFilter === 'P2') return inc.priority === 'P2_URGENT';
      if (activeFilter === 'P3') return inc.priority === 'P3_SCHEDULED';
      return true;
    });

    // Render Incident Markers
    if (activeFilter !== 'CREWS') {
      filteredIncidents.forEach((incident) => {
        const isSelected = selectedIncident?.id === incident.id;
        const isResolved = incident.status === 'RESOLVED';

        const color = isResolved
          ? '#10b981' // Green (Resolved)
          : incident.priority === 'P1_CRITICAL'
          ? '#ef4444' // Red (Critical)
          : incident.priority === 'P2_URGENT'
          ? '#f59e0b' // Amber (Urgent)
          : '#3b82f6'; // Blue (Normal)

        const marker = new google.maps.Marker({
          position: { lat: incident.location.lat, lng: incident.location.lng },
          map,
          title: `${incident.id}: ${incident.title}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 11 : 8,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isSelected ? 3 : 2
          },
          zIndex: isSelected ? 100 : 10
        });

        marker.addListener('click', () => {
          onSelectIncident(incident);
        });

        markersRef.current.push(marker);
      });
    }

    // Render Field Fleet Crew Markers
    if (activeFilter === 'ALL' || activeFilter === 'CREWS') {
      units.forEach((unit) => {
        const isEnRoute = unit.status === 'EN_ROUTE';

        const marker = new google.maps.Marker({
          position: { lat: unit.location.lat, lng: unit.location.lng },
          map,
          title: `Fleet ${unit.id}: ${unit.name} (${unit.vehicleType})`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: isEnRoute ? '#10b981' : '#0f172a',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: 45
          },
          zIndex: 50
        });

        marker.addListener('click', () => {
          onSelectUnit(unit);
        });

        markersRef.current.push(marker);

        // Draw dispatch line if assigned to incident
        if (unit.assignedIncidentId) {
          const targetInc = incidents.find((i) => i.id === unit.assignedIncidentId);
          if (targetInc) {
            const line = new google.maps.Polyline({
              path: [
                { lat: unit.location.lat, lng: unit.location.lng },
                { lat: targetInc.location.lat, lng: targetInc.location.lng }
              ],
              geodesic: true,
              strokeColor: '#0d9488',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              map
            });
            polylinesRef.current.push(line);
          }
        }
      });
    }

    // Render SBM Public Facility Markers
    if (showSbmFacilities) {
      publicFacilities.forEach((facility) => {
        const isToilet = facility.type === 'TOILET';
        const isSelected = selectedFacility?.id === facility.id;

        const marker = new google.maps.Marker({
          position: { lat: facility.location.lat, lng: facility.location.lng },
          map,
          title: `[SBM] ${facility.name} (★${facility.rating.toFixed(1)})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 12 : 9,
            fillColor: isToilet ? '#0891b2' : '#059669',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: isSelected ? 3 : 2
          },
          zIndex: isSelected ? 120 : 30
        });

        marker.addListener('click', () => {
          setSelectedFacility(facility);
          onSelectIncident(null);
        });

        facilityMarkersRef.current.push(marker);
      });
    }
  }, [incidents, units, selectedIncident, activeFilter, showSbmFacilities, publicFacilities, selectedFacility]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setGoogleMapsApiKey(apiKeyInput.trim());
      window.location.reload();
    }
  };

  const handleRateFacility = async () => {
    if (!selectedFacility) return;
    setIsRatingSaving(true);
    setRatingSuccessMsg(null);
    try {
      await ratePublicFacility(selectedFacility.id, ratingInput);
      setRatingSuccessMsg('✓ Rating synchronized with Municipal Cloud!');
      setTimeout(() => setRatingSuccessMsg(null), 3000);
    } catch (e) {
      console.warn('Rate facility error:', e);
    } finally {
      setIsRatingSaving(false);
    }
  };

  return (
    <main className="flex-1 relative flex flex-col h-full bg-slate-50 overflow-hidden select-none font-sans">
      {/* Map Viewport Area */}
      <div className="flex-1 relative min-h-[340px]">
        
        {/* Top Controls Overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none flex-wrap gap-2">
          
          {/* Left: Filters Bar & SBM Facility Toggle */}
          <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
            
            {/* Filter Bar */}
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 shadow-sm">
              <div className="px-2 text-xs font-bold text-slate-500 flex items-center gap-1.5 border-r border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Filter:</span>
              </div>

              {(['ALL', 'P1', 'P2', 'P3', 'CREWS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeFilter === filter
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'CREWS' ? 'Fleets' : `${filter}`}
                </button>
              ))}
            </div>

            {/* SBM Public Toilet Locator Toggle */}
            <button
              onClick={() => setShowSbmFacilities(!showSbmFacilities)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border ${
                showSbmFacilities
                  ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs'
                  : 'bg-white/95 backdrop-blur-xs text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle Swachh Bharat Mission (SBM) Public Toilets & Waste Centers Layer"
            >
              <span>🚻</span>
              <span className="font-semibold">SBM Toilet Locator</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                showSbmFacilities ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {publicFacilities.length}
              </span>
            </button>
          </div>

          {/* Right: Map Style Switcher & Recenter */}
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 pointer-events-auto shadow-sm">
            
            {/* Tile Layer Switcher */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setMapStyle('STREET')}
                className={`px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  mapStyle === 'STREET'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Street Map View (Default)"
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">Street</span>
              </button>

              <button
                onClick={() => setMapStyle('SATELLITE')}
                className={`px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  mapStyle === 'SATELLITE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Satellite Imagery Layer"
              >
                <Globe className="w-3 h-3 text-blue-500" />
                <span className="hidden sm:inline">Satellite</span>
              </button>
            </div>

            {/* Center Grid Button */}
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.panTo({ lat: 31.2530, lng: 75.7030 });
                  mapInstanceRef.current.setZoom(14);
                }
              }}
              title="Recenter Municipal Grid"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Center</span>
            </button>
          </div>
        </div>

        {/* Google Map Container Element */}
        <div
          id="google-tactical-map"
          ref={mapContainerRef}
          className="w-full h-full z-0 bg-slate-100"
        />

        {/* Fallback Message Overlay if Google Maps has key prompt */}
        {mapError && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">Google Maps Platform Integration</h3>
            <p className="text-xs text-slate-500 max-w-md mb-4">
              Enter your Google Maps API Key or test in live simulated mode.
            </p>
            <div className="flex items-center gap-2 max-w-sm w-full">
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Paste AIzaSy... API Key"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-900"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save & Load
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-semibold text-slate-800">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-semibold text-slate-800">Urgent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-semibold text-slate-800">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-800">Resolved / Fleet</span>
          </div>
          {showSbmFacilities && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 text-cyan-700">
              <span>🚻</span>
              <span className="font-bold">SBM Toilets</span>
            </div>
          )}
        </div>

        {/* SBM PUBLIC FACILITY DETAIL POPUP / CARD */}
        {selectedFacility && (
          <div className="absolute top-14 right-3 left-3 sm:left-auto sm:w-96 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 text-base">
                  {selectedFacility.type === 'TOILET' ? '🚻' : '♻️'}
                </span>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#115e59] block">
                    {selectedFacility.type === 'TOILET' ? 'Swachh Bharat Public Toilet' : 'Waste Segregation Center'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedFacility.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {selectedFacility.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{selectedFacility.location.address || selectedFacility.ward}</span>
                </p>
              </div>

              {/* Status & Rating Pill Matrix */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">
                    Facility Status
                  </div>
                  <span className={`text-xs font-bold inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full ${
                    selectedFacility.status === 'OPEN'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {selectedFacility.status === 'OPEN' ? 'Open for Public' : 'Maintenance'}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">
                    Cleanliness Score
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-700 mt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{selectedFacility.rating.toFixed(1)} / 5.0</span>
                    <span className="text-[10px] text-slate-400">({selectedFacility.totalRatings || 1})</span>
                  </div>
                </div>
              </div>

              {/* Timings & Features */}
              {selectedFacility.timings && (
                <div className="text-xs text-slate-700 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Hours: <strong>{selectedFacility.timings}</strong></span>
                </div>
              )}

              {selectedFacility.features && selectedFacility.features.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amenities:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFacility.features.map((feat, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rate Cleanliness Form */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Rate Cleanliness:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingInput(star)}
                        className="cursor-pointer p-0.5 transition hover:scale-110"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= ratingInput
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRateFacility}
                  disabled={isRatingSaving}
                  className="w-full h-8 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>{isRatingSaving ? 'Submitting...' : `Submit ${ratingInput}★ Rating`}</span>
                </button>

                {ratingSuccessMsg && (
                  <p className="text-[11px] font-semibold text-emerald-700 text-center animate-in fade-in">
                    {ratingSuccessMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected Incident Drawer */}
        {selectedIncident && (
          <div className="absolute top-14 right-3 left-3 sm:left-auto sm:w-96 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  selectedIncident.priority === 'P1_CRITICAL'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : selectedIncident.priority === 'P2_URGENT'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {selectedIncident.priority === 'P1_CRITICAL' ? 'P1 Critical' : 'P2 Urgent'}
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  {selectedIncident.id}
                </span>
              </div>
              <button
                onClick={() => onSelectIncident(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex-1 overflow-hidden min-w-0">
                  <h3 className="font-bold text-slate-900 text-xs line-clamp-2">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {selectedIncident.description}
                  </p>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{selectedIncident.location.address}</span>
                  </div>
                </div>
              </div>

              {/* Severity & SLA */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">
                    Risk Severity
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedIncident.riskScore}% Severity Index
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">
                    Target SLA
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-0.5">
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
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-100 text-emerald-800">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        {selectedIncident.assignedUnitName || selectedIncident.assignedUnitId}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        ETA: ~{selectedIncident.etaMinutes || 8} mins • En Route to Site
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Dispatched
                  </span>
                </div>
              )}

              {/* Action Directives */}
              {selectedIncident.actionDirectives && selectedIncident.actionDirectives.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Municipal Directives:</div>
                  <div className="space-y-1">
                    {selectedIncident.actionDirectives.map((directive, idx) => (
                      <div key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <span className="text-teal-700 font-bold">•</span>
                        <span>{directive}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Control */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Status:</span>
                <div className="flex items-center gap-1 flex-1">
                  {(['OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateIncidentStatus(selectedIncident.id, st)}
                      className={`flex-1 py-1 px-1 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        selectedIncident.status === st
                          ? 'bg-[#0f172a] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
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
