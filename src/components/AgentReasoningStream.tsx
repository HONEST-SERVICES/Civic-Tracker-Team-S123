import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  Trash2, 
  Code2, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  Bot
} from 'lucide-react';
import { AgentThoughtStep } from '../types';

interface AgentReasoningStreamProps {
  thoughtLogs: AgentThoughtStep[];
  isDispatching: boolean;
  onClearLogs: () => void;
}

export const AgentReasoningStream: React.FC<AgentReasoningStreamProps> = ({
  thoughtLogs,
  isDispatching,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'TOOL_CALLS' | 'MUTATIONS'>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [thoughtLogs, autoScroll]);

  const filteredLogs = thoughtLogs.filter((log) => {
    if (filter === 'TOOL_CALLS') return log.type === 'FUNCTION_CALL' || log.type === 'FUNCTION_RETURN';
    if (filter === 'MUTATIONS') return log.type === 'MUTATION';
    return true;
  });

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(JSON.stringify(thoughtLogs, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 border-b border-slate-800 overflow-hidden text-xs">
      {/* Header */}
      <div className="px-3.5 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span>Autonomous Dispatch Decision Log</span>
              {isDispatching && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Gemini 3.7 Flash • Function-Calling Audit Trail
            </div>
          </div>
        </div>

        {/* Filter Controls & Actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-800 text-[11px]">
            {(['ALL', 'TOOL_CALLS', 'MUTATIONS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  filter === f ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'TOOL_CALLS' ? 'Tools' : 'State'}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyLogs}
            title="Copy audit log"
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClearLogs}
            title="Clear logs"
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Decision Log List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1.5 py-8">
            <Cpu className="w-6 h-6 stroke-1 text-slate-600" />
            <div className="text-center">
              <p className="text-slate-400 text-xs font-medium">Triage Engine Standby</p>
              <p className="text-[11px] text-slate-500">Submit an issue report or test scenario to observe decision trace</p>
            </div>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isToolCall = log.type === 'FUNCTION_CALL';
            const isToolReturn = log.type === 'FUNCTION_RETURN';
            const isMutation = log.type === 'MUTATION';
            const isSuccess = log.type === 'DISPATCH_CONFIRMED';
            const isAlert = log.type === 'ALERT';

            let typeBadge = 'bg-slate-800 text-slate-300 border-slate-700';
            if (isToolCall) typeBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
            if (isToolReturn) typeBadge = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
            if (isMutation) typeBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            if (isSuccess) typeBadge = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            if (isAlert) typeBadge = 'bg-red-500/10 text-red-400 border-red-500/30';

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors"
              >
                {/* Step Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${typeBadge}`}>
                      {log.type.replace('_', ' ')}
                    </span>
                    {log.toolName && (
                      <span className="text-blue-400 font-medium text-[11px]">
                        {log.toolName}()
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    {log.latencyMs && (
                      <span className="text-slate-400">
                        {log.latencyMs}ms
                      </span>
                    )}
                    <span>{log.timestamp}</span>
                  </div>
                </div>

                {/* Content Message */}
                <div className="text-slate-300 leading-relaxed text-xs">
                  {log.content}
                </div>

                {/* Arguments / Return Payload */}
                {log.toolArgs && (
                  <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800/90 text-slate-300 text-[11px]">
                    <div className="text-[10px] text-slate-500 font-semibold mb-0.5">INPUT ARGS:</div>
                    <pre className="whitespace-pre-wrap font-mono text-[10px] text-blue-300">{JSON.stringify(log.toolArgs, null, 2)}</pre>
                  </div>
                )}

                {log.toolResult && (
                  <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800/90 text-slate-300 text-[11px]">
                    <div className="text-[10px] text-slate-500 font-semibold mb-0.5">DISPATCH OUTPUT:</div>
                    <pre className="whitespace-pre-wrap font-mono text-[10px] text-emerald-300">{JSON.stringify(log.toolResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}

        {isDispatching && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>Autonomous agent evaluating crew availability and closest transit route...</span>
          </div>
        )}
      </div>
    </div>
  );
};
