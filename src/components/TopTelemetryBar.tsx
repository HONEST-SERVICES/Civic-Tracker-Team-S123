import React, { useState } from 'react';
import { 
  Building2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  CheckCircle2, 
  Sparkles, 
  ChevronDown, 
  RotateCcw,
  Layers,
  PlusCircle,
  ShieldAlert,
  SlidersHorizontal,
  Compass,
  Zap
} from 'lucide-react';
import { TelemetryStats } from '../types';
import { CRISIS_SCENARIOS } from '../mockData';

interface TopTelemetryBarProps {
  stats: TelemetryStats;
  onSimulateScenario: (scenarioIndex: number) => void;
  onResetData: () => void;
  isDispatching: boolean;
  activeViewMode: 'ALL' | 'CITIZEN' | 'COMMAND';
  onSelectViewMode: (mode: 'ALL' | 'CITIZEN' | 'COMMAND') => void;
  onOpenReportModal?: () => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  stats,
  onSimulateScenario,
  onResetData,
  isDispatching,
  activeViewMode,
  onSelectViewMode,
  onOpenReportModal
}) => {
  const [showScenarioMenu, setShowScenarioMenu] = useState<boolean>(false);

  return (
    <header className="w-full bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm select-none z-30">
      {/* Brand & Municipal Corporation Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-900/40 border border-blue-700/50 text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-base tracking-tight">
                SyncDispatch
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                City Municipal Corporation
              </span>
            </div>
            <div className="text-xs text-slate-400 font-normal flex items-center gap-1.5">
              <span>Public Works & Infrastructure Management</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-medium">Auto-Triage Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center High-Level Civic KPIs */}
      <div className="hidden xl:flex items-center gap-2 2xl:gap-3 flex-wrap">
        {/* KPI 1: Avg. Triage Latency */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="p-1 rounded bg-blue-500/10 text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              Avg. Triage Latency
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {stats.meanTimeToDispatchSec.toFixed(1)}s <span className="text-[10px] text-blue-400 font-normal">(AI Autonomous)</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Active P1 Road Hazards */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="p-1 rounded bg-red-500/10 text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              Active P1 Road Hazards
            </div>
            <div className="text-xs font-semibold text-red-400 flex items-center gap-1">
              <span>{stats.activeSevereHazards} Critical</span>
              {stats.activeSevereHazards > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* KPI 3: Available Repair Crews */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              Available Repair Crews
            </div>
            <div className="text-xs font-semibold text-emerald-400">
              {stats.onlineCrews} Units Online
            </div>
          </div>
        </div>

        {/* KPI 4: SLA Adherence */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="p-1 rounded bg-indigo-500/10 text-indigo-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              Resolution SLA Adherence
            </div>
            <div className="text-xs font-semibold text-slate-200">
              98.6% <span className="text-[10px] text-emerald-400 font-normal">On Target</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Actions, View Switcher & Scenario Menu */}
      <div className="flex items-center gap-2">
        {/* View Mode Switcher (Citizen vs Municipal Command vs All) */}
        <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onSelectViewMode('ALL')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeViewMode === 'ALL'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Integrated View
          </button>
          <button
            onClick={() => onSelectViewMode('CITIZEN')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeViewMode === 'CITIZEN'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Citizen Portal
          </button>
          <button
            onClick={() => onSelectViewMode('COMMAND')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              activeViewMode === 'COMMAND'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Municipal Command
          </button>
        </div>

        {/* Simulate Test Scenarios Dropdown */}
        <div className="relative">
          <button
            id="simulate-crisis-btn"
            disabled={isDispatching}
            onClick={() => setShowScenarioMenu(!showScenarioMenu)}
            title="Test Autonomous Dispatch Engine (⚡)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 border border-amber-400/40 transition-colors text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Simulate Scenarios</span>
            <ChevronDown className={`w-3.5 h-3.5 text-amber-300 transition-transform ${showScenarioMenu ? 'rotate-180' : ''}`} />
          </button>

          {showScenarioMenu && (
            <div className="absolute right-0 mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                <span>Select Civic Test Scenario</span>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="py-1">
                {CRISIS_SCENARIOS.map((scenario, idx) => (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setShowScenarioMenu(false);
                      onSimulateScenario(idx);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex flex-col gap-0.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">
                        {scenario.title}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        scenario.priority === 'P1_CRITICAL'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {scenario.priority === 'P1_CRITICAL' ? 'P1 Critical' : 'P2 Urgent'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {scenario.zone} • {scenario.category.replace(/_/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reset State Button */}
        <button
          id="reset-fleet-btn"
          onClick={onResetData}
          title="Reset to default municipal demonstration state"
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
