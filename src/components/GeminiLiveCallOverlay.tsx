import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Sparkles, 
  Radio, 
  Zap, 
  Ticket, 
  AlertTriangle, 
  ShieldCheck, 
  Camera, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Bot, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';
import { GeminiLiveService, LiveSessionCallbacks } from '../services/geminiLiveService';

interface GeminiLiveCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onGrievanceTriggered?: (data: { category: string; landmark: string; description: string; ticketId?: string }) => void;
  onInspectTicket?: (ticketId: string) => void;
  userRole?: string;
  userWard?: string;
}

interface CaptionItem {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface ExecutedToolItem {
  id: string;
  toolName: string;
  ticketId?: string;
  timestamp: string;
  result: any;
}

export const GeminiLiveCallOverlay: React.FC<GeminiLiveCallOverlayProps> = ({
  isOpen,
  onClose,
  onGrievanceTriggered,
  onInspectTicket,
  userRole = 'CITIZEN',
  userWard = 'Ward 4 - Central Zone'
}) => {
  const [sessionState, setSessionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'LISTENING' | 'SPEAKING' | 'ERROR'>('DISCONNECTED');
  const [isMuted, setIsMuted] = useState(false);
  const [volumes, setVolumes] = useState({ userVolume: 0, agentVolume: 0 });
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [executedTools, setExecutedTools] = useState<ExecutedToolItem[]>([]);
  const [callSeconds, setCallSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const captionsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Auto-scroll captions
  useEffect(() => {
    captionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captions, executedTools]);

  // Call duration timer
  useEffect(() => {
    if (isOpen && (sessionState === 'CONNECTED' || sessionState === 'LISTENING' || sessionState === 'SPEAKING')) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setCallSeconds(prev => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, sessionState]);

  // Start live session when opened
  useEffect(() => {
    if (!isOpen) {
      if (liveServiceRef.current) {
        liveServiceRef.current.stopSession();
        liveServiceRef.current = null;
      }
      setSessionState('DISCONNECTED');
      setCallSeconds(0);
      setCaptions([]);
      setExecutedTools([]);
      setErrorMessage(null);
      return;
    }

    const callbacks: LiveSessionCallbacks = {
      onStateChange: (state) => {
        setSessionState(state);
      },
      onVolumeChange: (v) => {
        setVolumes(v);
      },
      onCaption: (cap) => {
        setCaptions(prev => [
          ...prev.slice(-20),
          {
            id: Math.random().toString(36).substring(7),
            role: cap.role,
            text: cap.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        ]);
      },
      onToolExecuted: (tool) => {
        setExecutedTools(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            toolName: tool.toolName,
            ticketId: tool.ticketId,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            result: tool.result
          }
        ]);
      },
      onGrievanceTriggered: (data) => {
        if (onGrievanceTriggered) {
          onGrievanceTriggered(data);
        }
      },
      onError: (err) => {
        setErrorMessage(err);
      }
    };

    const service = new GeminiLiveService(callbacks);
    liveServiceRef.current = service;
    service.startSession();

    return () => {
      if (liveServiceRef.current) {
        liveServiceRef.current.stopSession();
        liveServiceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMute = () => {
    if (liveServiceRef.current) {
      const muted = liveServiceRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleEndCall = () => {
    if (liveServiceRef.current) {
      liveServiceRef.current.stopSession();
      liveServiceRef.current = null;
    }
    onClose();
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic visualizer orb sizing based on audio volume
  const maxVolume = Math.max(volumes.userVolume, volumes.agentVolume);
  const orbScale = 1 + Math.min(maxVolume * 2.5, 0.45);
  const orbPulseColor = sessionState === 'SPEAKING'
    ? 'from-teal-400 via-emerald-400 to-cyan-500 shadow-teal-500/50'
    : 'from-[#0d5c52] via-emerald-600 to-teal-800 shadow-emerald-500/30';

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl border border-teal-500/40 shadow-2xl flex items-center gap-3 animate-bounce">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
        <div>
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>Gemini Multimodal Live</span>
            <span className="font-mono text-emerald-400">{formatTimer(callSeconds)}</span>
          </p>
          <p className="text-[10px] text-slate-300">
            {sessionState === 'SPEAKING' ? 'Gemini speaking...' : 'Listening...'}
          </p>
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
          title="Expand Call Window"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleEndCall}
          className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white transition cursor-pointer"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans animate-in fade-in duration-250">
      <div className="relative w-full max-w-xl bg-slate-900 border border-teal-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[720px] text-white">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border-b border-teal-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Gemini Live Voice Officer
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold">
                  {formatTimer(callSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-teal-200/80 font-medium">
                Real-Time Audio Stream • {userWard}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Minimize window"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 text-slate-300 hover:text-white hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
              title="Close overlay"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Siri-Style Animated Orb Visualizer */}
        <div className="py-8 sm:py-10 bg-radial from-teal-950/60 via-slate-900 to-slate-950 flex flex-col items-center justify-center shrink-0 border-b border-slate-800/60 relative overflow-hidden">
          
          {/* Animated Background Pulse Rings */}
          <div 
            className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-teal-500/10 blur-2xl animate-ping opacity-30"
            style={{ transform: `scale(${orbScale * 1.2})` }}
          />

          <div 
            className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-emerald-500/20 blur-xl transition-transform duration-100"
            style={{ transform: `scale(${orbScale})` }}
          />

          {/* Main Siri-Style Glowing Orb */}
          <div 
            className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr ${orbPulseColor} p-1 shadow-2xl transition-all duration-150 flex items-center justify-center`}
            style={{ transform: `scale(${orbScale})` }}
          >
            <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
              {sessionState === 'SPEAKING' ? (
                <Radio className="w-8 h-8 text-emerald-300 animate-pulse" />
              ) : sessionState === 'LISTENING' ? (
                <Mic className={`w-8 h-8 ${isMuted ? 'text-rose-400' : 'text-teal-300 animate-bounce'}`} />
              ) : sessionState === 'CONNECTING' ? (
                <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />
              ) : (
                <Bot className="w-8 h-8 text-teal-400" />
              )}
            </div>
          </div>

          {/* State Text Badge */}
          <div className="mt-4 text-center space-y-1 z-10">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              sessionState === 'SPEAKING' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
              sessionState === 'LISTENING' ? 'bg-teal-500/20 text-teal-200 border-teal-500/40' :
              sessionState === 'CONNECTING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>
                {sessionState === 'SPEAKING' ? 'Gemini AI Speaking...' :
                 sessionState === 'LISTENING' ? (isMuted ? 'Microphone Muted' : 'Listening to your voice...') :
                 sessionState === 'CONNECTING' ? 'Establishing WebSocket Audio Stream...' :
                 'Live Voice Agent Ready'}
              </span>
            </span>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium max-w-xs mx-auto">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Live Conversation Captions & Tool Execution Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs bg-slate-950/80">
          
          {/* Welcome Prompt */}
          <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-2xl text-teal-200 space-y-1">
            <p className="font-bold text-xs text-teal-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Live Multimodal Assistant Active</span>
            </p>
            <p className="text-[11px] text-teal-300/80 leading-relaxed">
              Speak naturally in English or Hindi to check ticket status, report a voice grievance, or request high-priority commissioner escalation.
            </p>
          </div>

          {/* Real-time Executed Tools Chips */}
          {executedTools.map((t) => (
            <div
              key={t.id}
              className="p-3.5 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl text-emerald-100 space-y-2 shadow-lg animate-in slide-in-from-bottom duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-emerald-300">
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>⚡ Tool Executed: {t.toolName}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">{t.timestamp}</span>
              </div>

              <div className="text-xs text-emerald-200/90 font-medium">
                {t.result?.message || JSON.stringify(t.result)}
              </div>

              {/* Action Buttons for Tool Result */}
              {t.toolName === 'submitVoiceGrievance' && (
                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onGrievanceTriggered) {
                        onGrievanceTriggered({
                          category: t.result?.category || 'ROADS_POTHOLE',
                          landmark: t.result?.landmark || 'Ward 4',
                          description: t.result?.description || 'Voice Grievance',
                          ticketId: t.result?.ticketId
                        });
                      }
                      onClose();
                    }}
                    className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>📸 Open Photo Upload Step Now</span>
                  </button>
                </div>
              )}

              {t.ticketId && onInspectTicket && (
                <button
                  onClick={() => onInspectTicket(t.ticketId!)}
                  className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 underline cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Inspect Ticket #{t.ticketId}</span>
                </button>
              )}
            </div>
          ))}

          {/* Live Captions Stream */}
          {captions.map((cap) => (
            <div
              key={cap.id}
              className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                cap.role === 'user'
                  ? 'bg-teal-800/60 text-teal-100 ml-auto rounded-tr-xs border border-teal-600/40'
                  : 'bg-slate-800/80 text-slate-200 mr-auto rounded-tl-xs border border-slate-700/80'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <span className="font-bold uppercase tracking-wider">{cap.role === 'user' ? 'You' : 'Gemini AI'}</span>
                <span>•</span>
                <span>{cap.timestamp}</span>
              </div>
              <p className="text-xs font-medium whitespace-pre-wrap">{cap.text}</p>
            </div>
          ))}

          <div ref={captionsEndRef} />
        </div>

        {/* Bottom Call Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 shrink-0">
          <button
            onClick={toggleMute}
            className={`py-3 px-5 rounded-2xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg ${
              isMuted 
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {isMuted ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Unmute Mic</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Mute Mic</span>
              </>
            )}
          </button>

          <button
            onClick={handleEndCall}
            className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-900/40"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Voice Call</span>
          </button>
        </div>

      </div>
    </div>
  );
};
