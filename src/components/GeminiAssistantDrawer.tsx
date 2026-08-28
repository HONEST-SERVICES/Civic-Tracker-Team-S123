import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  RotateCcw, 
  Layers, 
  ChevronRight, 
  Lightbulb, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Compass, 
  ArrowUpRight,
  Zap,
  Flame
} from 'lucide-react';
import { UserRole, CrisisIncident, MunicipalUnit } from '../types';
import { queryGeminiAssistant, GeminiAssistantMessage } from '../services/geminiService';

interface GeminiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  userWard?: string;
  incidents: CrisisIncident[];
  availableUnits?: MunicipalUnit[];
  onApplyDraft?: (draft: { title?: string; category?: string; description?: string }) => void;
}

export const GeminiAssistantDrawer: React.FC<GeminiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  userRole,
  userWard = 'Ward 4 - Central Zone',
  incidents,
  availableUnits = [],
  onApplyDraft
}) => {
  const isOfficerPersona = userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN' || userRole === 'SWACHH_SURVEKSHAN_AUDITOR';
  const [selectedPersona, setSelectedPersona] = useState<'CITIZEN' | 'OFFICER'>(isOfficerPersona ? 'OFFICER' : 'CITIZEN');
  
  const [messages, setMessages] = useState<GeminiAssistantMessage[]>([
    {
      role: 'assistant',
      content: isOfficerPersona 
        ? `**Namaste Officer.** I am your Swachhata-MoHUA Gemini Copilot. I can synthesize real-time incident reports across ${userWard}, compute optimal crew dispatch routes, and flag high-risk bottleneck areas.`
        : `**Namaste Citizen.** I am your Swachhata-MoHUA Gemini Civic Assistant. Need help drafting an official grievance, finding the right category, or checking statutory SLAs? Ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const citizenChips = [
    "Draft description for deep pothole",
    "Report uncollected garbage dump",
    "Check Ward 4 resolution SLA status",
    "Find nearest open SBM public toilet",
    "How to report broken streetlights"
  ];

  const officerChips = [
    "Summarize Ward 4 active grievances",
    "Suggest optimal crew dispatch routing",
    "Flag high-risk bottleneck hazard areas",
    "Swachh Survekshan compliance overview",
    "Audit Ward 4 SLA adherence rates"
  ];

  const activeChips = selectedPersona === 'CITIZEN' ? citizenChips : officerChips;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isLoading) return;

    const userMsg: GeminiAssistantMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsLoading(true);

    try {
      const reply = await queryGeminiAssistant(query, selectedPersona, {
        ward: userWard,
        incidentsCount: incidents.length,
        activeIncidents: incidents,
        availableUnits
      });

      const assistantMsg: GeminiAssistantMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.warn('Assistant error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I encountered a network hiccup connecting to the Gemini reasoning engine. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: selectedPersona === 'OFFICER'
          ? `**Copilot Reset.** Ready to analyze ward operations and routing in ${userWard}.`
          : `**Assistant Ready.** How can I assist you with your municipal grievance today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      {/* Click outside to close backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300 shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base text-white">Gemini AI Municipal Copilot</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.2 rounded">
                  2.5 Flash
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">Swachhata-MoHUA Intelligent Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close drawer"
              className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Persona Mode Switcher */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-[#2d7a70]" />
            Assistant Mode:
          </span>
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setSelectedPersona('CITIZEN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedPersona === 'CITIZEN'
                  ? 'bg-white text-[#2d7a70] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Citizen Mode
            </button>
            <button
              type="button"
              onClick={() => setSelectedPersona('OFFICER')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedPersona === 'OFFICER'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Officer & Auditor Mode
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                {msg.role === 'user' ? (
                  <>
                    <span>You</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span className="font-bold text-emerald-800">Gemini Copilot</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-[#2d7a70] text-white rounded-tr-xs font-medium'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs space-y-2'
                }`}
              >
                {/* Format markdown-like text */}
                <div className="whitespace-pre-wrap font-sans text-xs space-y-1">
                  {msg.content}
                </div>

                {/* Assistant Message Actions */}
                {msg.role === 'assistant' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content, idx)}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Response</span>
                        </>
                      )}
                    </button>

                    {onApplyDraft && selectedPersona === 'CITIZEN' && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyDraft({
                            description: msg.content
                          });
                          onClose();
                        }}
                        className="text-[#2d7a70] hover:text-[#23635b] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Use in Grievance Form</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs p-3 bg-white rounded-2xl border border-slate-200 w-fit animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Gemini is analyzing municipal data & reasoning...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Suggested Inquiries:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {activeChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                selectedPersona === 'CITIZEN'
                  ? "Ask about SLAs, draft a grievance, find toilets..."
                  : "Query Ward 4 bottlenecks, triage crews, compute routes..."
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2d7a70] disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="h-9 px-4 rounded-xl bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
