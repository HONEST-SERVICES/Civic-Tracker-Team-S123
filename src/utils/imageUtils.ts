import React from 'react';

/**
 * Image and Avatar Utilities for CivicPulse GovTech Platform
 * Provides robust base64 normalization, fallback placeholders, and error recovery.
 */

// Resilient inline SVG placeholder for civic hazard and inspection photos
export const DEFAULT_CIVIC_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
  <rect width="600" height="400" fill="#0f172a"/>
  <rect x="20" y="20" width="560" height="360" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="300" cy="180" r="48" fill="#334155"/>
  <path d="M282 170C282 165.582 285.582 162 290 162H310C314.418 162 318 165.582 318 170V172H324C328.418 172 332 175.582 332 180V198C332 202.418 328.418 206 324 206H276C271.582 206 268 202.418 268 198V180C268 175.582 271.582 172 276 172H282V170Z" fill="#94a3b8"/>
  <circle cx="300" cy="188" r="10" fill="#1e293b" stroke="#94a3b8" stroke-width="3"/>
  <text x="300" y="260" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">Civic Incident Photo</text>
  <text x="300" y="284" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="13">Municipal Record Attachment</text>
</svg>
`)}`;

/**
 * Normalizes any image source string:
 * - Prepends data URL header if raw base64 string
 * - Passes through standard URLs (http, https, blob, data, relative /)
 * - Returns DEFAULT_CIVIC_PLACEHOLDER if string is null/undefined/empty
 */
export function normalizeImageSrc(src?: string | null, fallback = DEFAULT_CIVIC_PLACEHOLDER): string {
  if (!src || typeof src !== 'string' || !src.trim()) {
    return fallback;
  }
  const clean = src.trim();

  // Standard absolute, relative, or data/blob URLs
  if (
    clean.startsWith('data:image/') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('/') ||
    clean.startsWith('./')
  ) {
    return clean;
  }

  // Raw Base64 string without data prefix
  if (clean.startsWith('/9j/') || clean.startsWith('iVBOR') || clean.startsWith('R0lGOD') || clean.startsWith('UklGR')) {
    return `data:image/jpeg;base64,${clean}`;
  }

  // Any other data: URL prefix
  if (clean.startsWith('data:')) {
    return clean;
  }

  // Default assumption for raw Base64 payloads
  if (/^[A-Za-z0-9+/=]+$/.test(clean.slice(0, 100))) {
    return `data:image/jpeg;base64,${clean}`;
  }

  return clean;
}

/**
 * Recovers from broken image link gracefully by replacing with fallback placeholder
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_CIVIC_PLACEHOLDER
) {
  const target = e.currentTarget;
  if (!target.dataset.fallbackApplied) {
    target.dataset.fallbackApplied = 'true';
    target.src = fallbackSrc;
  }
}

/**
 * Extracts clean user initial (e.g., "A" for "Avinash Peela")
 */
export function getUserInitial(name?: string | null): string {
  if (!name || !name.trim()) return 'A';
  const clean = name.trim();
  return clean.charAt(0).toUpperCase();
}
