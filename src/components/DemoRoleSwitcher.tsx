import React, { useState } from 'react';
import { 
  UserCheck, 
  User, 
  Truck, 
  Building2, 
  Crown, 
  ChevronDown, 
  Check, 
  HeartHandshake,
  ClipboardCheck,
  HardHat
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface DemoRoleSwitcherProps {
  currentRole: UserRole;
  currentUser: UserProfile | null;
  onSwitchRole: (profile: UserProfile) => void;
}

export const DEMO_PRESETS: {
  role: UserRole;
  name: string;
  designation: string;
  ward: string | null;
  crew?: string;
  icon: any;
  color: string;
  uid: string;
  phone: string;
  email: string;
  permissions?: string[];
  description: string;
}[] = [
  {
    role: 'CITIZEN',
    name: 'Sangit Sharma',
    designation: 'Resident • Ward 4',
    ward: 'Ward 4 - Central Zone',
    icon: User,
    color: 'bg-[#115e59] text-white',
    uid: 'citizen-demo-sangit',
    phone: '+91 98765 43210',
    email: 'sangit.citizen@gmail.com',
    permissions: ['VIEW_COMPLAINTS', 'SUBMIT_COMPLAINTS'],
    description: 'Post grievances, track live repair progress, locate & rate SBM facilities.'
  },
  {
    role: 'FIELD_CREW',
    name: 'Ramesh Kumar',
    designation: 'Unit 04 Lead • Field Contractor',
    ward: 'Ward 4 - Central Zone',
    crew: 'UNIT_04',
    icon: HardHat,
    color: 'bg-[#d97706] text-white',
    uid: 'crew-demo-ramesh',
    phone: '+91 98111 22334',
    email: 'ramesh.crew04@moh-ua.gov.in',
    permissions: ['VIEW_ASSIGNED_WORK_ORDERS', 'UPDATE_WORK_ORDER_STATUS'],
    description: 'Ward 4 work order queue, 1-tap "Mark In Progress", upload proof-of-fix.'
  },
  {
    role: 'VOLUNTEER',
    name: 'Ananya Sen',
    designation: 'Swachhata Doot Community Lead',
    ward: 'Ward 4 - Central Zone',
    icon: HeartHandshake,
    color: 'bg-[#15803d] text-white',
    uid: 'volunteer-demo-ananya',
    phone: '+91 98333 44556',
    email: 'ananya.volunteer@swachhbharat.org',
    permissions: ['SPOT_CHECK_VERIFICATION', 'UPVOTE_HAZARD', 'AUDIT_FACILITIES'],
    description: 'Community spot-check verification, upvote hazard urgency, SBM hygiene audits.'
  },
  {
    role: 'SWACHH_SURVEKSHAN_AUDITOR',
    name: 'Dr. Vikram Malhotra',
    designation: 'MoHUA National Quality Inspector',
    ward: 'ALL',
    icon: ClipboardCheck,
    color: 'bg-[#0f766e] text-white',
    uid: 'auditor-demo-vikram',
    phone: '+91 98444 55667',
    email: 'vikram.auditor@moh-ua.gov.in',
    permissions: ['INSPECT_COMPLIANCE', 'AUDIT_WARD_SCORES', 'ODF_VERIFICATION'],
    description: 'Independent inspection scoring desk, verify SOPs without altering dispatch.'
  },
  {
    role: 'WARD_OFFICER',
    name: 'Er. Rajesh Verma',
    designation: 'Assistant Engineer (Ward 4)',
    ward: 'Ward 4 - Central Zone',
    icon: Building2,
    color: 'bg-[#0d5c52] text-white',
    uid: 'officer-demo-rajesh',
    phone: '+91 98222 33445',
    email: 'rajesh.ae.ward4@moh-ua.gov.in',
    permissions: ['MANAGE_WARD_COMPLAINTS', 'DISPATCH_CREW', 'VERIFY_RESOLUTION'],
    description: 'Ward 4 inspection desk, dispatch triage, resolution verification.'
  },
  {
    role: 'SUPER_ADMIN',
    name: 'Avinash Peela (Master Super Admin)',
    designation: 'Municipal Commissioner & SBM Chief Director',
    ward: 'ALL',
    icon: Crown,
    color: 'bg-slate-900 text-amber-400 border border-amber-400/40',
    uid: 'master-superadmin-peela',
    phone: '+91 98999 00001',
    email: 'peelaavinash04@gmail.com',
    permissions: ['ALL_ACCESS', 'MANAGE_WARDS', 'MANAGE_STAFF', 'OVERRIDE_DISPATCH'],
    description: 'Master Super Admin: All Wards GIS control, Ward Config & Staff Delegations.'
  }
];

export const DemoRoleSwitcher: React.FC<DemoRoleSwitcherProps> = ({
  currentRole,
  currentUser,
  onSwitchRole
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const activePreset = DEMO_PRESETS.find(p => p.role === currentRole) || DEMO_PRESETS[0];
  const IconComponent = activePreset.icon;

  const handleSelect = (preset: typeof DEMO_PRESETS[0]) => {
    const profile: UserProfile = {
      uid: preset.uid,
      name: preset.name,
      phone: preset.phone,
      email: preset.email,
      role: preset.role,
      assignedWard: preset.ward,
      assignedCrew: preset.crew,
      designation: preset.designation,
      permissions: preset.permissions || ['ALL_ACCESS']
    };
    onSwitchRole(profile);
    setIsOpen(false);
  };

  return (
    <div className="relative z-40">
      {/* Clean Civic Role Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-full text-xs font-semibold transition cursor-pointer shadow-xs"
        title="Switch Operational Role"
      >
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
          <IconComponent className="w-3.5 h-3.5" strokeWidth={1.75} />
        </div>
        <div className="text-left leading-tight hidden sm:block">
          <span className="font-bold tracking-tight text-white block truncate max-w-[130px]">
            {activePreset.name.split(' ')[0]}
          </span>
        </div>
        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-normal text-teal-100 hidden md:inline">
          {activePreset.role.replace(/_/g, ' ')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-teal-100 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Role Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-84 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#115e59]" strokeWidth={1.75} />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Operational Role Selector
              </span>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-800 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
              6 Roles
            </span>
          </div>

          <div className="p-1 space-y-1 mt-1 overflow-x-auto">
            {DEMO_PRESETS.map((preset) => {
              const isCurrent = preset.role === currentRole;
              const PctIcon = preset.icon;

              return (
                <button
                  key={preset.role}
                  onClick={() => handleSelect(preset)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-3 cursor-pointer ${
                    isCurrent 
                      ? 'bg-[#115e59] text-white shadow-xs' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${isCurrent ? 'bg-white/20 text-white' : preset.color} flex items-center justify-center shrink-0 shadow-xs mt-0.5`}>
                    <PctIcon className="w-4 h-4" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                        {preset.name}
                      </span>
                      {isCurrent && <Check className="w-4 h-4 text-teal-200 shrink-0" strokeWidth={2} />}
                    </div>

                    <p className={`text-[11px] font-medium ${isCurrent ? 'text-teal-100' : 'text-[#115e59]'}`}>
                      {preset.designation}
                    </p>

                    <p className={`text-[10px] mt-0.5 line-clamp-1 ${isCurrent ? 'text-teal-100/80' : 'text-slate-500'}`}>
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[10px] text-slate-600 leading-tight">
            Municipal Grid Sync: Real-time role-based access for Swachhata operations.
          </div>
        </div>
      )}
    </div>
  );
};
