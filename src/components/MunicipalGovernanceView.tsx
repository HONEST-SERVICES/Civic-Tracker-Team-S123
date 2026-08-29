import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Shield, 
  Crown, 
  Truck, 
  UserCheck, 
  Layers, 
  Search, 
  AlertCircle,
  CheckCircle2,
  Navigation,
  ChevronDown,
  ChevronUp,
  Radio,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { WardJurisdiction, UserProfile } from '../types';
import { 
  subscribeToWards, 
  createWardInFirestore, 
  updateWardInFirestore, 
  addSubAreaToWard, 
  removeSubAreaFromWard, 
  deleteWardFromFirestore,
  subscribeToAllUsers,
  updateUserRoleAndWard
} from '../services/firebase';

interface MunicipalGovernanceViewProps {
  currentUser: UserProfile | null;
}

export const MunicipalGovernanceView: React.FC<MunicipalGovernanceViewProps> = ({ currentUser }) => {
  const [wards, setWards] = useState<WardJurisdiction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedWardId, setExpandedWardId] = useState<string | null>(null);
  const [isCreatingWard, setIsCreatingWard] = useState<boolean>(false);
  const [newSubAreaInputs, setNewSubAreaInputs] = useState<{ [wardId: string]: string }>({});
  
  // Edit boundaries state
  const [editingWardId, setEditingWardId] = useState<string | null>(null);
  const [editWardForm, setEditWardForm] = useState<{ name: string; district: string; lat: number; lng: number }>({
    name: '',
    district: '',
    lat: 0,
    lng: 0
  });

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // New Ward Form State
  const [newWardForm, setNewWardForm] = useState<{
    id: string;
    name: string;
    district: string;
    lat: number;
    lng: number;
    subAreasInput: string;
  }>({
    id: '',
    name: '',
    district: 'North Municipal District',
    lat: 31.2530,
    lng: 75.7030,
    subAreasInput: 'Main Market Road, Sector 1 Junction, Civil Hospital Gate'
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time Wards Subscription
  useEffect(() => {
    const unsub = subscribeToWards(
      (liveWards) => {
        setWards(liveWards);
        if (!expandedWardId && liveWards.length > 0) {
          setExpandedWardId(liveWards[0].id);
        }
      },
      (err) => {
        console.error("Ward subscription failed:", err);
        showToast("Error loading wards from municipal registry", "error");
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Real-time Users Subscription
  useEffect(() => {
    const unsub = subscribeToAllUsers(
      (liveUsers) => {
        setUsers(liveUsers);
      },
      (err) => {
        console.warn("Users subscription warning:", err);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleCreateWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWardForm.name.trim()) {
      showToast("Please enter a valid Ward Name", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const generatedId = newWardForm.id.trim() || `ward-${Date.now().toString(36)}`;
      const subAreasArray = newWardForm.subAreasInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await createWardInFirestore({
        id: generatedId,
        name: newWardForm.name.trim(),
        district: newWardForm.district.trim(),
        subAreas: subAreasArray,
        lat: Number(newWardForm.lat) || 31.2530,
        lng: Number(newWardForm.lng) || 75.7030
      });

      showToast(`Ward "${newWardForm.name}" created and synced to municipal registry!`, "success");
      setIsCreatingWard(false);
      setExpandedWardId(generatedId);
      setNewWardForm({
        id: '',
        name: '',
        district: 'North Municipal District',
        lat: 31.2530,
        lng: 75.7030,
        subAreasInput: 'Main Market Road, Sector 1 Junction'
      });
    } catch (err: any) {
      console.error("Create ward failed:", err);
      showToast(`Failed to create ward: ${err?.message || 'Permission denied'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSubArea = async (wardId: string) => {
    const text = (newSubAreaInputs[wardId] || '').trim();
    if (!text) return;
    setIsProcessing(true);
    try {
      await addSubAreaToWard(wardId, text);
      setNewSubAreaInputs(prev => ({ ...prev, [wardId]: '' }));
      showToast(`Sub-location added to ${wardId}`, "success");
    } catch (err: any) {
      showToast(`Failed to add sub-area: ${err?.message || 'Error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSubArea = async (wardId: string, subArea: string) => {
    setIsProcessing(true);
    try {
      await removeSubAreaFromWard(wardId, subArea);
      showToast(`Removed "${subArea}" from jurisdiction`, "success");
    } catch (err: any) {
      showToast(`Failed to remove sub-area: ${err?.message || 'Error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteWard = async (wardId: string, wardName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${wardName}"? All assigned officer links will be cleared.`)) {
      return;
    }
    setIsProcessing(true);
    try {
      await deleteWardFromFirestore(wardId);
      showToast(`Ward "${wardName}" removed from municipal registry.`, "success");
      if (expandedWardId === wardId) {
        const remaining = wards.filter(w => w.id !== wardId);
        setExpandedWardId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      showToast(`Failed to delete ward: ${err?.message || 'Error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignOfficerToWard = async (wardId: string, officerUid: string) => {
    if (!officerUid) {
      setIsProcessing(true);
      try {
        await updateWardInFirestore(wardId, {
          activeOfficerUid: null,
          activeOfficerName: null
        });
        showToast(`Cleared assigned officer for ${wardId}`, "success");
      } catch (err: any) {
        showToast(`Failed to clear officer: ${err?.message || 'Error'}`, "error");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const targetUser = users.find(u => u.uid === officerUid);
    if (!targetUser) return;

    setIsProcessing(true);
    try {
      await updateWardInFirestore(wardId, {
        activeOfficerUid: targetUser.uid,
        activeOfficerName: targetUser.name
      });

      await updateUserRoleAndWard(targetUser.uid, {
        role: 'WARD_OFFICER',
        assignedWard: wards.find(w => w.id === wardId)?.name || wardId,
        designation: targetUser.designation || 'Assistant Municipal Engineer (AE)'
      });

      showToast(`${targetUser.name} designated as Ward Officer for ${wardId}`, "success");
    } catch (err: any) {
      showToast(`Failed to assign officer: ${err?.message || 'Error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const startEditingWard = (ward: WardJurisdiction) => {
    setEditingWardId(ward.id);
    setEditWardForm({
      name: ward.name,
      district: ward.district,
      lat: ward.lat,
      lng: ward.lng
    });
  };

  const handleSaveBoundaryEdit = async (wardId: string) => {
    setIsProcessing(true);
    try {
      await updateWardInFirestore(wardId, {
        name: editWardForm.name.trim(),
        district: editWardForm.district.trim(),
        lat: Number(editWardForm.lat),
        lng: Number(editWardForm.lng)
      });
      showToast(`Updated boundary parameters for ${wardId}`, "success");
      setEditingWardId(null);
    } catch (err: any) {
      showToast(`Failed to update ward: ${err?.message || 'Error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredWards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return wards;
    return wards.filter(w => 
      w.name.toLowerCase().includes(q) ||
      w.district.toLowerCase().includes(q) ||
      w.subAreas.some(s => s.toLowerCase().includes(q))
    );
  }, [wards, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 space-y-3 bg-slate-100 font-sans min-h-0">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs transition-all rounded-xl ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-rose-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. COMPACT APP-GRADE HEADER */}
      <div className="flex items-center justify-between gap-2 mb-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-base shadow-2xs">
            🏛️
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Ward Governance</h1>
            <p className="text-[11px] text-slate-500 font-medium">{wards.length} Active Jurisdictions</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreatingWard(true)}
          className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5"/> <span>New Ward</span>
        </button>
      </div>

      {/* 2. STREAMLINE SEARCH & FILTERS */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search wards, districts, or sub-areas..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-hidden shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. EXPANDABLE ACCORDION WARD JURISDICTION CARDS */}
      <div className="space-y-3">
        {filteredWards.map((ward) => {
          const isExpanded = expandedWardId === ward.id;
          const isEditing = editingWardId === ward.id;

          return (
            <div
              key={ward.id}
              className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                isExpanded
                  ? 'border-teal-500/80 ring-1 ring-teal-500/20 shadow-md'
                  : 'border-slate-200/90 hover:border-teal-300'
              }`}
            >
              {/* Closed State (Compact Summary Header) */}
              <div
                onClick={() => setExpandedWardId(isExpanded ? null : ward.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="min-w-0 flex-1">
                  {/* Top Row: Ward Name & Sector Badge */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{ward.name}</h3>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-slate-200 shrink-0">
                      {ward.subAreas.length} Sectors
                    </span>
                  </div>

                  {/* Bottom Row: District & Officer */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="truncate">{ward.district}</span>
                    <span>•</span>
                    <span className={`truncate font-medium ${ward.activeOfficerName ? 'text-teal-700 font-semibold' : 'text-slate-400'}`}>
                      {ward.activeOfficerName ? `Officer: ${ward.activeOfficerName}` : 'No Officer Assigned'}
                    </span>
                  </div>
                </div>

                {/* Accordion Expand Chevron */}
                <div className={`p-1.5 rounded-xl transition-colors ${
                  isExpanded ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                }`}>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Expanded State Content */}
              {isExpanded && (
                <div className="px-3.5 pb-4 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/40">
                  
                  {/* Inline Boundary Editing Form */}
                  {isEditing ? (
                    <div className="p-3 bg-white rounded-xl border border-teal-300 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                        <span>Edit Ward Boundary Parameters</span>
                        <button onClick={() => setEditingWardId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Ward Name</label>
                          <input
                            type="text"
                            value={editWardForm.name}
                            onChange={(e) => setEditWardForm({ ...editWardForm, name: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">District</label>
                          <input
                            type="text"
                            value={editWardForm.district}
                            onChange={(e) => setEditWardForm({ ...editWardForm, district: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Center Latitude</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={editWardForm.lat}
                            onChange={(e) => setEditWardForm({ ...editWardForm, lat: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Center Longitude</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={editWardForm.lng}
                            onChange={(e) => setEditWardForm({ ...editWardForm, lng: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingWardId(null)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveBoundaryEdit(ward.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 1. Boundary Coordinates & Metric Badges */
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Center Coordinates</span>
                        <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                          {ward.lat.toFixed(4)}, {ward.lng.toFixed(4)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">District Tag</span>
                        <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{ward.district}</p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">Active Field Crews</span>
                        <p className="text-xs font-bold text-teal-900 mt-0.5">{ward.activeCrewsCount || 1} Deployed</p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Total Grievances</span>
                        <p className="text-xs font-bold text-blue-900 mt-0.5">{ward.totalComplaintsCount || 0} Registered</p>
                      </div>
                    </div>
                  )}

                  {/* 2. Assigned Field Officer Delegation */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-teal-700" />
                      <span>Designated Ward Officer:</span>
                    </label>
                    <select
                      value={ward.activeOfficerUid || ''}
                      onChange={(e) => handleAssignOfficerToWard(ward.id, e.target.value)}
                      disabled={isProcessing}
                      className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- No Officer Assigned (Tap to Delegate User) --</option>
                      {users.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.name} ({u.email || u.phone || u.uid}) — Role: {u.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Sub-locations & Sectors */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-teal-700" />
                        <span>Sectors & Arterial Routes ({ward.subAreas.length}):</span>
                      </label>
                    </div>

                    {/* Sector Add Input */}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newSubAreaInputs[ward.id] || ''}
                        onChange={(e) => setNewSubAreaInputs({ ...newSubAreaInputs, [ward.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubArea(ward.id);
                          }
                        }}
                        placeholder="Add sector or junction..."
                        className="flex-1 h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleAddSubArea(ward.id)}
                        disabled={!(newSubAreaInputs[ward.id] || '').trim() || isProcessing}
                        className="h-8 px-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Sectors Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ward.subAreas.map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-1.5"
                        >
                          <Navigation className="w-3 h-3 text-teal-600" />
                          <span>{sub}</span>
                          <button
                            onClick={() => handleRemoveSubArea(ward.id, sub)}
                            disabled={isProcessing}
                            className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Remove sector"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {ward.subAreas.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No sectors defined yet.</p>
                      )}
                    </div>
                  </div>

                  {/* 4. Action Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => startEditingWard(ward)}
                      className="py-2 px-3 bg-white border border-slate-200 hover:border-teal-400 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                      <span>Edit Boundaries</span>
                    </button>

                    <button
                      onClick={() => handleDeleteWard(ward.id, ward.name)}
                      disabled={isProcessing}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Ward</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {filteredWards.length === 0 && (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400 space-y-2 shadow-2xs">
            <Building2 className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-medium text-slate-600">No municipal wards found matching your query.</p>
          </div>
        )}
      </div>

      {/* CREATE NEW WARD MODAL */}
      {isCreatingWard && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="relative z-[9999] bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Create New Municipal Ward Jurisdiction</h3>
                  <p className="text-[11px] text-slate-500">Persists to the central municipal registry</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreatingWard(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWardSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ward Name *</label>
                <input
                  type="text"
                  required
                  value={newWardForm.name}
                  onChange={(e) => setNewWardForm({ ...newWardForm, name: e.target.value })}
                  placeholder="e.g. Ward 15 - North Transit Corridor"
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ward ID (Optional)</label>
                  <input
                    type="text"
                    value={newWardForm.id}
                    onChange={(e) => setNewWardForm({ ...newWardForm, id: e.target.value })}
                    placeholder="e.g. ward-15"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={newWardForm.district}
                    onChange={(e) => setNewWardForm({ ...newWardForm, district: e.target.value })}
                    placeholder="e.g. North Municipal District"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Center Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newWardForm.lat}
                    onChange={(e) => setNewWardForm({ ...newWardForm, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newWardForm.lng}
                    onChange={(e) => setNewWardForm({ ...newWardForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Sub-Locations (Comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={newWardForm.subAreasInput}
                  onChange={(e) => setNewWardForm({ ...newWardForm, subAreasInput: e.target.value })}
                  placeholder="Sector 1 Road, Civil Hospital Junction, Old Grain Market"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingWard(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isProcessing ? 'Saving Ward...' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
