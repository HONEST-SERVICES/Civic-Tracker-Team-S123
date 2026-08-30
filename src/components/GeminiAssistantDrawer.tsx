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
  Flame,
  ExternalLink,
  Ticket,
  PhoneCall
} from 'lucide-react';
import { UserRole, CrisisIncident, MunicipalUnit } from '../types';
import { queryGeminiAssistant, GeminiAssistantMessage } from '../services/geminiService';
import { INITIAL_PUBLIC_FACILITIES } from '../mockData';
import { GeminiLiveCallOverlay } from './GeminiLiveCallOverlay';

interface GeminiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  userWard?: string;
  currentUser?: any;
  incidents: CrisisIncident[];
  availableUnits?: MunicipalUnit[];
  onApplyDraft?: (draft: { title?: string; category?: string; description?: string; photoUrl?: string }) => void;
  onInspectTicket?: (ticketId: string) => void;
}

export const GeminiAssistantDrawer: React.FC<GeminiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  userRole,
  userWard = 'Ward 4 - Central Zone',
  currentUser,
  incidents,
  availableUnits = [],
  onApplyDraft,
  onInspectTicket
}) => {
  const isOfficerPersona = userRole === 'WARD_OFFICER' || userRole === 'SUPER_ADMIN' || userRole === 'SWACHH_SURVEKSHAN_AUDITOR';
  const selectedPersona: 'CITIZEN' | 'OFFICER' = isOfficerPersona ? 'OFFICER' : 'CITIZEN';
  
  const [messages, setMessages] = useState<GeminiAssistantMessage[]>([
    {
      role: 'assistant',
      content: isOfficerPersona 
        ? `Active telemetry for ${userWard} is loaded. Ask me to summarize P1 critical hazards, unassigned tickets, or crew dispatch options.`
        : `Hi ${currentUser?.fullName?.split(' ')[0] || 'there'}! I can help you track open complaints, find nearby SBM toilets, or check resolution times. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isLiveCallOpen, setIsLiveCallOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const citizenChips = [
    "Check status of my open complaints",
    "Where is the nearest clean public toilet?",
    "How quickly are P1 potholes resolved in Ward 4?",
    "Report uncollected garbage dump",
    "Find nearest waste drop center"
  ];

  const officerChips = [
    "Summarize active P1 Critical hazards",
    "Identify unassigned tickets with SLA < 1hr",
    "Recommend crew dispatch for open road defects",
    "Audit Ward 4 SLA adherence rates",
    "Generate operational shift briefing"
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

    setMessages(prev => [...prev.slice(-49), userMsg]);
    if (!textToSend) setInputVal('');
    setIsLoading(true);

    try {
      const reply = await queryGeminiAssistant(query, selectedPersona, {
        ward: userWard,
        incidentsCount: incidents.length,
        activeIncidents: incidents,
        availableUnits,
        currentUser,
        facilities: INITIAL_PUBLIC_FACILITIES
      });

      const assistantMsg: GeminiAssistantMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev.slice(-49), assistantMsg]);
    } catch (err) {
      console.warn('Assistant error:', err);
      setMessages(prev => [
        ...prev.slice(-49),
        {
          role: 'assistant',
          content: "I encountered a temporary communication timeout with the municipal decision engine. Please try again.",
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
        content: isOfficerPersona
          ? `Ready to analyze ward operations and crew dispatch for ${userWard}.`
          : `Ready to assist with your municipal queries or ticket status updates.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to extract matching tickets mentioned in assistant message
  const findReferencedTickets = (content: string): CrisisIncident[] => {
    if (!content || !incidents || incidents.length === 0) return [];
    
    // Find incidents whose ID or `#${ID}` is in the content
    const matched = incidents.filter(inc => {
      const ticketId = inc.id;
      const cleanId = ticketId.replace(/^#/, '');
      return content.includes(ticketId) || content.includes(`#${cleanId}`) || content.includes(cleanId);
    });

    return matched;
  };

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 font-sans">
      {/* Click outside to close backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative z-[9999] w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-[#0d5c52] via-[#115e59] to-[#042f2e] text-white p-4 sm:p-5 flex items-center justify-between border-b border-teal-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shadow-xs relative overflow-hidden p-1.5">
              <img src="/logo.png" alt="CivicPulse Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">CivicPulse Copilot</h3>
                {/* Single Subtle Operational Beacon */}
                <span className="relative flex h-2.5 w-2.5" title="Live Engine Connected">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-normal">
                {isOfficerPersona ? `Tactical Ward Intelligence • ${userWard}` : `Municipal AI Assistant • ${userWard}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLiveCallOpen(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold text-[11px] rounded-xl transition flex items-center gap-1 shadow-md cursor-pointer animate-pulse"
              title="Start Real-Time Voice Call with Gemini AI"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Call</span>
            </button>

            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-2 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={onClose}
              title="Close drawer"
              className="p-2 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/50">
          {messages.map((msg, idx) => {
            const referencedTickets = msg.role === 'assistant' ? findReferencedTickets(msg.content) : [];

            return (
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
                      <img src="/logo.png" alt="CivicPulse Logo" className="w-3.5 h-3.5 object-contain" />
                      <span className="font-bold text-emerald-800">CivicPulse AI Agent</span>
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

                  {/* Render Interactive Ticket Micro-Cards if tickets referenced */}
                  {msg.role === 'assistant' && referencedTickets.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Ticket className="w-3 h-3 text-blue-600" />
                        <span>Referenced Ticket Cards:</span>
                      </div>
                      {referencedTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl flex items-center justify-between transition cursor-pointer shadow-xs group"
                          onClick={() => {
                            if (onInspectTicket) {
                              onInspectTicket(ticket.id);
                            }
                          }}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                                #{ticket.id} • {ticket.category.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              {ticket.location?.address || (ticket.location as any)?.landmark || ticket.location?.zone || 'Ward 4'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              ticket.status === 'IN_PROGRESS' || ticket.status === 'DISPATCHED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {ticket.status}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs p-3 bg-white rounded-2xl border border-slate-200 w-fit animate-pulse">
              <img src="/logo.png" alt="CivicPulse Logo" className="w-4 h-4 object-contain animate-spin" />
              <span>CivicPulse AI processing live ward context & telemetry...</span>
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
                  ? "Check ticket status, find public toilets, ask SLAs..."
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

      <GeminiLiveCallOverlay
        isOpen={isLiveCallOpen}
        onClose={() => setIsLiveCallOpen(false)}
        userRole={userRole}
        userWard={userWard}
        onInspectTicket={onInspectTicket}
        onGrievanceTriggered={(data) => {
          if (onApplyDraft) {
            onApplyDraft({
              title: `Voice Report: ${data.category}`,
              category: data.category,
              description: data.description,
              ...(data.photoUrl ? { photoUrl: data.photoUrl } : {})
            });
          }
        }}
        onSyncHistory={(summary) => {
          const mins = Math.floor(summary.durationSeconds / 60);
          const secs = summary.durationSeconds % 60;
          const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          let transcriptBody = `📞 **Gemini Live Call Summary (Duration: ${timeStr})**\n\n`;

          if (summary.captions && summary.captions.length > 0) {
            transcriptBody += `**Live Spoken Transcript:**\n` +
              summary.captions.map(c => `• **${c.role === 'user' ? 'You' : 'CivicPulse Live Agent'}:** ${c.text}`).join('\n') + '\n\n';
          } else {
            transcriptBody += `Voice conversation completed with CivicPulse AI Agent.\n\n`;
          }

          if (summary.executedTools && summary.executedTools.length > 0) {
            transcriptBody += `⚡ **Autonomous Actions Triggered:**\n` +
              summary.executedTools.map(t => `- Executed **\`${t.toolName}\`**${t.ticketId ? ` → Ticket #${t.ticketId}` : ''}`).join('\n');
          }

          if (summary.photoUrl) {
            transcriptBody += `\n\n📸 **Hazard Photo Attached:** Photo successfully linked to report.`;
          }

          const callMsg: GeminiAssistantMessage = {
            role: 'assistant',
            content: transcriptBody,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev.slice(-49), callMsg]);
        }}
      />
    </div>
  );
};

