import React, { useEffect, useRef } from 'react';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';

interface GooglePinPickerMapProps {
  coords: { lat: number; lng: number };
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
  onAddressDiscovered?: (formattedAddress: string) => void;
  className?: string;
}

export const GooglePinPickerMap: React.FC<GooglePinPickerMapProps> = ({
  coords,
  onCoordsChange,
  onAddressDiscovered,
  className = "w-full h-36 rounded-xl border border-slate-200 overflow-hidden relative z-0"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Helper to reverse geocode coordinates to street landmark
  const reverseGeocode = (lat: number, lng: number) => {
    if (!onAddressDiscovered || !geocoderRef.current) return;
    try {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          onAddressDiscovered(results[0].formatted_address);
        }
      });
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        geocoderRef.current = new maps.Geocoder();

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
            const lat = pos.lat();
            const lng = pos.lng();
            onCoordsChange({ lat, lng });
            reverseGeocode(lat, lng);
          }
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition(e.latLng);
            onCoordsChange({ lat, lng });
            reverseGeocode(lat, lng);
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
      geocoderRef.current = null;
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
