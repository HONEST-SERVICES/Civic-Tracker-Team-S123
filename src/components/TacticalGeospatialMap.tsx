import React from 'react';
import { CrisisIncident, MunicipalUnit, PublicFacility } from '../types';
import { GoogleTacticalMap } from './GoogleTacticalMap';

interface TacticalGeospatialMapProps {
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

/**
 * Tactical Geospatial Command Map powered by Google Maps JavaScript API
 */
export const TacticalGeospatialMap: React.FC<TacticalGeospatialMapProps> = (props) => {
  return <GoogleTacticalMap {...props} />;
};

