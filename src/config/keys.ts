/**
 * Centralized Configuration & Secure API Keys Manager
 * Priority resolution:
 * 1. import.meta.env.VITE_* environment variables (Cloudflare / CI / Production builds)
 * 2. localStorage fallback (Custom user settings / Local testing)
 * 3. Default demo fallback credentials
 */

import firebaseAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId?: string;
}

const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: "AIzaSyBTEeCUBJOGkeQBYrcunJR8JFMiWOJrNXs",
  authDomain: "omnisync-pothole.firebaseapp.com",
  projectId: "omnisync-pothole",
  storageBucket: "omnisync-pothole.firebasestorage.app",
  messagingSenderId: "375848058708",
  appId: "1:375848058708:web:efe864b4152e76d3f7d2c1",
  measurementId: "G-X0BKP2X3RF"
};

/**
 * Get the current resolved Google Maps API Key
 * Order: import.meta.env.VITE_GOOGLE_MAPS_API_KEY -> localStorage -> fallback demo key
 */
export function getGoogleMapsApiKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().length > 0) {
    return envKey.trim();
  }

  const localKey = localStorage.getItem("GOOGLE_MAPS_API_KEY");
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim();
  }

  return "";
}

/**
 * Persist Google Maps API key
 */
export function setGoogleMapsApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || key.trim() === "") {
      localStorage.removeItem("GOOGLE_MAPS_API_KEY");
    } else {
      localStorage.setItem("GOOGLE_MAPS_API_KEY", key.trim());
    }
  }
}

/**
 * Get the current resolved Gemini API Key
 */
export function getGeminiApiKey(): string {
  if (typeof window === "undefined") {
    return process.env.GEMINI_API_KEY || "";
  }
  
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().length > 0) {
    return envKey.trim();
  }

  const localKey = localStorage.getItem("GEMINI_API_KEY");
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim();
  }

  return "";
}

/**
 * Check if a valid Gemini API Key is configured
 */
export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

/**
 * Persist Gemini API Key in localStorage for testing
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || key.trim() === "") {
      localStorage.removeItem("GEMINI_API_KEY");
    } else {
      localStorage.setItem("GEMINI_API_KEY", key.trim());
    }
  }
}

/**
 * Get dynamic Firebase configuration with env & localStorage overrides
 */
export function getFirebaseConfig(): FirebaseClientConfig {
  if (typeof window === "undefined") {
    return DEFAULT_FIREBASE_CONFIG;
  }

  const env = (import.meta as any).env || {};

  return {
    apiKey:
      env.VITE_FIREBASE_API_KEY ||
      localStorage.getItem("FIREBASE_API_KEY") ||
      DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain:
      env.VITE_FIREBASE_AUTH_DOMAIN ||
      localStorage.getItem("FIREBASE_AUTH_DOMAIN") ||
      DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId:
      env.VITE_FIREBASE_PROJECT_ID ||
      localStorage.getItem("FIREBASE_PROJECT_ID") ||
      DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket:
      env.VITE_FIREBASE_STORAGE_BUCKET ||
      localStorage.getItem("FIREBASE_STORAGE_BUCKET") ||
      DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      localStorage.getItem("FIREBASE_MESSAGING_SENDER_ID") ||
      DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId:
      env.VITE_FIREBASE_APP_ID ||
      localStorage.getItem("FIREBASE_APP_ID") ||
      DEFAULT_FIREBASE_CONFIG.appId,
    measurementId:
      env.VITE_FIREBASE_MEASUREMENT_ID ||
      localStorage.getItem("FIREBASE_MEASUREMENT_ID") ||
      DEFAULT_FIREBASE_CONFIG.measurementId
  };
}

/**
 * Update custom Firebase config in localStorage
 */
export function setFirebaseConfig(customConfig: Partial<FirebaseClientConfig>): void {
  if (typeof window === "undefined") return;

  if (customConfig.apiKey !== undefined) {
    if (customConfig.apiKey) localStorage.setItem("FIREBASE_API_KEY", customConfig.apiKey);
    else localStorage.removeItem("FIREBASE_API_KEY");
  }
  if (customConfig.projectId !== undefined) {
    if (customConfig.projectId) localStorage.setItem("FIREBASE_PROJECT_ID", customConfig.projectId);
    else localStorage.removeItem("FIREBASE_PROJECT_ID");
  }
  if (customConfig.authDomain !== undefined) {
    if (customConfig.authDomain) localStorage.setItem("FIREBASE_AUTH_DOMAIN", customConfig.authDomain);
    else localStorage.removeItem("FIREBASE_AUTH_DOMAIN");
  }
  if (customConfig.storageBucket !== undefined) {
    if (customConfig.storageBucket) localStorage.setItem("FIREBASE_STORAGE_BUCKET", customConfig.storageBucket);
    else localStorage.removeItem("FIREBASE_STORAGE_BUCKET");
  }
  if (customConfig.appId !== undefined) {
    if (customConfig.appId) localStorage.setItem("FIREBASE_APP_ID", customConfig.appId);
    else localStorage.removeItem("FIREBASE_APP_ID");
  }
}

/**
 * Clear all custom testing credentials from localStorage
 */
export function clearCustomApiKeys(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("GEMINI_API_KEY");
  localStorage.removeItem("FIREBASE_API_KEY");
  localStorage.removeItem("FIREBASE_PROJECT_ID");
  localStorage.removeItem("FIREBASE_AUTH_DOMAIN");
  localStorage.removeItem("FIREBASE_STORAGE_BUCKET");
  localStorage.removeItem("FIREBASE_APP_ID");
}
