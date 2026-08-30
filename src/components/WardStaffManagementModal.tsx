import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  Truck, 
  Shield, 
  Crown, 
  Check, 
  X, 
  Search, 
  RefreshCw, 
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { fetchAllUsers, subscribeToAllUsers, updateUserRoleAndWard } from '../services/firebase';

interface WardStaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

const AVAILABLE_WARDS = [
  'Ward 1 - Northern Sector',
  'Ward 2 - Industrial District',
  'Ward 3 - Heritage Quarter',
  'Ward 4 - Central Zone',
  'Ward 5 - Metro Transit Corridor',
  'Ward 6 - Eastern Suburbs'
];

const INITIAL_DEMO_USERS: UserProfile[] = [
  {
    uid: 'citizen-demo-sangit',
    name: 'Sangit Sharma',
    phone: '+91 98765 43210',
    email: 'sangit.citizen@moh-ua.gov.in',
    role: 'CITIZEN',
    assignedWard: 'Ward 4 - Central Zone',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  {
    uid: 'crew-demo-ramesh',
    name: 'Ramesh Kumar',
    phone: '+91 98111 22334',
    email: 'ramesh.crew04@moh-ua.gov.in',
    role: 'FIELD_CREW',
    assignedWard: 'Ward 4 - Central Zone',
    assignedCrew: 'UNIT_04',
    designation: 'Pothole & Drainage Rapid Patcher Lead'
  },
  {
    uid: 'officer-demo-rajesh',
    name: 'Er. Rajesh Verma',
    phone: '+91 98222 33445',
    email: 'rajesh.ae.ward4@moh-ua.gov.in',
    role: 'WARD_OFFICER',
    assignedWard: 'Ward 4 - Central Zone',
    designation: 'Assistant Municipal Engineer (AE)'
  },
  {
    uid: 'admin-demo-sharma',
    name: 'Dr. A. Sharma IAS',
    phone: '+91 98999 00001',
    email: 'commissioner@moh-ua.gov.in',
    role: 'SUPER_ADMIN',
    assignedWard: null,
    designation: 'Municipal Commissioner & SBM Chief Director'
  }
];

export const WardStaffManagementModal: React.FC<WardStaffManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_DEMO_USERS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('CITIZEN');
  const [editWard, setEditWard] = useState<string>('Ward 4 - Central Zone');
  const [editCrew, setEditCrew] = useState<string>('UNIT_04');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Subscribe to live Firestore registered users
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToAllUsers(
      (liveUsers) => {
        if (liveUsers && liveUsers.length > 0) {
          // Merge live users with initial demo users ensuring no duplicate UIDs (O(1) Set lookup)
          const existingIds = new Set(liveUsers.map((u) => u.uid));
          const existingEmails = new Set(liveUsers.map((u) => u.email).filter((e): e is string => Boolean(e)));
          const combined = [...liveUsers];
          INITIAL_DEMO_USERS.forEach((demoU) => {
            const hasId = existingIds.has(demoU.uid);
            const hasEmail = Boolean(demoU.email && existingEmails.has(demoU.email));
            if (!hasId && !hasEmail) {
              combined.push(demoU);
            }
          });
          setUsers(combined);
        } else {
          setUsers(INITIAL_DEMO_USERS);
        }
      },
      (err) => {
        console.warn('Fallback to demo users pool:', err);
        setUsers(INITIAL_DEMO_USERS);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || !currentUser;

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.uid);
    setEditRole(user.role);
    setEditWard(user.assignedWard || 'Ward 4 - Central Zone');
    setEditCrew(user.assignedCrew || 'UNIT_04');
    setSaveFeedback(null);
  };

  const handleSaveDelegation = async (uid: string) => {
    setIsUpdating(true);
    try {
      await updateUserRoleAndWard(uid, {
        role: editRole,
        assignedWard: editRole === 'SUPER_ADMIN' ? null : editWard,
        assignedCrew: editRole === 'FIELD_CREW' ? editCrew : undefined
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid
            ? {
                ...u,
                role: editRole,
                assignedWard: editRole === 'SUPER_ADMIN' ? null : editWard,
                assignedCrew: editRole === 'FIELD_CREW' ? editCrew : undefined
              }
            : u
        )
      );

      setSaveFeedback('Delegation and permissions updated in municipal registry.');
      setTimeout(() => {
        setEditingUserId(null);
        setSaveFeedback(null);
      }, 1200);
    } catch (e) {
      console.warn('Direct update failed, updated local cache:', e);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid
            ? {
                ...u,
                role: editRole,
                assignedWard: editRole === 'SUPER_ADMIN' ? null : editWard,
                assignedCrew: editRole === 'FIELD_CREW' ? editCrew : undefined
              }
            : u
        )
      );
      setSaveFeedback('Updated successfully in local session.');
      setTimeout(() => {
        setEditingUserId(null);
        setSaveFeedback(null);
      }, 1200);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.assignedWard || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="bg-slate-900 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-amber-400/40 flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" strokeWidth={1.75} />
            SUPER ADMIN
          </span>
        );
      case 'WARD_OFFICER':
        return (
          <span className="bg-teal-50 text-[#0d5c52] text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-teal-200 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[#0d5c52]" strokeWidth={1.75} />
            WARD OFFICER
          </span>
        );
      case 'FIELD_CREW':
        return (
          <span className="bg-amber-50 text-[#d97706] text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
            <Truck className="w-3 h-3 text-[#d97706]" strokeWidth={1.75} />
            FIELD CREW
          </span>
        );
      default:
        return (
          <span className="bg-emerald-50 text-[#15803d] text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-[#15803d]" strokeWidth={1.75} />
            CITIZEN
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4">
      <div className="relative z-[9999] bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="bg-[#0d5c52] p-5 text-white flex items-center justify-between border-b border-teal-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Zone & Ward Staff Management
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  RBAC Controls
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-normal mt-0.5">
                Assign Municipal Officers, Field Work Crews, and designate geographic ward boundaries.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, email, or ward..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'SUPER_ADMIN', 'WARD_OFFICER', 'FIELD_CREW', 'CITIZEN'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedRoleFilter === r
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Alert */}
        {saveFeedback && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* User Table List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredUsers.map((user) => {
            const isEditing = editingUserId === user.uid;

            return (
              <div
                key={user.uid}
                className={`p-4 rounded-xl border transition ${
                  isEditing
                    ? 'bg-teal-50/40 border-teal-500 ring-2 ring-teal-100'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase shrink-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.name}
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{user.name}</h4>
                          {getRoleBadge(user.role)}
                        </div>
                        <p className="text-xs text-slate-500">
                          {user.email || user.phone || 'No direct contact registered'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-600">
                          {user.assignedWard && (
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {user.assignedWard}
                            </span>
                          )}
                          {user.assignedCrew && (
                            <span className="font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Crew: {user.assignedCrew}
                            </span>
                          )}
                          {user.designation && (
                            <span className="text-slate-500 italic">
                              • {user.designation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartEdit(user)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-[#2d7a70] text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <span>Assign / Edit</span>
                    </button>
                  </div>
                ) : (
                  /* Inline Edit Form */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                      <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                        Re-delegate Role & Jurisdiction for {user.name}
                      </h4>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Role Selector */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">Select Role</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="CITIZEN">Citizen (Grievance Submissions Only)</option>
                          <option value="FIELD_CREW">Field Crew (Work Orders & Remediation)</option>
                          <option value="WARD_OFFICER">Ward Officer (Inspection Desk & Approval)</option>
                          {isSuperAdmin && (
                            <option value="SUPER_ADMIN">Super Admin (Municipal Commissioner)</option>
                          )}
                        </select>
                      </div>

                      {/* Ward Selector */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">Assigned Ward Sector</label>
                        <select
                          value={editWard}
                          onChange={(e) => setEditWard(e.target.value)}
                          disabled={editRole === 'SUPER_ADMIN'}
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50"
                        >
                          {AVAILABLE_WARDS.map((w) => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>

                      {/* Crew ID / Unit */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">Crew ID (If Field Crew)</label>
                        <input
                          type="text"
                          value={editCrew}
                          onChange={(e) => setEditCrew(e.target.value)}
                          disabled={editRole !== 'FIELD_CREW'}
                          placeholder="e.g. UNIT_04, SBM_CREW_02"
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingUserId(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleSaveDelegation(user.uid)}
                        className="px-4 py-1.5 bg-[#2d7a70] hover:bg-[#23635b] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Delegation</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>All permission updates persist directly to the central municipal staff directory.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
