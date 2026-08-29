import React from 'react';
import { 
  Clock, 
  Truck, 
  CheckCircle2, 
  MapPin
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
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            P1 Critical
          </span>
        );
      case 'P2_URGENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            P2 Urgent
          </span>
        );
      case 'P3_SCHEDULED':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            P3 Normal
          </span>
        );
    }
  };

  const getStatusBadge = (status: CrisisIncident['status']) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Pending Dispatch
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Dispatched
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Resolved
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden text-sm font-sans select-none">
      {/* Queue Header */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Live Incident Queue & SLA Monitor
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            ({incidents.filter(i => i.status !== 'RESOLVED').length} Active)
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
          MoHUA Real-Time Scoped Queue
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <th className="py-2 px-3">Ticket ID & Priority</th>
              <th className="py-2 px-3">Category & Title</th>
              <th className="py-2 px-3">Location</th>
              <th className="py-2 px-3">Assigned Crew</th>
              <th className="py-2 px-3">SLA Status</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {incidents.map((incident) => {
              const isSelected = selectedIncident?.id === incident.id;
              const isResolved = incident.status === 'RESOLVED';

              return (
                <tr
                  key={incident.id}
                  onClick={() => onSelectIncident(incident)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50/80'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* ID & Priority */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold font-mono text-slate-900">
                      {incident.id}
                    </div>
                    <div className="mt-0.5">
                      {getPriorityBadge(incident.priority)}
                    </div>
                  </td>

                  {/* Category & Title */}
                  <td className="py-2.5 px-3 max-w-[220px]">
                    <div className="font-bold text-slate-900 truncate">
                      {incident.title}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {incident.category === 'STRUCTURAL_SINKHOLE' ? 'Road Cave-in' : incident.category.replace(/_/g, ' ')}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-2.5 px-3 max-w-[160px]">
                    <div className="flex items-center gap-1 text-slate-800 font-medium truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{incident.location.zone}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {incident.location.address}
                    </div>
                  </td>

                  {/* Assigned Crew */}
                  <td className="py-2.5 px-3">
                    {incident.assignedUnitName ? (
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <Truck className="w-3.5 h-3.5 text-[#115e59] shrink-0" />
                        <span className="truncate max-w-[140px] font-semibold">{incident.assignedUnitName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </td>

                  {/* SLA Countdown */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 text-slate-700 font-medium">
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
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
                        >
                          Mark Done
                        </button>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
