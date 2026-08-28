import React, { useEffect, useRef, useState } from 'react';
import { CrisisIncident, PublicFacility } from '../types';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';
import { subscribeToPublicFacilities } from '../services/firebase';
import { INITIAL_PUBLIC_FACILITIES } from '../mockData';
import { Sun, Globe } from 'lucide-react';

interface GoogleDesktopOverviewMapProps {
  incidents: CrisisIncident[];
  onSelectIncident: (incident: CrisisIncident) => void;
  className?: string;
  focusedLocation?: { lat: number; lng: number } | null;
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

export const GoogleDesktopOverviewMap: React.FC<GoogleDesktopOverviewMapProps> = ({
  incidents,
  onSelectIncident,
  className = "w-full h-full rounded-2xl overflow-hidden shadow-xs relative bg-slate-100",
  focusedLocation,
  focusedFacility
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const facilityMarkersRef = useRef<{ marker: google.maps.Marker; facility: PublicFacility }[]>([]);

  const [mapStyle, setMapStyle] = useState<'STREET' | 'SATELLITE'>('STREET');
  const [showSbmFacilities, setShowSbmFacilities] = useState<boolean>(true);
  const [facilities, setFacilities] = useState<PublicFacility[]>(INITIAL_PUBLIC_FACILITIES);

  useEffect(() => {
    const unsub = subscribeToPublicFacilities((list) => {
      if (list && list.length > 0) {
        setFacilities(list);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const initialCenter = focusedLocation 
          ? focusedLocation 
          : focusedFacility 
          ? { lat: focusedFacility.location.lat, lng: focusedFacility.location.lng }
          : { lat: 31.2530, lng: 75.7030 };

        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: focusedFacility || focusedLocation ? 16 : 14,
          mapTypeId: mapStyle === 'SATELLITE' ? 'hybrid' : 'roadmap',
          disableDefaultUI: true,
          zoomControl: true,
          styles: LIGHT_STREET_STYLES
        });

        infoWindowRef.current = new maps.InfoWindow();
        mapInstanceRef.current = map;
      })
      .catch((err) => {
        console.warn("Failed to load Google Desktop Overview Map:", err);
      });

    return () => {
      isMounted = false;
      markersRef.current.forEach((m) => m.setMap(null));
      facilityMarkersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      facilityMarkersRef.current = [];
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Pan to focused location or facility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (focusedFacility) {
      setShowSbmFacilities(true);
      const pos = { lat: focusedFacility.location.lat, lng: focusedFacility.location.lng };
      map.panTo(pos);
      map.setZoom(16);

      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; max-width: 220px; color: #0f172a;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 16px;">${focusedFacility.type === 'TOILET' ? '🚻' : '♻️'}</span>
              <strong style="font-size: 13px; color: #115e59;">${focusedFacility.name}</strong>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              ${focusedFacility.location.address || focusedFacility.ward}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #d97706;">
              <span>⭐ ${focusedFacility.rating.toFixed(1)} / 5.0</span>
              <span style="color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">${focusedFacility.status}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              Timings: ${focusedFacility.timings || '24/7 Open'}
            </div>
          </div>
        `);
        infoWindowRef.current.setPosition(pos);
        infoWindowRef.current.open(map);
      }
    } else if (focusedLocation) {
      map.panTo(focusedLocation);
      map.setZoom(16);
    }
  }, [focusedFacility, focusedLocation]);

  // Update map style
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mapStyle === 'SATELLITE') {
      map.setMapTypeId('hybrid');
      map.setOptions({ styles: [] });
    } else {
      map.setMapTypeId('roadmap');
      map.setOptions({ styles: LIGHT_STREET_STYLES });
    }
  }, [mapStyle]);

  // Update incident markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    incidents.forEach((inc) => {
      const isResolved = inc.status === 'RESOLVED';
      const isCritical = inc.priority === 'P1_CRITICAL';
      const isUrgent = inc.priority === 'P2_URGENT';

      const color = isResolved ? '#10b981' : isCritical ? '#ef4444' : isUrgent ? '#f59e0b' : '#3b82f6';

      const marker = new google.maps.Marker({
        position: { lat: inc.location.lat, lng: inc.location.lng },
        map,
        title: inc.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        onSelectIncident(inc);
      });

      markersRef.current.push(marker);
    });
  }, [incidents, onSelectIncident]);

  // Update facility markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    facilityMarkersRef.current.forEach((m) => m.setMap(null));
    facilityMarkersRef.current = [];

    if (!showSbmFacilities) return;

    facilities.forEach((fac) => {
      const marker = new google.maps.Marker({
        position: { lat: fac.location.lat, lng: fac.location.lng },
        map,
        title: `${fac.name} (${fac.rating}★)`,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 4.5,
          fillColor: fac.type === 'TOILET' ? '#0891b2' : '#059669',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5
        },
        label: {
          text: fac.type === 'TOILET' ? '🚻' : '♻️',
          fontSize: '10px'
        }
      });

      marker.addListener('click', () => {
        const pos = { lat: fac.location.lat, lng: fac.location.lng };
        map.panTo(pos);
        map.setZoom(16);

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; max-width: 220px; color: #0f172a;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 16px;">${fac.type === 'TOILET' ? '🚻' : '♻️'}</span>
                <strong style="font-size: 13px; color: #115e59;">${fac.name}</strong>
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                ${fac.location.address || fac.ward}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #d97706;">
                <span>⭐ ${fac.rating.toFixed(1)} / 5.0</span>
                <span style="color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">${fac.status}</span>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Timings: ${fac.timings || '24/7 Open'}
              </div>
            </div>
          `);
          infoWindowRef.current.setPosition(pos);
          infoWindowRef.current.open(map);
        }
      });

      facilityMarkersRef.current.push({ marker, facility: fac });
    });
  }, [facilities, showSbmFacilities]);

  return (
    <div className={className}>
      {/* Controls Overlay */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-slate-200">
        <button
          onClick={() => setShowSbmFacilities(!showSbmFacilities)}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
            showSbmFacilities
              ? 'bg-cyan-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Toggle SBM Toilets Layer"
        >
          <span>🚻</span>
          <span className="text-[11px]">SBM</span>
        </button>

        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1">
          <button
            onClick={() => setMapStyle('STREET')}
            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              mapStyle === 'STREET' ? 'bg-slate-100 text-teal-800' : 'text-slate-500'
            }`}
            title="Street Map View"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          </button>
          <button
            onClick={() => setMapStyle('SATELLITE')}
            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              mapStyle === 'SATELLITE' ? 'bg-slate-100 text-teal-800' : 'text-slate-500'
            }`}
            title="Satellite Imagery"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
          </button>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-full bg-slate-100"
      />
    </div>
  );
};
