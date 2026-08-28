import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  Sliders, 
  ChevronRight,
  RotateCcw,
  Wrench,
  Gauge,
  UserCheck
} from 'lucide-react';
import { MunicipalUnit, UnitStatus } from '../types';

interface MunicipalResourceMatrixProps {
  units: MunicipalUnit[];
  selectedUnit: MunicipalUnit | null;
  onSelectUnit: (unit: MunicipalUnit | null) => void;
  onUpdateUnitStatus: (unitId: string, status: UnitStatus) => void;
}

export const MunicipalResourceMatrix: React.FC<MunicipalResourceMatrixProps> = ({
  units,
  selectedUnit,
  onSelectUnit,
  onUpdateUnitStatus
}) => {
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const getStatusBadge = (status: UnitStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            AVAILABLE
          </span>
        );
      case 'DISPATCHED':
      case 'EN_ROUTE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            EN ROUTE
          </span>
        );
      case 'ON_SITE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            ON SITE
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-64 sm:h-72 flex flex-col bg-slate-950 overflow-hidden text-xs">
      {/* Matrix Header */}
      <div className="px-3.5 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Municipal Fleet Inventory
            </h3>
            <span className="text-[11px] text-slate-400">
              {units.filter(u => u.status === 'AVAILABLE').length} of {units.length} Units Ready
            </span>
          </div>
        </div>

        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          City Depot Grid
        </span>
      </div>

      {/* Fleet Units List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5">
        {units.map((unit) => {
          const isSelected = selectedUnit?.id === unit.id;
          const isAvailable = unit.status === 'AVAILABLE';

          return (
            <div
              key={unit.id}
              onClick={() => onSelectUnit(unit)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-blue-500/60 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 text-xs">
                      {unit.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>Base: {unit.baseZone}</span>
                      <span className="text-slate-600">•</span>
                      <span>Crew: {unit.driverCrew.split('&')[0]}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {getStatusBadge(unit.status)}
                </div>
              </div>

              {/* Equipment Capacity & Metrics */}
              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                <span className="truncate max-w-[200px] text-slate-400">
                  {unit.capacity}
                </span>

                <div className="flex items-center gap-1">
                  {unit.status !== 'AVAILABLE' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateUnitStatus(unit.id, 'AVAILABLE');
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      Recall to Base
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-medium text-[10px]">
                      Standby
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
