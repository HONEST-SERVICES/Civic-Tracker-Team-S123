import React, { useState, useEffect } from 'react';
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
  Globe,
  Radio,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { WardJurisdiction, UserProfile, UserRole } from '../types';
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
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [isCreatingWard, setIsCreatingWard] = useState<boolean>(false);
  const [newSubAreaText, setNewSubAreaText] = useState<string>('');
  
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
        if (!selectedWardId && liveWards.length > 0) {
          setSelectedWardId(liveWards[0].id);
        }
      },
      (err) => {
        console.error("Ward subscription failed:", err);
        showToast("Error loading wards from Firestore", "error");
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

  const activeWard = wards.find(w => w.id === selectedWardId) || wards[0];

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

      showToast(`Ward "${newWardForm.name}" created and synced to Firestore!`, "success");
      setIsCreatingWard(false);
      setSelectedWardId(generatedId);
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
    if (!newSubAreaText.trim()) return;
    setIsProcessing(true);
    try {
      await addSubAreaToWard(wardId, newSubAreaText.trim());
      setNewSubAreaText('');
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
      showToast(`Ward "${wardName}" deleted from Firestore.`, "success");
      if (selectedWardId === wardId) {
        const remaining = wards.filter(w => w.id !== wardId);
        setSelectedWardId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      showToast(`Failed to delete ward: ${err?.message || 'Error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignOfficerToWard = async (wardId: string, officerUid: string) => {
    const targetUser = users.find(u => u.uid === officerUid);
    if (!targetUser) return;

    setIsProcessing(true);
    try {
      // 1. Update the Ward document with active officer
      await updateWardInFirestore(wardId, {
        activeOfficerUid: targetUser.uid,
        activeOfficerName: targetUser.name
      });

      // 2. Update the User profile role & assigned ward
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

  const filteredWards = wards.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.subAreas.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs transition-all z-30 ${
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

      {/* Main Top Header Strip */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#2d7a70]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Municipal Governance & Ward Configuration</h1>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-600" />
                <span>Super Admin Master Control</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage territorial ward jurisdictions, sub-sector boundaries, and field officer delegations in Firestore.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-xl font-medium">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Firestore /wards ({wards.length} Active)</span>
          </div>

          <button
            onClick={() => setIsCreatingWard(true)}
            className="h-9 px-3.5 rounded-xl bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Ward</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split Dashboard */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT COLUMN (Col 4/12): Wards List & Filter */}
        <div className="lg:col-span-4 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden">
          {/* Search bar */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wards, districts, or sub-areas..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Wards List Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredWards.map((ward) => {
              const isSelected = activeWard?.id === ward.id;
              return (
                <div
                  key={ward.id}
                  onClick={() => setSelectedWardId(ward.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/80 border-[#2d7a70] shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2d7a70]' : 'text-slate-400'}`} />
                        <h3 className={`font-bold text-xs truncate ${isSelected ? 'text-[#2d7a70]' : 'text-slate-800'}`}>
                          {ward.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ward.district}</p>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                      {ward.subAreas.length} Sectors
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-teal-600" />
                      <span className="truncate max-w-[140px]">
                        {ward.activeOfficerName ? ward.activeOfficerName : 'No Officer Assigned'}
                      </span>
                    </div>

                    <span className="font-mono text-slate-400">
                      {ward.lat.toFixed(3)}, {ward.lng.toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredWards.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-slate-300" />
                <p>No municipal wards found matching your query.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Col 8/12): Ward Details, Sub-Areas & Officer Assignment */}
        <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-6 space-y-6">
          {activeWard ? (
            <>
              {/* Ward Overview Header Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900">{activeWard.name}</h2>
                      <span className="bg-teal-50 text-[#2d7a70] border border-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        ID: {activeWard.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      District: <strong className="text-slate-700">{activeWard.district}</strong> • Coordinates: <span className="font-mono">{activeWard.lat}, {activeWard.lng}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteWard(activeWard.id, activeWard.name)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Ward</span>
                    </button>
                  </div>
                </div>

                {/* Ward Metrics Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sub-Locations</span>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{activeWard.subAreas.length}</p>
                  </div>

                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200">
                    <span className="text-[10px] text-[#2d7a70] uppercase font-bold tracking-wider">Active Crews</span>
                    <p className="text-base font-bold text-teal-900 mt-0.5">{activeWard.activeCrewsCount || 1} Deployed</p>
                  </div>

                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Assigned Officer</span>
                    <p className="text-xs font-bold text-blue-950 mt-1 truncate">
                      {activeWard.activeOfficerName || 'Unassigned'}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                    <span className="text-[10px] text-purple-700 uppercase font-bold tracking-wider">GIS Center</span>
                    <p className="text-xs font-mono font-bold text-purple-950 mt-1">
                      {activeWard.lat.toFixed(2)}, {activeWard.lng.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-Locations & Arterials Config */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2d7a70]" />
                    <h3 className="text-sm font-bold text-slate-900">Sub-Locations, Sectors & Arterial Routes</h3>
                  </div>
                  <span className="text-xs text-slate-500">Auto-populated for citizen pin matching</span>
                </div>

                {/* Add Sub-Area input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubAreaText}
                    onChange={(e) => setNewSubAreaText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubArea(activeWard.id);
                      }
                    }}
                    placeholder="Enter new sector, junction, or arterial road (e.g. Model Town Phase 2)..."
                    className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden"
                  />
                  <button
                    onClick={() => handleAddSubArea(activeWard.id)}
                    disabled={!newSubAreaText.trim() || isProcessing}
                    className="h-9 px-4 bg-[#2d7a70] hover:bg-[#23635b] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Sector</span>
                  </button>
                </div>

                {/* Sub-Areas Pill Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeWard.subAreas.map((sub, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-2xs hover:border-slate-300 transition"
                    >
                      <Navigation className="w-3 h-3 text-[#2d7a70]" />
                      <span>{sub}</span>
                      <button
                        onClick={() => handleRemoveSubArea(activeWard.id, sub)}
                        disabled={isProcessing}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Remove sector"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {activeWard.subAreas.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No sub-locations defined for this ward yet.</p>
                  )}
                </div>
              </div>

              {/* Officer & Personnel Delegation for Active Ward */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#2d7a70]" />
                    <h3 className="text-sm font-bold text-slate-900">Ward Officer Designation & Personnel Assignment</h3>
                  </div>
                  <span className="text-xs text-slate-500">Live Firestore RBAC Sync</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Designate Registered Staff / User as Active Ward Officer:
                  </label>

                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <select
                      value={activeWard.activeOfficerUid || ''}
                      onChange={(e) => handleAssignOfficerToWard(activeWard.id, e.target.value)}
                      disabled={isProcessing}
                      className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-[#2d7a70] focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- Select Registered User to Delegate as Ward Officer --</option>
                      {users.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.name} ({u.email || u.phone || u.uid}) — Current Role: {u.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Assigning a user updates their Firestore profile (`users/{'{uid}'}`) to <span className="font-semibold text-[#2d7a70]">WARD_OFFICER</span> with jurisdiction over <span className="font-semibold">{activeWard.name}</span>.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 space-y-3 border border-slate-200">
              <Building2 className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700">Select a Ward from the left list or create a new one.</h3>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW WARD MODAL */}
      {isCreatingWard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#2d7a70] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Create New Municipal Ward Jurisdiction</h3>
                  <p className="text-[11px] text-slate-500">Syncs directly to Firestore `wards` collection</p>
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
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden"
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
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={newWardForm.district}
                    onChange={(e) => setNewWardForm({ ...newWardForm, district: e.target.value })}
                    placeholder="e.g. North Municipal District"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden"
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
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newWardForm.lng}
                    onChange={(e) => setNewWardForm({ ...newWardForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden font-mono"
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
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2d7a70] focus:bg-white focus:outline-hidden"
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
                  className="px-4 py-2 bg-[#2d7a70] hover:bg-[#23635b] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isProcessing ? 'Saving to Firestore...' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
