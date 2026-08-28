import React, { useState } from 'react';
import { 
  FlaskConical, 
  User, 
  Truck, 
  Building2, 
  Crown, 
  ChevronDown, 
  Check, 
  Sparkles,
  ShieldAlert
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
  description: string;
}[] = [
  {
    role: 'CITIZEN',
    name: 'Sangit Sharma',
    designation: 'Resident • Ward 4',
    ward: 'Ward 4 - Central Zone',
    icon: User,
    color: 'bg-teal-600 text-white',
    uid: 'citizen-demo-sangit',
    phone: '+91 98765 43210',
    email: 'sangit.citizen@gmail.com',
    description: 'Post grievances, track live repair progress, rate resolved work.'
  },
  {
    role: 'FIELD_CREW',
    name: 'Ramesh Kumar',
    designation: 'Unit 04 Lead',
    ward: 'Ward 4 - Central Zone',
    crew: 'UNIT_04',
    icon: Truck,
    color: 'bg-amber-600 text-white',
    uid: 'crew-demo-ramesh',
    phone: '+91 98111 22334',
    email: 'ramesh.crew04@moh-ua.gov.in',
    description: 'Ward 4 work orders, status updates, completion photo upload.'
  },
  {
    role: 'WARD_OFFICER',
    name: 'Er. Rajesh Verma',
    designation: 'Assistant Engineer (Ward 4)',
    ward: 'Ward 4 - Central Zone',
    icon: Building2,
    color: 'bg-blue-600 text-white',
    uid: 'officer-demo-rajesh',
    phone: '+91 98222 33445',
    email: 'rajesh.ae.ward4@moh-ua.gov.in',
    description: 'Ward 4 inspection desk, dispatch triage, resolution verification.'
  },
  {
    role: 'SUPER_ADMIN',
    name: 'Dr. A. Sharma IAS',
    designation: 'Municipal Commissioner',
    ward: null,
    icon: Crown,
    color: 'bg-purple-700 text-white',
    uid: 'admin-demo-sharma',
    phone: '+91 98999 00001',
    email: 'commissioner@moh-ua.gov.in',
    description: 'All 6 wards GIS control, autonomous AI engine, staff delegation.'
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
      designation: preset.designation
    };
    onSwitchRole(profile);
    setIsOpen(false);
  };

  return (
    <div className="relative z-40">
      {/* Floating Demo Role Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white border border-amber-400/60 rounded-full shadow-md text-xs font-bold transition cursor-pointer group ring-2 ring-amber-400/20"
        title="Quick Role Switcher for Hackathon Evaluation"
      >
        <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[11px] shrink-0 animate-pulse">
          <FlaskConical className="w-3 h-3" />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] text-amber-300 font-extrabold hidden md:inline">Demo Role:</span>
          <span className="text-[11px] text-white font-bold max-w-[90px] sm:max-w-[130px] truncate">
            {activePreset.name.split(' ')[0]} ({activePreset.role.replace('_', ' ')})
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-amber-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)} 
          />

          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-40 space-y-1.5 animate-fade-in text-slate-800">
            <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                <span>Evaluator Role Switcher</span>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                1-Click Testing
              </span>
            </div>

            <p className="text-[11px] text-slate-500 px-2.5 pb-1">
              Switch persona to test strict ward scoping & hierarchical permissions:
            </p>

            <div className="space-y-1">
              {DEMO_PRESETS.map((preset) => {
                const isSelected = currentRole === preset.role;
                const PresetIcon = preset.icon;

                return (
                  <button
                    key={preset.role}
                    onClick={() => handleSelect(preset)}
                    className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 border border-slate-300 font-semibold'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${preset.color} flex items-center justify-center shrink-0 shadow-xs`}>
                      <PresetIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {preset.designation} {preset.ward ? `• ${preset.ward.split(' - ')[0]}` : '• All Wards'}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
