import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Star, 
  ShieldCheck, 
  Download, 
  FileText, 
  TrendingUp, 
  Sparkles,
  BarChart3,
  Search,
  Eye,
  Check,
  X
} from 'lucide-react';
import { CrisisIncident, UserProfile, PriorityLevel } from '../types';
import { updateComplaintInFirestore } from '../services/firebase';
import { normalizeImageSrc, handleImageError } from '../utils/imageUtils';

interface SwachhSurvekshanAuditorDeskProps {
  incidents: CrisisIncident[];
  currentUser: UserProfile | null;
}

export const SwachhSurvekshanAuditorDesk: React.FC<SwachhSurvekshanAuditorDeskProps> = ({
  incidents,
  currentUser
}) => {
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedIncidentForAudit, setSelectedIncidentForAudit] = useState<CrisisIncident | null>(null);
  const [auditScore, setAuditScore] = useState<number>(85);
  const [auditNotes, setAuditNotes] = useState<string>('Grievance redressal complies with MoHUA Swachh Survekshan 2026 quality protocols. Remediation verified on site.');
  const [sopVerified, setSopVerified] = useState<boolean>(true);
  const [photoVerified, setPhotoVerified] = useState<boolean>(true);
  const [isSavingAudit, setIsSavingAudit] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const auditorName = currentUser?.name || 'Dr. Vikram Malhotra';
  const designation = currentUser?.designation || 'MoHUA National Quality Inspector';

  // Filter incidents for audit
  const filteredIncidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return incidents.filter((inc) => {
      const matchesWard = selectedWard === 'ALL' || (inc.ward || inc.location.zone || '').includes(selectedWard);
      if (!matchesWard) return false;
      if (!q) return true;
      return (inc.title + ' ' + inc.description + ' ' + inc.location.address).toLowerCase().includes(q);
    });
  }, [incidents, selectedWard, searchQuery]);

  // Single-pass metric aggregation over filteredIncidents
  const { resolvedIncidentsCount, auditedCount, avgScore } = useMemo(() => {
    let resolved = 0;
    let audited = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (let i = 0; i < filteredIncidents.length; i++) {
      const inc = filteredIncidents[i];
      if (inc.status === 'RESOLVED') resolved++;
      if (inc.auditorComplianceScore !== undefined && inc.auditorComplianceScore !== null) {
        audited++;
      }
      if (typeof inc.auditorComplianceScore === 'number') {
        scoreSum += inc.auditorComplianceScore;
        scoreCount++;
      }
    }

    const calculatedAvg = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 88;
    return { resolvedIncidentsCount: resolved, auditedCount: audited, avgScore: calculatedAvg };
  }, [filteredIncidents]);

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentForAudit) return;
    setIsSavingAudit(true);

    try {
      // Update compliance score and notes without altering maintenance dispatch state!
      await updateComplaintInFirestore(selectedIncidentForAudit.id, {
        auditorComplianceScore: auditScore,
        auditorNotes: `[Audited by ${auditorName}, ${new Date().toLocaleDateString('en-IN')}] ${auditNotes} (SOP Verified: ${sopVerified ? 'YES' : 'NO'}, Proof Verified: ${photoVerified ? 'YES' : 'NO'})`
      });

      setToastMsg(`✓ Compliance score (${auditScore}/100) recorded for ${selectedIncidentForAudit.title}. Dispatch state preserved.`);
      setSelectedIncidentForAudit(null);
    } catch (err) {
      console.warn('Audit save error:', err);
    } finally {
      setIsSavingAudit(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Auditor Executive Header */}
      <div className="bg-gradient-to-r from-[#0d5c52] via-[#115e59] to-[#042f2e] rounded-2xl p-5 sm:p-6 text-white shadow-sm border border-teal-600/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <ClipboardCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                Swachh Survekshan 2026 Inspector
              </span>
              <span className="bg-white/15 text-teal-100 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-white/20">
                Independent Quality Audit
              </span>
              <span className="bg-emerald-500/30 text-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-emerald-400/40">
                ODF++ Certified Desk
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {auditorName} • Municipal Compliance & Scoring Desk
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl font-normal leading-relaxed">
              Independent MoHUA quality inspection authority. Evaluate ward grievance redressal adherence, verify proof-of-completion authenticity, and record official compliance metrics.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-black/30 backdrop-blur-xs p-3 rounded-xl border border-white/15">
            <div className="text-center px-2">
              <span className="text-2xl font-bold text-teal-200">{avgScore}%</span>
              <p className="text-[10px] text-teal-200/80 uppercase font-semibold tracking-wider">Ward SS-Index</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-bold text-emerald-300">{auditedCount}</span>
              <p className="text-[10px] text-emerald-200/80 uppercase font-semibold tracking-wider">Audits Signed</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-bold text-amber-300">{resolvedIncidentsCount}</span>
              <p className="text-[10px] text-amber-200/80 uppercase font-semibold tracking-wider">Ready for Audit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" strokeWidth={1.75} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 4 Core Swachh Survekshan Assessment Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pillar 1</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">94.2%</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm tracking-tight">Source Segregation</h4>
          <p className="text-[11px] text-slate-500 leading-tight">Door-to-door wet/dry waste separation compliance in Ward 4.</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pillar 2</span>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">4.6★ / 5.0</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm tracking-tight">SBM Public Sanitation</h4>
          <p className="text-[11px] text-slate-500 leading-tight">Cleanliness, water availability, and Divyangjan access across 6 complexes.</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pillar 3</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">91.8%</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm tracking-tight">SLA Grievance Redressal</h4>
          <p className="text-[11px] text-slate-500 leading-tight">Resolution within 12h (P1) and 48h (P2) statutory timelines.</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pillar 4</span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">100%</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm tracking-tight">Open Dump Elimination</h4>
          <p className="text-[11px] text-slate-500 leading-tight">Vulnerable garbage points transformed into green urban corners.</p>
        </div>
      </div>

      {/* Audit Inspection Table & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5 shrink-0">
              <FileText className="w-4 h-4 text-[#0d5c52]" strokeWidth={1.75} />
              <span>Grievance Remediation Audit Registry</span>
            </h3>
            <span className="text-xs font-semibold text-slate-600 bg-slate-200/80 px-2.5 py-0.5 rounded-md">
              {filteredIncidents.length} Samples
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search sample by ID, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600"
              />
            </div>

            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 cursor-pointer focus:outline-hidden focus:border-teal-600"
            >
              <option value="ALL">All Municipal Wards</option>
              <option value="Ward 4">Ward 4 - Central Zone</option>
              <option value="Ward 2">Ward 2 - Industrial Zone</option>
              <option value="Ward 7">Ward 7 - Suburbs</option>
            </select>
          </div>
        </div>

        {/* Registry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Grievance / Hazard</th>
                <th className="py-3 px-4">Ward Location</th>
                <th className="py-3 px-4">Dispatch Status</th>
                <th className="py-3 px-4">Remediation Proof</th>
                <th className="py-3 px-4">SS-Audit Score</th>
                <th className="py-3 px-4 text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.map((incident) => {
                const hasScore = incident.auditorComplianceScore !== undefined && incident.auditorComplianceScore !== null;

                return (
                  <tr key={incident.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{incident.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{incident.category} • Priority: {incident.priority}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-medium text-slate-800">{incident.ward || incident.location.zone}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 font-mono">{incident.location.address}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                        incident.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : incident.status === 'IN_PROGRESS'
                          ? 'bg-teal-50 text-teal-800 border border-teal-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {incident.proofOfFixUrl ? (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                          <span>Photo Attached</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No fix proof yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {hasScore ? (
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 ${
                          (incident.auditorComplianceScore || 0) >= 80
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                          <span>{incident.auditorComplianceScore} / 100</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending Audit</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIncidentForAudit(incident);
                          setAuditScore(incident.auditorComplianceScore || 85);
                          setAuditNotes(incident.auditorNotes || 'Remediation aligns with MoHUA quality standards.');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0d5c52] font-semibold text-xs border border-teal-200 transition cursor-pointer"
                      >
                        {hasScore ? 'Re-Audit' : 'Audit Sample'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Inspection Scoring Modal */}
      {selectedIncidentForAudit && (
        <div className="fixed inset-0 z-[9990] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-[9999] bg-white rounded-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#0d5c52] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                  📋
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Swachh Survekshan Quality Audit</h3>
                  <p className="text-xs text-teal-200 font-mono">Incident #{selectedIncidentForAudit.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncidentForAudit(null)}
                className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAudit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{selectedIncidentForAudit.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                    {selectedIncidentForAudit.status}
                  </span>
                </div>
                <p className="text-slate-600">{selectedIncidentForAudit.description}</p>
                <p className="text-slate-500 text-[11px] pt-1 font-mono">
                  Location: {selectedIncidentForAudit.location.address} ({selectedIncidentForAudit.ward})
                </p>
              </div>

              {/* Photos Comparison if available */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 text-[11px]">Before (Reported Hazard):</span>
                  {selectedIncidentForAudit.imageUrl ? (
                    <img
                      src={normalizeImageSrc(selectedIncidentForAudit.imageUrl)}
                      alt="Before"
                      className="w-full h-28 object-cover rounded-xl border border-slate-200"
                      onError={handleImageError}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-[11px]">
                      No photo attached
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 text-[11px]">After (Remediation Proof):</span>
                  {selectedIncidentForAudit.proofOfFixUrl ? (
                    <img
                      src={normalizeImageSrc(selectedIncidentForAudit.proofOfFixUrl)}
                      alt="Proof of fix"
                      className="w-full h-28 object-cover rounded-xl border border-emerald-300"
                      onError={handleImageError}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-28 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-700 text-[11px] text-center p-2">
                      Proof photo pending from Field Crew
                    </div>
                  )}
                </div>
              </div>

              {/* Score Slider */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Compliance & Quality Score (0 - 100):
                  </label>
                  <span className="font-black text-[#0d5c52] text-base">{auditScore} / 100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={auditScore}
                  onChange={(e) => setAuditScore(Number(e.target.value))}
                  className="w-full accent-[#0d5c52] cursor-pointer"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sopVerified}
                    onChange={(e) => setSopVerified(e.target.checked)}
                    className="rounded text-[#0d5c52] focus:ring-teal-500"
                  />
                  <span className="font-semibold text-slate-700">MoHUA Standard Operating Procedure (SOP) Followed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={photoVerified}
                    onChange={(e) => setPhotoVerified(e.target.checked)}
                    className="rounded text-[#0d5c52] focus:ring-teal-500"
                  />
                  <span className="font-semibold text-slate-700">Geo-tagging and site photograph verified</span>
                </label>
              </div>

              {/* Official Auditor Notes */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800">
                  Official Auditor Notes & Compliance Verdict:
                </label>
                <textarea
                  rows={3}
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter official audit observation notes..."
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedIncidentForAudit(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAudit}
                  className="px-5 py-2.5 rounded-xl bg-[#0d5c52] hover:bg-[#09473f] text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                  <span>{isSavingAudit ? 'Saving Audit...' : 'Sign & Commit Audit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
