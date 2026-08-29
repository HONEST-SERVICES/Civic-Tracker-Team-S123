import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Filter, 
  Crosshair, 
  X, 
  Clock, 
  Truck, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  Star, 
  Sun, 
  Globe 
} from 'lucide-react';
import L from 'leaflet';
import { CrisisIncident, MunicipalUnit, PublicFacility } from '../types';
import { INITIAL_PUBLIC_FACILITIES } from '../mockData';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';
import { subscribeToPublicFacilities, ratePublicFacility } from '../services/firebase';

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
  const [engine, setEngine] = useState<'GOOGLE' | 'LEAFLET'>('LEAFLET');
  
  // Google Maps instances
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleMarkersRef = useRef<google.maps.Marker[]>([]);
  const googleFacilityMarkersRef = useRef<google.maps.Marker[]>([]);
  const googlePolylinesRef = useRef<google.maps.Polyline[]>([]);

  // Leaflet instances
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3' | 'CREWS'>('ALL');
  const [mapStyle, setMapStyle] = useState<'STREET' | 'SATELLITE'>('STREET');
  const [showSbmFacilities, setShowSbmFacilities] = useState<boolean>(true);
  const [publicFacilities, setPublicFacilities] = useState<PublicFacility[]>(INITIAL_PUBLIC_FACILITIES);
  const [selectedFacility, setSelectedFacility] = useState<PublicFacility | null>(null);

  const [ratingInput, setRatingInput] = useState<number>(5);
  const [isRatingSaving, setIsRatingSaving] = useState<boolean>(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string | null>(null);

  const defaultCenter = activeZoneCenter || { lat: 31.2530, lng: 75.7030 };

  // O(1) Incident Lookup Table
  const incidentMap = useMemo(() => new Map(incidents.map(inc => [inc.id, inc])), [incidents]);

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
      if (engine === 'GOOGLE' && googleMapRef.current && focusedFacility.location) {
        googleMapRef.current.panTo({
          lat: focusedFacility.location.lat,
          lng: focusedFacility.location.lng
        });
        googleMapRef.current.setZoom(16);
      } else if (engine === 'LEAFLET' && leafletMapRef.current && focusedFacility.location) {
        leafletMapRef.current.setView([focusedFacility.location.lat, focusedFacility.location.lng], 16);
      }
    }
  }, [focusedFacility, engine]);

  // Handle Pan to active zone center
  useEffect(() => {
    if (activeZoneCenter) {
      if (engine === 'GOOGLE' && googleMapRef.current) {
        googleMapRef.current.panTo(activeZoneCenter);
        googleMapRef.current.setZoom(14);
      } else if (engine === 'LEAFLET' && leafletMapRef.current) {
        leafletMapRef.current.setView([activeZoneCenter.lat, activeZoneCenter.lng], 14);
      }
    }
  }, [activeZoneCenter, engine]);

  // Leaflet initialization helper
  const initLeaflet = (container: HTMLDivElement) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const center = activeZoneCenter || { lat: 31.2530, lng: 75.7030 };
    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    const tileUrl = mapStyle === 'SATELLITE'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    leafletTileLayerRef.current = tileLayer;
    const layerGroup = L.layerGroup().addTo(map);
    leafletLayerGroupRef.current = layerGroup;
    leafletMapRef.current = map;
    setEngine('LEAFLET');
  };

  // Primary Map Engine Initializer (Google Maps with instant seamless Leaflet fallback)
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainerRef.current) return;

      try {
        const maps = await loadGoogleMapsApi();
        if (!isMounted || !mapContainerRef.current) return;

        const center = activeZoneCenter || { lat: 31.2530, lng: 75.7030 };
        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom: 14,
          mapTypeId: mapStyle === 'SATELLITE' ? maps.MapTypeId.HYBRID : maps.MapTypeId.ROADMAP,
          styles: LIGHT_STREET_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });

        googleMapRef.current = map;
        setEngine('GOOGLE');
      } catch {
        // Automatically & seamlessly fall back to Leaflet/OpenStreetMap without blocking user
        if (isMounted && mapContainerRef.current) {
          initLeaflet(mapContainerRef.current);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      googleMapRef.current = null;
    };
  }, []);

  // Update map style across engines
  useEffect(() => {
    if (engine === 'GOOGLE' && googleMapRef.current) {
      googleMapRef.current.setMapTypeId(
        mapStyle === 'SATELLITE' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
      );
      googleMapRef.current.setOptions({ styles: LIGHT_STREET_STYLES });
    } else if (engine === 'LEAFLET' && leafletTileLayerRef.current) {
      const tileUrl = mapStyle === 'SATELLITE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      leafletTileLayerRef.current.setUrl(tileUrl);
    }
  }, [mapStyle, engine]);

  // Render Markers on Map (Google or Leaflet)
  useEffect(() => {
    // Filter incidents
    const filteredIncidents = incidents.filter((inc) => {
      if (activeFilter === 'P1') return inc.priority === 'P1_CRITICAL';
      if (activeFilter === 'P2') return inc.priority === 'P2_URGENT';
      if (activeFilter === 'P3') return inc.priority === 'P3_SCHEDULED';
      return true;
    });

    if (engine === 'GOOGLE') {
      const map = googleMapRef.current;
      if (!map) return;

      // Clear previous Google markers
      googleMarkersRef.current.forEach((m) => m.setMap(null));
      googleMarkersRef.current = [];
      googleFacilityMarkersRef.current.forEach((m) => m.setMap(null));
      googleFacilityMarkersRef.current = [];
      googlePolylinesRef.current.forEach((p) => p.setMap(null));
      googlePolylinesRef.current = [];

      // Render Incident Markers (Google)
      if (activeFilter !== 'CREWS') {
        filteredIncidents.forEach((incident) => {
          const incLat = incident.location?.lat ?? 31.2530;
          const incLng = incident.location?.lng ?? 75.7030;
          const isSelected = selectedIncident?.id === incident.id;
          const isResolved = incident.status === 'RESOLVED';

          const color = isResolved
            ? '#10b981'
            : incident.priority === 'P1_CRITICAL'
            ? '#ef4444'
            : incident.priority === 'P2_URGENT'
            ? '#f59e0b'
            : '#3b82f6';

          const marker = new google.maps.Marker({
            position: { lat: incLat, lng: incLng },
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

          googleMarkersRef.current.push(marker);
        });
      }

      // Render Field Units (Google)
      if (activeFilter === 'ALL' || activeFilter === 'CREWS') {
        units.forEach((unit) => {
          const unitLat = unit.lat ?? (unit as any).location?.lat ?? 31.2530;
          const unitLng = unit.lng ?? (unit as any).location?.lng ?? 75.7030;
          const isEnRoute = unit.status === 'EN_ROUTE';

          const marker = new google.maps.Marker({
            position: { lat: unitLat, lng: unitLng },
            map,
            title: `Fleet ${unit.id}: ${unit.name} (${unit.type || 'Crew'})`,
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

          googleMarkersRef.current.push(marker);

          if (unit.assignedIncidentId) {
            const targetInc = incidentMap.get(unit.assignedIncidentId);
            if (targetInc) {
              const targetLat = targetInc.location?.lat ?? 31.2530;
              const targetLng = targetInc.location?.lng ?? 75.7030;
              const line = new google.maps.Polyline({
                path: [
                  { lat: unitLat, lng: unitLng },
                  { lat: targetLat, lng: targetLng }
                ],
                geodesic: true,
                strokeColor: '#0d9488',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                map
              });
              googlePolylinesRef.current.push(line);
            }
          }
        });
      }

      // Render SBM Facilities (Google)
      if (showSbmFacilities) {
        publicFacilities.forEach((facility) => {
          const facLat = facility.location?.lat ?? 31.2530;
          const facLng = facility.location?.lng ?? 75.7030;
          const isToilet = facility.type === 'TOILET';
          const isSelected = selectedFacility?.id === facility.id;

          const marker = new google.maps.Marker({
            position: { lat: facLat, lng: facLng },
            map,
            title: `[SBM] ${facility.name} (★${(facility.rating ?? 5).toFixed(1)})`,
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

          googleFacilityMarkersRef.current.push(marker);
        });
      }
    } else if (engine === 'LEAFLET' && leafletMapRef.current && leafletLayerGroupRef.current) {
      // Leaflet Rendering
      const lg = leafletLayerGroupRef.current;
      lg.clearLayers();

      // Render Incident Markers (Leaflet)
      if (activeFilter !== 'CREWS') {
        filteredIncidents.forEach((incident) => {
          const incLat = incident.location?.lat ?? 31.2530;
          const incLng = incident.location?.lng ?? 75.7030;
          const isSelected = selectedIncident?.id === incident.id;
          const isResolved = incident.status === 'RESOLVED';

          const color = isResolved
            ? '#10b981' // Green
            : incident.priority === 'P1_CRITICAL'
            ? '#ef4444' // Red
            : incident.priority === 'P2_URGENT'
            ? '#f59e0b' // Amber
            : '#3b82f6'; // Blue

          const circle = L.circleMarker([incLat, incLng], {
            radius: isSelected ? 11 : 8,
            fillColor: color,
            fillOpacity: 0.95,
            color: '#ffffff',
            weight: isSelected ? 3 : 2
          });

          circle.bindTooltip(`<strong>${incident.id}</strong>: ${incident.title}`, {
            direction: 'top',
            offset: [0, -8]
          });

          circle.on('click', () => {
            onSelectIncident(incident);
          });

          lg.addLayer(circle);
        });
      }

      // Render Fleets (Leaflet)
      if (activeFilter === 'ALL' || activeFilter === 'CREWS') {
        units.forEach((unit) => {
          const unitLat = unit.lat ?? (unit as any).location?.lat ?? 31.2530;
          const unitLng = unit.lng ?? (unit as any).location?.lng ?? 75.7030;
          const isEnRoute = unit.status === 'EN_ROUTE';
          const iconHtml = `<div style="background:${isEnRoute ? '#10b981' : '#0f172a'}; color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; font-size:13px; box-shadow:0 2px 6px rgba(0,0,0,0.3); cursor:pointer;">🚛</div>`;
          
          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-fleet-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const unitMarker = L.marker([unitLat, unitLng], { icon: customIcon });
          unitMarker.bindTooltip(`<strong>${unit.name}</strong> (${unit.type || 'Crew'})`, {
            direction: 'top',
            offset: [0, -14]
          });

          unitMarker.on('click', () => {
            onSelectUnit(unit);
          });

          lg.addLayer(unitMarker);

          if (unit.assignedIncidentId) {
            const targetInc = incidentMap.get(unit.assignedIncidentId);
            if (targetInc) {
              const targetLat = targetInc.location?.lat ?? 31.2530;
              const targetLng = targetInc.location?.lng ?? 75.7030;
              const polyline = L.polyline([
                [unitLat, unitLng],
                [targetLat, targetLng]
              ], {
                color: '#0d9488',
                weight: 3,
                dashArray: '6, 6',
                opacity: 0.85
              });
              lg.addLayer(polyline);
            }
          }
        });
      }

      // Render SBM Facilities (Leaflet)
      if (showSbmFacilities) {
        publicFacilities.forEach((facility) => {
          const facLat = facility.location?.lat ?? 31.2530;
          const facLng = facility.location?.lng ?? 75.7030;
          const isToilet = facility.type === 'TOILET';
          const isSelected = selectedFacility?.id === facility.id;
          const bg = isToilet ? '#0891b2' : '#059669';
          const emoji = isToilet ? '🚻' : '♻️';

          const iconHtml = `<div style="background:${bg}; color:#fff; width:${isSelected ? '30px' : '24px'}; height:${isSelected ? '30px' : '24px'}; border-radius:50%; display:flex; align-items:center; justify-content:center; border:${isSelected ? '3px' : '2px'} solid #fff; font-size:${isSelected ? '14px' : '11px'}; box-shadow:0 2px 5px rgba(0,0,0,0.25); cursor:pointer;">${emoji}</div>`;

          const sbmIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-sbm-icon',
            iconSize: isSelected ? [30, 30] : [24, 24],
            iconAnchor: isSelected ? [15, 15] : [12, 12]
          });

          const facilityMarker = L.marker([facLat, facLng], { icon: sbmIcon });
          facilityMarker.bindTooltip(`[SBM] <strong>${facility.name}</strong> (★${(facility.rating ?? 5).toFixed(1)})`, {
            direction: 'top',
            offset: [0, -12]
          });

          facilityMarker.on('click', () => {
            setSelectedFacility(facility);
            onSelectIncident(null);
          });

          lg.addLayer(facilityMarker);
        });
      }
    }
  }, [incidents, units, selectedIncident, activeFilter, showSbmFacilities, publicFacilities, selectedFacility, engine]);

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

  const handleRecenter = () => {
    if (engine === 'GOOGLE' && googleMapRef.current) {
      googleMapRef.current.panTo(defaultCenter);
      googleMapRef.current.setZoom(14);
    } else if (engine === 'LEAFLET' && leafletMapRef.current) {
      leafletMapRef.current.setView([defaultCenter.lat, defaultCenter.lng], 14);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-slate-100 overflow-hidden select-none font-sans">
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none flex-wrap gap-2">
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
            onClick={handleRecenter}
            title="Recenter Municipal Grid"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Center</span>
          </button>
        </div>
      </div>

      {/* Primary Map Viewport Element (Google Maps or Leaflet OpenStreetMap) */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 bg-slate-100 min-h-full"
      />

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700">
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
        <div className="absolute top-14 right-3 left-3 sm:left-auto sm:w-96 z-[500] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
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

      {/* Selected Incident Floating Drawer (if opened on map) */}
      {selectedIncident && (
        <div className="absolute top-14 right-3 left-3 sm:left-auto sm:w-96 z-[500] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
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

          <div className="space-y-3">
            <div className="flex gap-3">
              {selectedIncident.imageUrl && (
                <img
                  src={selectedIncident.imageUrl}
                  alt={selectedIncident.title}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex-1 overflow-hidden min-w-0">
                <h3 className="font-bold text-slate-900 text-xs line-clamp-2">
                  {selectedIncident.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                  {selectedIncident.description}
                </p>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{selectedIncident.location.address}</span>
                </div>
              </div>
            </div>

            {/* Severity & SLA */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <div>
                <div className="text-[10px] text-slate-500 font-medium uppercase">
                  Risk Severity
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedIncident.riskScore}% Severity
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
                      : `${selectedIncident.targetResolutionMinutes || 45}m left`}
                  </span>
                </div>
              </div>
            </div>

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
  );
};
