import React from 'react';
import { CrisisIncident, MunicipalUnit } from '../types';
import { GoogleTacticalMap } from './GoogleTacticalMap';

interface TacticalGeospatialMapProps {
  incidents: CrisisIncident[];
  units: MunicipalUnit[];
  selectedIncident: CrisisIncident | null;
  onSelectIncident: (incident: CrisisIncident | null) => void;
  onSelectUnit: (unit: MunicipalUnit | null) => void;
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status']) => void;
  activeZoneCenter?: { lat: number; lng: number } | null;
}

/**
 * Tactical Geospatial Command Map powered by Google Maps JavaScript API
 */
export const TacticalGeospatialMap: React.FC<TacticalGeospatialMapProps> = (props) => {
  return <GoogleTacticalMap {...props} />;
};
