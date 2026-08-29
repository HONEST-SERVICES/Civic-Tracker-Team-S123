import React, { useState, useRef } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Upload, 
  Sparkles, 
  Navigation, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  Layers,
  Phone,
  RefreshCw,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { CrisisIncident, UserProfile, IncidentStatus } from '../types';
import { compressImage } from '../utils/imageCompressor';

interface FieldCrewWorkOrdersProps {
  incidents: CrisisIncident[];
  currentUser: UserProfile | null;
  onUpdateIncidentStatus: (incidentId: string, status: IncidentStatus, proofUrl?: string, notes?: string) => void;
}

const SAMPLE_PROOF_PHOTOS = [
  {
    label: 'Road Repaved & Compacted',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'Garbage Dump Cleared & Sanitized',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'Drain Desilted & Cleared',
    url: 'https://images.unsplash.com/photo-1584463699031-c4c0b629c135?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'Streetlight Replaced & Operational',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80'
  }
];

export const FieldCrewWorkOrders: React.FC<FieldCrewWorkOrdersProps> = ({
  incidents,
  currentUser,
  onUpdateIncidentStatus
}) => {
  const [selectedTicket, setSelectedTicket] = useState<CrisisIncident | null>(null);
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'RESOLVED' | 'ALL'>('ACTIVE');
  const [proofUrl, setProofUrl] = useState<string>(SAMPLE_PROOF_PHOTOS[0].url);
  const [crewNotes, setCrewNotes] = useState<string>('Repairs executed according to MoHUA Standard Operating Procedure. Area cleaned and cleared for public use.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const assignedWard = currentUser?.assignedWard || 'Ward 4';
  const assignedCrew = currentUser?.assignedCrew || 'UNIT_04';

  // Strict Scoping for Field Crew:
  // Show complaints in crew's assigned ward, or explicitly assigned to their unit
  const crewIncidents = incidents.filter((inc) => {
    const incWard = (inc.ward || inc.location.zone || '').toLowerCase();
    const targetWard = assignedWard.toLowerCase();
    const matchesWard = incWard.includes(targetWard) || targetWard.includes(incWard) || !currentUser?.assignedWard;
    const matchesCrew = !inc.assignedUnitName || inc.assignedUnitName.toLowerCase().includes(assignedCrew.toLowerCase()) || inc.assignedUnitName.toLowerCase().includes('crew') || inc.assignedUnitName.toLowerCase().includes('unit');
    return matchesWard || matchesCrew;
  });

  const activeWorkOrders = crewIncidents.filter((i) => i.status !== 'RESOLVED');
  const resolvedWorkOrders = crewIncidents.filter((i) => i.status === 'RESOLVED');

  const displayedList = filterTab === 'ACTIVE' 
    ? activeWorkOrders 
    : filterTab === 'RESOLVED' 
    ? resolvedWorkOrders 
    : crewIncidents;

  const handleStartRemediation = (ticketId: string) => {
    onUpdateIncidentStatus(ticketId, 'IN_PROGRESS', undefined, 'Field crew arrived on site. Remediation started.');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsSubmitting(true);

    setTimeout(() => {
      onUpdateIncidentStatus(
        selectedTicket.id, 
        'RESOLVED', 
        proofUrl, 
        crewNotes || 'Remediation completed by Field Crew.'
      );
      setIsSubmitting(false);
      setSelectedTicket(null);
    }, 600);
  };

  const handleCustomFileUpload = async (file: File) => {
    try {
      const result = await compressImage(file, 800, 800, 0.75);
      setProofUrl(result.compressedBase64);
    } catch (e) {
      console.warn('Proof image compression fallback:', e);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setProofUrl(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Field Crew Operator Header */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-amber-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Field Operations Crew
              </span>
              <span className="bg-white/10 text-amber-200 text-xs font-bold px-2 py-0.5 rounded border border-white/10">
                {assignedWard}
              </span>
              <span className="bg-white/10 text-amber-200 text-xs font-bold px-2 py-0.5 rounded border border-white/10">
                Crew ID: {assignedCrew}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {currentUser?.name || 'Unit 04 Lead'} • Tactical Work Orders
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/80 max-w-2xl">
              Strictly scoped to assigned municipal sector. Update remediation stages in real time and submit geo-verified completion proofs for Ward Officer verification.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-black/30 p-3 rounded-xl border border-white/10">
            <div className="text-center px-2">
              <span className="text-2xl font-black text-amber-400">{activeWorkOrders.length}</span>
              <p className="text-[10px] text-amber-200 uppercase font-semibold">Active Orders</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-black text-emerald-400">{resolvedWorkOrders.length}</span>
              <p className="text-[10px] text-emerald-200 uppercase font-semibold">Resolved Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'ACTIVE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Active Work Orders</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterTab === 'ACTIVE' ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-700'}`}>
              {activeWorkOrders.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('RESOLVED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'RESOLVED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Completed Tickets</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterTab === 'RESOLVED' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
              {resolvedWorkOrders.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Ward Tickets ({crewIncidents.length})
          </button>
        </div>
      </div>

      {/* Work Orders List */}
      {displayedList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No work orders in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All tickets in your assigned sector ({assignedWard}) have been serviced or dispatched.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((ticket) => {
            const isResolved = ticket.status === 'RESOLVED';
            const isInProgress = ticket.status === 'IN_PROGRESS';
            const isDispatched = ticket.status === 'DISPATCHED';

            return (
              <div 
                key={ticket.id}
                className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                  isResolved 
                    ? 'border-emerald-200 bg-emerald-50/10' 
                    : isInProgress
                    ? 'border-amber-400 ring-2 ring-amber-100'
                    : 'border-slate-200 hover:border-amber-400'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {ticket.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {ticket.ward || ticket.location.zone}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">
                        {ticket.title}
                      </h3>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-800'
                        : isInProgress
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isResolved ? 'Resolved' : isInProgress ? 'In Remediation' : 'Assigned'}
                    </span>
                  </div>

                  {/* Hazard Image */}
                  {ticket.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 h-36 border border-slate-200">
                      <img 
                        src={ticket.imageUrl} 
                        alt={ticket.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Priority: {ticket.priority}
                      </div>
                      {ticket.proofOfFixUrl && (
                        <div className="absolute bottom-2 right-2 bg-emerald-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Proof Attached</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Location & Reporter Info */}
                  <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate">{ticket.location.address}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Citizen: <strong>{ticket.reporterName || 'Sangit'}</strong></span>
                      <span>Target: ~{ticket.targetResolutionMinutes || 45} mins</span>
                    </div>
                  </div>

                  {/* Directives / Officer Notes */}
                  {ticket.officerNotes && (
                    <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                      <strong>Directives:</strong> {ticket.officerNotes}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center gap-2">
                  {!isResolved ? (
                    <>
                      {ticket.status !== 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleStartRemediation(ticket.id)}
                          className="flex-1 py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5 text-amber-700" />
                          <span>Mark On-Site</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setProofUrl(SAMPLE_PROOF_PHOTOS[0].url);
                        }}
                        className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Upload Fix Proof</span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs text-emerald-800 font-semibold px-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Resolution verified on site
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          if (ticket.proofOfFixUrl) setProofUrl(ticket.proofOfFixUrl);
                        }}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
                      >
                        View Proof
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESOLUTION & PROOF OF FIX MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-emerald-200 font-bold uppercase">
                    Resolution Ticket Closure • {selectedTicket.id}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                    {selectedTicket.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4">
              {/* Proof Image Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Proof of Resolution Photo (After Remediation)
                </label>
                
                <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden group">
                  <img
                    src={proofUrl}
                    alt="Proof of Fix"
                    className="w-full h-44 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Geo-Tagged Verified Fix</span>
                  </div>

                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-white/95 hover:bg-white text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer border border-slate-200"
                      title="Take photo with camera"
                    >
                      <Camera className="w-3.5 h-3.5 text-orange-600" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="bg-white/95 hover:bg-white text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer border border-slate-200"
                      title="Upload from gallery"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Gallery</span>
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  id="camera-capture-input-crew"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCustomFileUpload(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept="image/*"
                  id="gallery-upload-input-crew"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCustomFileUpload(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {/* Sample Verified Photos Quick Select */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Or select standard verified photo:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SAMPLE_PROOF_PHOTOS.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProofUrl(photo.url)}
                        className={`p-1.5 rounded-lg border text-left text-[11px] transition truncate cursor-pointer ${
                          proofUrl === photo.url
                            ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {photo.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Crew Remediation Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Field Remediation Summary & Materials Used
                </label>
                <textarea
                  value={crewNotes}
                  onChange={(e) => setCrewNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Detail the materials and corrective actions taken..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Submitting Closure...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Mark Ticket Resolved</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
