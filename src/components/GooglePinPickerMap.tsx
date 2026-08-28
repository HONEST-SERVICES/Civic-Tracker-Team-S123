import React, { useEffect, useRef } from 'react';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';

interface GooglePinPickerMapProps {
  coords: { lat: number; lng: number };
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

export const GooglePinPickerMap: React.FC<GooglePinPickerMapProps> = ({
  coords,
  onCoordsChange,
  className = "w-full h-36 rounded-xl border border-slate-200 overflow-hidden relative z-0"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: coords,
          zoom: 15,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy'
        });

        // Pin marker
        const marker = new maps.Marker({
          position: coords,
          map,
          draggable: true,
          title: "Drag to pin precise grievance location"
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            onCoordsChange({ lat: pos.lat(), lng: pos.lng() });
          }
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            marker.setPosition(e.latLng);
            onCoordsChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        });

        markerRef.current = marker;
        mapInstanceRef.current = map;
      })
      .catch((err) => {
        console.warn("Failed to load Google Maps for Pin Picker:", err);
      });

    return () => {
      isMounted = false;
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map and marker if coords change externally (e.g. from Autocomplete)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const pos = new google.maps.LatLng(coords.lat, coords.lng);
      markerRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
    }
  }, [coords.lat, coords.lng]);

  return (
    <div
      ref={mapContainerRef}
      className={className}
    />
  );
};
