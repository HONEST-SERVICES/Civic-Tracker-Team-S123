import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Sparkles, 
  Radio, 
  Zap, 
  Ticket, 
  Camera, 
  Maximize2, 
  Minimize2, 
  Bot, 
  X,
  Activity
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
  const [liveCaptionText, setLiveCaptionText] = useState<string>('Initializing CivicPulse Live Agent connection...');
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [executedTools, setExecutedTools] = useState<ExecutedToolItem[]>([]);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const captionsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Auto-scroll captions stream
  useEffect(() => {
    captionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captions, executedTools, liveCaptionText]);

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
      setLiveCaptionText('CivicPulse Live Voice Agent Ready');
      setCaptions([]);
      setExecutedTools([]);
      setErrorMessage(null);
      setActiveAction(null);
      return;
    }

    const callbacks: LiveSessionCallbacks = {
      onStateChange: (state) => {
        setSessionState(state);
        if (state === 'LISTENING') {
          setLiveCaptionText(prev => prev.includes('Initializing') ? 'Listening to your voice...' : prev);
        } else if (state === 'SPEAKING') {
          setActiveAction(null);
        }
      },
      onVolumeChange: (v) => {
        setVolumes(v);
      },
      onLiveCaptionText: (text) => {
        setLiveCaptionText(text);
      },
      onCaption: (cap) => {
        setCaptions(prev => [
          ...prev.slice(-15),
          {
            id: Math.random().toString(36).substring(7),
            role: cap.role,
            text: cap.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        ]);
      },
      onToolExecuted: (tool) => {
        setActiveAction(`Executed: ${tool.toolName}`);
        if (tool.result?.message) {
          setLiveCaptionText(tool.result.message);
        }
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
  const orbScale = 1 + Math.min(maxVolume * 2.2, 0.4);

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900/95 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-teal-500/40 shadow-2xl flex items-center gap-4 animate-bounce">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
        <div>
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>CivicPulse Live Agent</span>
            <span className="font-mono text-emerald-400">{formatTimer(callSeconds)}</span>
          </p>
          <p className="text-[10px] text-slate-300">
            {sessionState === 'SPEAKING' ? 'Speaking...' : 'Listening...'}
          </p>
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer"
          title="Expand Call Window"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleEndCall}
          className="p-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-white transition cursor-pointer"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-8 text-white animate-fadeIn font-sans overflow-hidden">
      
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-2 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>⚡ Live Voice Call</span>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              CivicPulse Live Agent
            </h2>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              {userWard} • AI Officer Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/10 font-mono text-sm font-bold text-emerald-400">
            {formatTimer(callSeconds)}
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Stage: Animated Siri/Gemini Amplitude Orb */}
      <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 relative py-4">
        
        {/* Glow Ring Behind Orb */}
        <div 
          className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-teal-500/20 blur-3xl animate-ping opacity-30 pointer-events-none"
          style={{ transform: `scale(${orbScale * 1.25})` }}
        />

        {/* Central Orb */}
        <div 
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-teal-500 via-emerald-400 to-cyan-500 animate-pulse shadow-[0_0_80px_rgba(20,184,166,0.5)] flex items-center justify-center transition-transform duration-100 relative z-10 cursor-pointer"
          style={{ transform: `scale(${orbScale})` }}
        >
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center border border-white/20">
            {sessionState === 'SPEAKING' ? (
              <Radio className="w-12 h-12 text-emerald-300 animate-pulse" />
            ) : sessionState === 'LISTENING' ? (
              <Mic className={`w-12 h-12 ${isMuted ? 'text-rose-400' : 'text-teal-300 animate-bounce'}`} />
            ) : (
              <img src="/logo.png" alt="CivicPulse Logo" className="w-12 h-12 object-contain animate-pulse" />
            )}
          </div>
        </div>

        {/* Status Pill below Orb */}
        <div className="z-10">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border tracking-wide uppercase shadow-lg ${
            activeAction ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :
            sessionState === 'SPEAKING' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
            sessionState === 'LISTENING' ? (isMuted ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-teal-500/20 text-teal-200 border-teal-500/40') :
            'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping" />
            <span>
              {activeAction ? activeAction :
               sessionState === 'SPEAKING' ? 'Speaking...' :
               sessionState === 'LISTENING' ? (isMuted ? 'Microphone Muted' : 'Listening...') :
               'Connecting...'}
            </span>
          </span>

          {errorMessage && (
            <p className="mt-2 text-xs text-rose-400 font-medium max-w-sm mx-auto">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Live Subtitles & Activity Card */}
      <div className="w-full max-w-lg mx-auto space-y-3 shrink-0 mb-4">
        
        {/* Glassmorphic Subtitle Container */}
        <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 text-center min-h-[90px] max-h-[140px] overflow-y-auto flex items-center justify-center shadow-xl">
          <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed italic">
            "{liveCaptionText}"
          </p>
        </div>

        {/* Tool Executed Action Chips */}
        {executedTools.length > 0 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {executedTools.slice(-2).map((t) => (
              <div 
                key={t.id}
                className="px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 shrink-0 animate-fadeIn"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Executed: {t.toolName}</span>
                {t.ticketId && (
                  <button
                    onClick={() => onInspectTicket?.(t.ticketId!)}
                    className="underline text-amber-300 font-bold ml-1 hover:text-white"
                  >
                    #{t.ticketId}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-center gap-6 shrink-0 pb-2">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full border border-white/20 transition-all cursor-pointer shadow-lg ${
            isMuted 
              ? 'bg-amber-500 text-slate-950 border-amber-400' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6 text-emerald-400" />}
        </button>

        <button
          onClick={handleEndCall}
          className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <PhoneOff className="w-5 h-5" />
          <span>End Call</span>
        </button>
      </div>

    </div>
  );
};
