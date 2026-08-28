import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Truck, 
  CheckCircle2, 
  MapPin, 
  Navigation, 
  ChevronRight, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { CrisisIncident } from '../types';

interface LiveIncidentQueueProps {
  incidents: CrisisIncident[];
  selectedIncident: CrisisIncident | null;
  onSelectIncident: (incident: CrisisIncident | null) => void;
  onUpdateIncidentStatus: (incidentId: string, newStatus: CrisisIncident['status']) => void;
}

export const LiveIncidentQueue: React.FC<LiveIncidentQueueProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onUpdateIncidentStatus
}) => {
  const getPriorityBadge = (priority: CrisisIncident['priority']) => {
    switch (priority) {
      case 'P1_CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            P1 Critical
          </span>
        );
      case 'P2_URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            P2 Urgent
          </span>
        );
      case 'P3_SCHEDULED':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            P3 Normal
          </span>
        );
    }
  };

  const getStatusBadge = (status: CrisisIncident['status']) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Pending Dispatch
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Dispatched
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            In Remediation
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Resolved
          </span>
        );
    }
  };

  return (
    <div className="h-64 sm:h-72 border-t border-slate-800 bg-slate-950 flex flex-col overflow-hidden text-sm">
      {/* Queue Header */}
      <div className="px-4 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Live Incident Queue & SLA Monitor
          </h3>
          <span className="text-xs text-slate-400 font-normal">
            ({incidents.filter(i => i.status !== 'RESOLVED').length} Active Issues)
          </span>
        </div>

        <div className="text-xs text-slate-400">
          Showing real-time municipal responses
        </div>
      </div>

      {/* Table / Card List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/30 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2 px-3">Incident ID</th>
              <th className="py-2 px-3">Category & Title</th>
              <th className="py-2 px-3">Location</th>
              <th className="py-2 px-3">Assigned Crew</th>
              <th className="py-2 px-3">SLA Status</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {incidents.map((incident) => {
              const isSelected = selectedIncident?.id === incident.id;
              const isResolved = incident.status === 'RESOLVED';

              return (
                <tr
                  key={incident.id}
                  onClick={() => onSelectIncident(incident)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-950/30'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  {/* ID & Priority */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200">
                        {incident.id}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      {getPriorityBadge(incident.priority)}
                    </div>
                  </td>

                  {/* Category & Title */}
                  <td className="py-2.5 px-3 max-w-[220px]">
                    <div className="font-medium text-slate-200 truncate">
                      {incident.title}
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {incident.category === 'STRUCTURAL_SINKHOLE' ? 'Road Cave-in' : incident.category.replace(/_/g, ' ')}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-2.5 px-3 max-w-[160px]">
                    <div className="flex items-center gap-1 text-slate-300 font-medium truncate">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{incident.location.zone}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {incident.location.address}
                    </div>
                  </td>

                  {/* Assigned Crew */}
                  <td className="py-2.5 px-3">
                    {incident.assignedUnitName ? (
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Truck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate max-w-[140px] font-medium">{incident.assignedUnitName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                    )}
                  </td>

                  {/* SLA Countdown */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 text-slate-300 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {isResolved
                          ? 'Resolved'
                          : `SLA: ${incident.targetResolutionMinutes || 45}m left`}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      {getStatusBadge(incident.status)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {incident.status !== 'RESOLVED' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateIncidentStatus(incident.id, 'RESOLVED');
                          }}
                          className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Mark Done
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Complete
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
