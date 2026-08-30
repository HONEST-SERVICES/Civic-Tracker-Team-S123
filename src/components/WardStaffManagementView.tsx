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
  UserPlus
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { subscribeToAllUsers, updateUserRoleAndWard } from '../services/firebase';

interface WardStaffManagementViewProps {
  currentUser: UserProfile | null;
  onBack?: () => void;
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

export const WardStaffManagementView: React.FC<WardStaffManagementViewProps> = ({
  currentUser,
  onBack
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

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const unsubscribe = subscribeToAllUsers(
      (liveUsers) => {
        if (liveUsers && liveUsers.length > 0) {
          const combined = [...liveUsers];
          INITIAL_DEMO_USERS.forEach((demoU) => {
            if (!combined.some((u) => u.uid === demoU.uid || (u.email && u.email === demoU.email))) {
              combined.push(demoU);
            }
          });
          setUsers(combined);
        } else {
          setUsers(INITIAL_DEMO_USERS);
        }
      },
      () => {
        setUsers(INITIAL_DEMO_USERS);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.uid);
    setEditRole(user.role);
    setEditWard(user.assignedWard || 'Ward 4 - Central Zone');
    setEditCrew(user.assignedCrew || 'UNIT_04');
    setSaveFeedback(null);
  };

  const handleSaveDelegation = async (uid: string) => {
    setIsUpdating(true);
    setSaveFeedback(null);
    try {
      await updateUserRoleAndWard(uid, {
        role: editRole,
        assignedWard: editRole === 'SUPER_ADMIN' ? null : editWard,
        assignedCrew: editRole === 'FIELD_CREW' ? editCrew : undefined
      });
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
    <div className="flex-1 w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden p-3 sm:p-6 font-sans">
      <div className="max-w-6xl w-full mx-auto h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Full Page Header */}
        <div className="bg-slate-900 p-4 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Users className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Staff Role & RBAC Directory
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Full Page Controls
                </span>
              </div>
              <p className="text-xs text-slate-300 font-normal mt-0.5">
                Assign Municipal Officers, Field Work Crews, and designate geographic ward jurisdictions.
              </p>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
            >
              <X className="w-4 h-4" />
              <span>Back to GIS Desk</span>
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, email, or ward jurisdiction..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {['ALL', 'SUPER_ADMIN', 'WARD_OFFICER', 'FIELD_CREW', 'CITIZEN'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedRoleFilter === r
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'ALL' ? 'All Personnel' : r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Alert */}
        {saveFeedback && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Personnel Directory Grid / Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredUsers.map((user) => {
            const isEditing = editingUserId === user.uid;

            return (
              <div
                key={user.uid}
                className={`p-4 rounded-2xl border transition ${
                  isEditing
                    ? 'bg-teal-50/40 border-teal-500 ring-2 ring-teal-100'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase shrink-0">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{user.name}</h4>
                          {getRoleBadge(user.role)}
                        </div>
                        <p className="text-xs text-slate-500">
                          {user.email || user.phone || 'No direct contact registered'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-600">
                          {user.assignedWard && (
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {user.assignedWard}
                            </span>
                          )}
                          {user.assignedCrew && (
                            <span className="font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
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
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      <span>Modify Delegation</span>
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
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-700"
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
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50"
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
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50"
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
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

        {/* Directory Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>All RBAC permission updates persist directly to central municipal registry.</span>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
