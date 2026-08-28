import React, { useEffect, useRef } from 'react';
import { CrisisIncident } from '../types';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';

interface GoogleDesktopOverviewMapProps {
  incidents: CrisisIncident[];
  onSelectIncident: (incident: CrisisIncident) => void;
  className?: string;
}

export const GoogleDesktopOverviewMap: React.FC<GoogleDesktopOverviewMapProps> = ({
  incidents,
  onSelectIncident,
  className = "w-full h-full rounded-2xl overflow-hidden shadow-inner"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: { lat: 31.2530, lng: 75.7030 },
          zoom: 14,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        mapInstanceRef.current = map;
      })
      .catch((err) => {
        console.warn("Failed to load Google Desktop Overview Map:", err);
      });

    return () => {
      isMounted = false;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    incidents.forEach((inc) => {
      const isResolved = inc.status === 'RESOLVED';
      const isCritical = inc.priority === 'P1_CRITICAL';

      const color = isResolved ? '#10b981' : isCritical ? '#ef4444' : '#2d7a70';

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

  return (
    <div
      ref={mapContainerRef}
      className={className}
    />
  );
};
