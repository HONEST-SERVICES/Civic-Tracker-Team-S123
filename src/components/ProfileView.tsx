import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  UserCircle, 
  Shield, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Map as MapIcon, 
  Languages, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronRight, 
  Sparkles, 
  Settings, 
  KeyRound, 
  Users, 
  Radio, 
  Building2, 
  Crown, 
  Award, 
  Activity, 
  Crosshair, 
  Lock,
  Layers,
  Phone,
  Mail,
  FileCheck,
  Camera,
  Loader2,
  Smartphone,
  Download
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { UserProfile, UserRole } from '../types';
import { 
  getCurrentLanguage, 
  SUPPORTED_LANGUAGES, 
  LanguageCode, 
  t 
} from '../utils/translations';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { compressImage } from '../utils/imageCompressor';
import { updateUserProfilePhoto } from '../services/firebase';
import { getUserInitials } from '../utils/userUtils';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  onSignOut: () => void;
  onSwitchToTacticalDesk?: () => void;
  onOpenStaffManagement?: () => void;
  onOpenAuthModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenGeminiCopilot?: () => void;
  onUpdateUserProfile?: (updatedProfile: UserProfile) => void;
}

export function getDisplayRoleName(role?: UserRole, ward?: string | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Master Super Admin';
    case 'WARD_OFFICER':
      return ward ? `${ward} Officer` : 'Ward Officer';
    case 'FIELD_CREW':
    case 'FIELD_CONTRACTOR':
      return 'Field Contractor Lead';
    case 'VOLUNTEER':
    case 'SWACHHATA_DOOT':
      return 'Swachhata Doot';
    case 'SWACHH_SURVEKSHAN_AUDITOR':
      return 'National Quality Auditor';
    case 'CITIZEN':
    default:
      return 'Verified Citizen';
  }
}

export function getDesignationLabel(role?: UserRole, customDesignation?: string): string {
  if (customDesignation && customDesignation.trim()) return customDesignation;
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator (MoHUA Apex HQ)';
    case 'WARD_OFFICER':
      return 'Ward Sanitary Inspector & Assistant Engineer';
    case 'FIELD_CREW':
    case 'FIELD_CONTRACTOR':
      return 'Field Remediation Contractor';
    case 'VOLUNTEER':
    case 'SWACHHATA_DOOT':
      return 'Honorary Swachhata Volunteer';
    case 'SWACHH_SURVEKSHAN_AUDITOR':
      return 'National Third-Party Quality Auditor';
    case 'CITIZEN':
    default:
      return 'Registered Resident & Civic Contributor';
  }
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onSignOut,
  onSwitchToTacticalDesk,
  onOpenStaffManagement,
  onOpenAuthModal,
  onOpenSettingsModal,
  onOpenGeminiCopilot,
  onUpdateUserProfile
}) => {
  const { language, setLanguage } = useLanguage();
  const [languageChangeNotice, setLanguageChangeNotice] = useState<string | null>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setPhotoNotice('Compressing & updating profile photo...');
      const result = await compressImage(file, 256, 256, 0.75);
      const photoURL = result.compressedBase64;

      await updateUserProfilePhoto(photoURL, currentUser?.uid);

      if (currentUser && onUpdateUserProfile) {
        onUpdateUserProfile({
          ...currentUser,
          photoURL
        });
      }

      setPhotoNotice('Profile picture updated successfully!');
      setTimeout(() => setPhotoNotice(null), 3000);
    } catch (err) {
      console.error('Failed to upload profile photo:', err);
      setPhotoNotice('Photo update failed.');
      setTimeout(() => setPhotoNotice(null), 3000);
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    const langName = lang === 'hi' ? 'हिन्दी' : lang === 'te' ? 'తెలుగు' : 'English';
    setLanguageChangeNotice(`Language set to ${langName}`);
    setTimeout(() => setLanguageChangeNotice(null), 3000);
  };

  // Safe user properties with fallbacks
  const displayName = (currentUser as any)?.displayName || currentUser?.name || 'Municipal Officer';
  const displayEmail = currentUser?.email || currentUser?.phone || 'officer@swachhbharat.gov.in';
  const userRole: UserRole = currentUser?.role || 'WARD_OFFICER';
  const designation = getDesignationLabel(userRole, currentUser?.designation);
  const assignedWard = currentUser?.assignedWard || 'Ward 4 - Central Zone';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isOfficerOrAdmin = userRole === 'WARD_OFFICER' || isSuperAdmin;
  const isFieldCrew = userRole === 'FIELD_CREW' || userRole === 'FIELD_CONTRACTOR';
  const isStaffRole = userRole !== 'CITIZEN';

  // Default permissions if not populated
  const activePermissions = currentUser?.permissions && currentUser.permissions.length > 0
    ? currentUser.permissions
    : isSuperAdmin
    ? ['ALL_ACCESS', 'MANAGE_WARDS', 'DISPATCH_CREW', 'INSPECT_RESOLUTIONS', 'SYSTEM_OVERRIDE']
    : userRole === 'WARD_OFFICER'
    ? ['DISPATCH_CREW', 'INSPECT_RESOLUTIONS', 'WARD_TELEMETRY', 'VERIFY_COMPLAINTS']
    : isFieldCrew
    ? ['FIELD_REMEDIATION', 'UPLOAD_PROOF_OF_WORK', 'CREW_STATUS_UPDATE']
    : ['SUBMIT_GRIEVANCE', 'VERIFY_PUBLIC_FACILITIES', 'COMMUNITY_DRIVE_ENROLL'];

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100 font-sans pb-28 px-4 pt-4 space-y-4 max-w-3xl mx-auto">
      
      {/* Language / Photo Change Notification Toast */}
      {(languageChangeNotice || photoNotice) && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{photoNotice || languageChangeNotice}</span>
          </div>
        </div>
      )}

      {/* 1. USER HEADER (Clean GovTech Identity Card) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        {/* Hidden input for profile picture picker */}
        <input
          type="file"
          ref={profileFileInputRef}
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        <div className="flex items-start gap-3.5">
          {/* Avatar / Profile Badge with Camera Trigger */}
          <div 
            onClick={() => profileFileInputRef.current?.click()}
            className="relative shrink-0 cursor-pointer group"
            title="Click to change profile picture"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xl sm:text-2xl overflow-hidden">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{getUserInitials(displayName)}</span>
              )}
            </div>
            
            {/* Interactive Camera Badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white flex items-center justify-center rounded-full shadow-xs border-2 border-white group-hover:bg-blue-700 transition">
              {isUploadingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {displayName}
              </h2>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified Active
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {displayEmail}
            </p>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {/* Designation Badge */}
              <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 truncate">
                {designation}
              </span>

              {/* Assigned Jurisdiction Badge */}
              <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{assignedWard}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Role & Jurisdiction Highlight Banner */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600 animate-pulse" />
            <div>
              <span className="font-semibold text-slate-700">Official Access Level:</span>{' '}
              <strong className="text-slate-900 font-bold">
                {getDisplayRoleName(userRole, assignedWard)}
              </strong>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            ID: {currentUser?.uid ? currentUser.uid.slice(0, 8) : 'AUTH-MOHUA'}
          </span>
        </div>
      </div>

      {/* 2. OPERATIONAL SHORTCUTS & QUICK NAVIGATION */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-[#2d7a70]" />
          <span>Operational Shortcuts & Dispatch Desk</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Switch to Officer GIS Tactical Desk */}
          {onSwitchToTacticalDesk && (
            <button
              id="profile-switch-tactical-desk-btn"
              onClick={onSwitchToTacticalDesk}
              className="p-3 rounded-xl bg-teal-50/80 hover:bg-teal-100/90 border border-teal-200/90 text-[#115e59] text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-teal-950 group-hover:text-teal-900">
                    Switch to Officer GIS Tactical Desk
                  </h4>
                  <p className="text-[10px] text-teal-700 mt-0.5">
                    View real-time map, telemetry & crew dispatch
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Manage Staff Delegations (Super Admin / Officers) */}
          {onOpenStaffManagement && isOfficerOrAdmin && (
            <button
              id="profile-manage-staff-btn"
              onClick={onOpenStaffManagement}
              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    Ward Staff & RBAC Delegations
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Manage field contractors, roles & wards
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Gemini AI Copilot */}
          {onOpenGeminiCopilot && (
            <button
              id="profile-gemini-copilot-btn"
              onClick={onOpenGeminiCopilot}
              className="p-3 rounded-xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 text-blue-900 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-blue-950">
                    Gemini AI Civic Assistant
                  </h4>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Autonomous dispatch & grievance triage
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* PWA App Installation Button / Card */}
          <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 text-left transition flex items-center justify-between group shadow-xs col-span-1 sm:col-span-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>📱 Install CivicPulse App</span>
                  {isInstalled && (
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40">
                      Installed
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-300 mt-0.5 truncate">
                  {isInstalled
                    ? 'CivicPulse standalone web app active'
                    : 'Add to Home Screen for full-screen offline mobile ops'}
                </p>
              </div>
            </div>
            {!isInstalled && (
              <button
                onClick={triggerInstall}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs border border-blue-400/30 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. ROLE & ACCESS PERMISSIONS SUMMARY */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Role & Access Permissions</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {isSuperAdmin ? 'Level 4 (Apex)' : isOfficerOrAdmin ? 'Level 3 (Command)' : isFieldCrew ? 'Level 2 (Field)' : 'Level 1 (Citizen)'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Assigned Department:</span>
            <span className="font-bold text-slate-900">
              {isSuperAdmin ? 'MoHUA National Apex' : 'Public Works & Sanitation'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Geographic Jurisdiction:</span>
            <span className="font-bold text-slate-900">{assignedWard}</span>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Granted RBAC Security Capabilities:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activePermissions.map((perm) => (
                <span
                  key={perm}
                  className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 inline-flex items-center gap-1 shadow-2xs"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PREFERENCES & SETTINGS (Language, Theme, Alerts) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-slate-600" />
          <span>Preferences & Language</span>
        </h3>

        {/* Multi-Language Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-blue-600" />
            <span>Interface Language / भाषा / భాష</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  id={`profile-lang-${lang.code}`}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="text-xs leading-tight">{lang.nativeLabel}</span>
                  <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {lang.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Full Settings Modal Trigger */}
        {onOpenSettingsModal && (
          <div className="pt-2">
            <button
              id="profile-open-full-settings-btn"
              onClick={onOpenSettingsModal}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Open Detailed System Preferences</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. ACCOUNT ACTIONS (Switch Profile & Clean Sign Out) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Account Actions & Session Security
        </h3>

        {onOpenAuthModal && (
          <button
            id="profile-switch-account-btn"
            onClick={onOpenAuthModal}
            className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Switch Role / Sign In with Another Account</span>
          </button>
        )}

        {/* Dedicated Sign Out Button as specified */}
        <button
          id="profile-signout-btn"
          onClick={onSignOut}
          className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium w-full cursor-pointer transition shadow-xs text-xs"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Sign Out of Municipal Session</span>
        </button>
      </div>

    </div>
  );
};
