import { ZONES } from '../mockData';
import { loadGoogleMapsApi } from './googleMapsLoader';

export interface ReverseGeocodeResult {
  formattedAddress: string;
  street: string;
  locality: string;
  city: string;
  postalCode: string;
  ward: string;
  wardId: string;
  lat: number;
  lng: number;
  isFallback: boolean;
}

/**
 * Calculates distance to municipal ward centroids and returns the closest ward.
 */
export function getClosestWard(lat: number, lng: number) {
  let minDistance = Infinity;
  let closestWard = ZONES[0];

  for (const zone of ZONES) {
    const dLat = lat - zone.lat;
    const dLng = lng - zone.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistance) {
      minDistance = dist;
      closestWard = zone;
    }
  }

  return closestWard;
}

/**
 * Reverse Geocodes coordinates to a human-readable street landmark address.
 * Resilient pipeline: Nominatim API -> Google Maps Geocoder -> Instant Offline GPS Fallback.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  timeoutMs: number = 4000
): Promise<ReverseGeocodeResult> {
  const ward = getClosestWard(lat, lng);

  // 1. Primary Lookup: OpenStreetMap Nominatim HTTP API with timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.residential || '';
        const locality = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.industrial || '';
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Amritsar';
        const postalCode = addr.postcode || '';

        const parts: string[] = [];
        if (street) parts.push(street);
        if (locality && locality !== street) parts.push(locality);
        if (ward?.name && !parts.some(p => p.toLowerCase().includes(ward.name.toLowerCase()))) {
          parts.push(ward.name);
        }
        if (city) parts.push(city);
        if (postalCode) parts.push(`PIN ${postalCode}`);

        const formattedAddress = parts.length > 0 
          ? parts.join(', ')
          : (data.display_name || `GPS Pin: [${lat.toFixed(4)}°, ${lng.toFixed(4)}°] (${ward.name})`);

        return {
          formattedAddress,
          street,
          locality,
          city,
          postalCode,
          ward: ward.name,
          wardId: ward.id,
          lat,
          lng,
          isFallback: false
        };
      }
    }
  } catch (err) {
    // Network failure or timeout - proceed to secondary/fallback
  }

  // 2. Secondary Lookup: Google Maps Geocoder if JS API is loaded
  try {
    const maps = await loadGoogleMapsApi();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      });

      if (result && result.formatted_address) {
        let street = '';
        let locality = '';
        let city = '';
        let postalCode = '';

        for (const comp of result.address_components) {
          if (comp.types.includes('route')) street = comp.long_name;
          if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) locality = comp.long_name;
          if (comp.types.includes('locality')) city = comp.long_name;
          if (comp.types.includes('postal_code')) postalCode = comp.long_name;
        }

        return {
          formattedAddress: result.formatted_address,
          street,
          locality,
          city: city || 'Amritsar',
          postalCode,
          ward: ward.name,
          wardId: ward.id,
          lat,
          lng,
          isFallback: false
        };
      }
    }
  } catch (err) {
    // Google Maps Geocoder unavailable
  }

  // 3. Fallback & Offline Safety
  const fallbackAddress = `GPS Pin: [${lat.toFixed(4)}°, ${lng.toFixed(4)}°] (${ward.name})`;
  return {
    formattedAddress: fallbackAddress,
    street: '',
    locality: '',
    city: 'Amritsar',
    postalCode: '',
    ward: ward.name,
    wardId: ward.id,
    lat,
    lng,
    isFallback: true
  };
}

/**
 * Gets user's current GPS position using browser Geolocation API with fallback.
 */
export function getCurrentUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({ lat: 31.2530, lng: 75.7030 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5))
        });
      },
      (err) => {
        console.warn('Geolocation capture notice:', err);
        resolve({ lat: 31.2530, lng: 75.7030 });
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
}
