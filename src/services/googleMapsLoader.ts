import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { getGoogleMapsApiKey } from "../config/keys";

let loaderPromise: Promise<typeof google.maps> | null = null;
let optionsConfigured = false;

/**
 * Load Google Maps JavaScript API and libraries ('places', 'marker', 'geometry')
 */
export function loadGoogleMapsApi(): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps cannot be loaded in server context"));
  }

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  if (!optionsConfigured) {
    setOptions({
      key: apiKey || "",
      v: "weekly",
      language: "en"
    });
    optionsConfigured = true;
  }

  loaderPromise = (async () => {
    try {
      await importLibrary("maps");
      await importLibrary("places");
      await importLibrary("marker");
      return window.google.maps;
    } catch (err) {
      loaderPromise = null;
      console.warn("Failed to load Google Maps JS API:", err);
      throw err;
    }
  })();

  return loaderPromise;
}
