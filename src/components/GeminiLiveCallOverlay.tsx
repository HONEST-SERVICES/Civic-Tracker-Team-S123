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
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { GeminiLiveService, LiveSessionCallbacks } from '../services/geminiLiveService';

interface GeminiLiveCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onGrievanceTriggered?: (data: { category: string; landmark: string; description: string; ticketId?: string; photoUrl?: string }) => void;
  onInspectTicket?: (ticketId: string) => void;
  onSyncHistory?: (summary: { durationSeconds: number; captions: CaptionItem[]; executedTools: ExecutedToolItem[]; photoUrl?: string }) => void;
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
  onSyncHistory,
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
  const [attachedPhotoUrl, setAttachedPhotoUrl] = useState<string | null>(null);
  const [attachedPhotoName, setAttachedPhotoName] = useState<string | null>(null);

  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const captionsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachedPhotoUrl(dataUrl);
      setAttachedPhotoName(file.name);

      const latestGrievance = executedTools.find(t => t.toolName === 'submitVoiceGrievance');
      if (latestGrievance && onGrievanceTriggered) {
        onGrievanceTriggered({
          category: latestGrievance.result?.category || 'ROADS_POTHOLE',
          landmark: latestGrievance.result?.landmark || 'Ward 4',
          description: latestGrievance.result?.description || '',
          ticketId: latestGrievance.ticketId,
          photoUrl: dataUrl
        });
      }
    };
    reader.readAsDataURL(file);
  };

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

  const handleRetrySession = () => {
    setErrorMessage(null);
    setSessionState('CONNECTING');
    if (liveServiceRef.current) {
      liveServiceRef.current.stopSession();
      liveServiceRef.current.startSession();
    }
  };

  const handleEndCall = () => {
    if (onSyncHistory) {
      onSyncHistory({
        durationSeconds: callSeconds,
        captions,
        executedTools,
        photoUrl: attachedPhotoUrl || undefined
      });
    }
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
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-2xl flex flex-col justify-between text-white animate-fadeIn font-sans overflow-hidden h-[100dvh] max-h-[100dvh] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 sm:px-8 select-none">
      
      {/* Top Tier: Minimal Balanced Navigation Header */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between shrink-0 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-tight text-slate-200">CivicPulse Live</span>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline-block truncate max-w-[200px]">
            {userWard}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 font-mono text-xs font-bold text-emerald-400/90 backdrop-blur-md">
            {formatTimer(callSeconds)}
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Minimize Call"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-2 rounded-full bg-white/[0.06] hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 transition-all cursor-pointer active:scale-95"
            title="Dismiss Call"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Stage: Multi-layered Ambient Voice Orb */}
      <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 relative py-2">
        
        {/* Outer Diffuse Dynamic Glow */}
        <div 
          className={`absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full blur-3xl opacity-35 pointer-events-none transition-all duration-500 ${
            sessionState === 'SPEAKING'
              ? 'bg-gradient-to-tr from-teal-500 to-emerald-400'
              : sessionState === 'LISTENING'
              ? (isMuted ? 'bg-rose-500/30' : 'bg-gradient-to-tr from-indigo-500 to-blue-400')
              : 'bg-gradient-to-tr from-purple-500 to-indigo-500'
          }`}
          style={{ transform: `scale(${orbScale * 1.25})` }}
        />

        {/* Ambient Frosted Sphere */}
        <div 
          className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1 bg-gradient-to-tr shadow-2xl transition-all duration-300 relative z-10 flex items-center justify-center ${
            sessionState === 'SPEAKING'
              ? 'from-teal-400 via-cyan-400 to-emerald-400 shadow-[0_0_60px_rgba(20,184,166,0.4)]'
              : sessionState === 'LISTENING'
              ? (isMuted ? 'from-rose-500 via-amber-500 to-rose-600 shadow-[0_0_50px_rgba(244,63,94,0.3)]' : 'from-indigo-400 via-blue-500 to-teal-400 shadow-[0_0_60px_rgba(99,102,241,0.4)]')
              : 'from-slate-700 via-slate-600 to-slate-800'
          }`}
          style={{ transform: `scale(${orbScale})` }}
        >
          <div className="w-full h-full rounded-full bg-slate-950/85 backdrop-blur-xl flex flex-col items-center justify-center border border-white/20 p-4 relative overflow-hidden">
            
            {/* Responsive Audio Waveform Bars inside Orb */}
            <div className="flex items-center justify-center gap-1.5 h-10 w-full z-10">
              {[0.6, 1.1, 0.7, 1.3, 0.5].map((multiplier, i) => {
                const isSpeaking = sessionState === 'SPEAKING';
                const isListening = sessionState === 'LISTENING';
                const activeVol = isSpeaking ? volumes.agentVolume : isListening ? volumes.userVolume : 0.05;
                const barHeight = Math.max(6, Math.min(36, (activeVol * 110 * multiplier) + 6));
                
                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isSpeaking 
                        ? 'bg-gradient-to-t from-teal-400 to-cyan-300' 
                        : isListening 
                        ? (isMuted ? 'bg-rose-400/60' : 'bg-gradient-to-t from-indigo-400 to-blue-300')
                        : 'bg-white/30'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                );
              })}
            </div>

          </div>
        </div>

        {/* Status Pill Floating below Orb */}
        <div className="z-10 transition-all duration-300 flex flex-col items-center">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-xl backdrop-blur-md transition-all duration-300 ${
            activeAction 
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-amber-500/10 animate-pulse' 
              : sessionState === 'SPEAKING' 
              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-teal-500/10' 
              : sessionState === 'LISTENING' 
              ? (isMuted ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30') 
              : sessionState === 'ERROR'
              ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-rose-500/10'
              : 'bg-white/10 text-slate-300 border border-white/10'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              sessionState === 'SPEAKING' ? 'bg-teal-400 animate-pulse' :
              sessionState === 'LISTENING' ? (isMuted ? 'bg-rose-400' : 'bg-indigo-400 animate-ping') :
              sessionState === 'ERROR' ? 'bg-rose-500' :
              'bg-amber-400'
            }`} />
            <span>
              {activeAction ? activeAction :
               sessionState === 'SPEAKING' ? 'Speaking...' :
               sessionState === 'LISTENING' ? (isMuted ? 'Microphone Muted' : 'Listening...') :
               sessionState === 'CONNECTING' ? 'Establishing Live Stream...' :
               sessionState === 'ERROR' ? 'Connection Error' :
               'Ready'}
            </span>
          </div>

          {errorMessage && (
            <p className="mt-2 text-xs text-rose-300/90 font-medium max-w-sm mx-auto text-center animate-fadeIn px-4 leading-relaxed">
              {errorMessage}
            </p>
          )}

          {sessionState === 'ERROR' && (
            <button
              onClick={handleRetrySession}
              className="mt-3 px-4 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Input for Live Photo Capture */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        onChange={handlePhotoSelect} 
        className="hidden" 
      />

      {/* Bottom Tier: Glassmorphic Subtitles & Control Dock */}
      <div className="w-full max-w-lg mx-auto flex flex-col space-y-3 shrink-0 pb-1">
        
        {/* Attached Photo Banner (If attached) */}
        {attachedPhotoUrl && (
          <div className="w-full bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-2.5 flex items-center justify-between animate-fadeIn backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2.5">
              <img src={attachedPhotoUrl} alt="Attached hazard" className="w-9 h-9 object-cover rounded-xl border border-emerald-400/40" />
              <div className="text-left">
                <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                  <span>Photo Linked to Ticket</span>
                </p>
                <p className="text-[10px] text-slate-300/80 truncate max-w-[180px]">
                  {attachedPhotoName || 'hazard_photo.jpg'}
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl bg-emerald-800/50 hover:bg-emerald-700/60 text-emerald-100 font-medium text-xs transition cursor-pointer"
            >
              Change
            </button>
          </div>
        )}

        {/* Real-time Subtitle / Caption Card */}
        <div className="w-full bg-white/[0.06] backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/10 text-center min-h-[80px] max-h-[120px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex items-center justify-center shadow-2xl relative">
          <p className="text-sm sm:text-base font-normal text-slate-100/90 leading-relaxed tracking-wide italic">
            "{liveCaptionText}"
          </p>
        </div>

        {/* Tool Action Chips */}
        {executedTools.length > 0 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {executedTools.slice(-2).map((t) => (
              <div 
                key={t.id}
                className="px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-1.5 shrink-0 animate-fadeIn backdrop-blur-md"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{t.toolName}</span>
                {t.ticketId && (
                  <button
                    onClick={() => onInspectTicket?.(t.ticketId!)}
                    className="underline text-amber-300 font-semibold hover:text-white ml-0.5"
                  >
                    #{t.ticketId}
                  </button>
                )}
                {t.toolName === 'submitVoiceGrievance' && !attachedPhotoUrl && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase flex items-center gap-1 transition cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Attach Photo</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-6 pt-2">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-full border transition-all cursor-pointer shadow-lg active:scale-95 ${
              isMuted 
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-indigo-300" />}
          </button>

          {/* Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-3.5 rounded-full border transition-all cursor-pointer shadow-lg active:scale-95 ${
              attachedPhotoUrl
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
            }`}
            title="Attach Photo to Report"
          >
            <Camera className="w-5 h-5 text-amber-300" />
          </button>

          {/* End Call Primary Button */}
          <button
            onClick={handleEndCall}
            className="px-7 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-950/60 active:scale-95 transition-all duration-200 flex items-center gap-2.5 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>

      </div>

    </div>
  );
};
