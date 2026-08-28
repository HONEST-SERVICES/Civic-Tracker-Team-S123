import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Sparkles } from 'lucide-react';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';

interface GooglePlacesAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (coords: { lat: number; lng: number }, formattedAddress: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const GooglePlacesAutocompleteInput: React.FC<GooglePlacesAutocompleteInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "e.g. Cinema Road, Outside Verad Gate, Ward 4",
  className = "",
  required = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isPlacesReady, setIsPlacesReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !inputRef.current) return;
        if (!maps.places || !maps.places.Autocomplete) return;

        const autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: ['geometry', 'formatted_address', 'name', 'vicinity'],
          componentRestrictions: { country: 'in' } // Default to India (+91 Swachhata MoHUA)
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || place.name || '';
            onChange(address);
            if (onPlaceSelect) {
              onPlaceSelect({ lat, lng }, address);
            }
          }
        });

        autocompleteRef.current = autocomplete;
        setIsPlacesReady(true);
      })
      .catch((err) => {
        console.warn("Places Autocomplete not available, fallback to text input:", err);
      });

    return () => {
      isMounted = false;
      if (autocompleteRef.current && window.google?.maps?.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2d7a70] ${className}`}
        />
        <MapPin className="w-4 h-4 text-[#2d7a70] absolute left-3 pointer-events-none" />
        {isPlacesReady && (
          <span
            title="Google Places Autocomplete Active"
            className="absolute right-2.5 flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-semibold pointer-events-none"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Places</span>
          </span>
        )}
      </div>
    </div>
  );
};
