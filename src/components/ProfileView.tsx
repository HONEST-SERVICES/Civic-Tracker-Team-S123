import React, { useState, useRef } from 'react';
import { 
  User, 
  CheckCircle2, 
  MapPin, 
  Languages, 
  LogOut, 
  ChevronRight, 
  Sparkles, 
  Settings, 
  Camera, 
  Loader2, 
  Smartphone, 
  Download,
  Bell,
  ShieldCheck,
  FileText,
  X,
  Copy,
  Check,
  Activity,
  Clock,
  CheckCircle
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { UserProfile, UserRole } from '../types';
import { 
  SUPPORTED_LANGUAGES, 
  LanguageCode
} from '../utils/translations';
import { useLanguage } from '../context/LanguageContext';
import { compressImage } from '../utils/imageCompressor';
import { updateUserProfilePhoto } from '../services/firebase';
import { getUserInitials } from '../utils/userUtils';
import { formatCitizenId } from '../utils/idUtils';

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
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Notification toggles state (persisted locally)
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('civic_push_notifications') !== 'false';
  });
  const [smsEnabled, setSmsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('civic_sms_notifications') !== 'false';
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  const togglePush = () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    localStorage.setItem('civic_push_notifications', String(next));
  };

  const toggleSms = () => {
    const next = !smsEnabled;
    setSmsEnabled(next);
    localStorage.setItem('civic_sms_notifications', String(next));
  };

  const handleCopyCitizenId = () => {
    const formatted = formatCitizenId(currentUser?.uid);
    navigator.clipboard.writeText(formatted);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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
  const displayName = (currentUser as any)?.displayName || currentUser?.name || 'Verified Citizen';
  const displayEmail = currentUser?.email || currentUser?.phone || 'citizen@swachhbharat.gov.in';
  const userRole: UserRole = currentUser?.role || 'CITIZEN';
  const assignedWard = currentUser?.assignedWard || 'Ward 4 (Central Zone)';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isOfficerOrAdmin = userRole === 'WARD_OFFICER' || isSuperAdmin;
  const isCitizen = userRole === 'CITIZEN';
  const formattedCitizenId = formatCitizenId(currentUser?.uid);

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100 font-sans pb-28 px-4 pt-4 space-y-4 max-w-2xl mx-auto">
      
      {/* Toast Notification */}
      {(languageChangeNotice || photoNotice) && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{photoNotice || languageChangeNotice}</span>
          </div>
        </div>
      )}

      {/* 1. IDENTITY & PROFILE HEADER */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        {/* Hidden input for profile picture picker */}
        <input
          type="file"
          ref={profileFileInputRef}
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        <div className="flex items-center gap-4">
          {/* Avatar / Profile Badge with Camera Trigger */}
          <div 
            onClick={() => profileFileInputRef.current?.click()}
            className="relative shrink-0 cursor-pointer group"
            title="Click to change profile picture"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-800 to-teal-900 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xl overflow-hidden">
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
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-600 text-white flex items-center justify-center rounded-full shadow-xs border-2 border-white group-hover:bg-teal-700 transition">
              {isUploadingPhoto ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </div>
          </div>

          {/* User Details with Formatted Human-Readable Citizen ID */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {displayName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3"/> {isCitizen ? 'Verified Citizen' : getDisplayRoleName(userRole, assignedWard)}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {displayEmail}
            </p>

            {/* Human-Readable Formatted ID with 1-Tap Copy */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleCopyCitizenId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-mono font-bold transition border border-slate-200/80 cursor-pointer group"
                title="Click to copy Citizen ID"
              >
                <span>ID: {formattedCitizenId}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                )}
              </button>
              {copiedId && (
                <span className="text-[10px] text-emerald-600 font-semibold animate-fade-in">Copied!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CITIZEN SPECIFIC SERVICES & STATS (FOR CITIZENS ONLY) */}
      {isCitizen && (
        <>
          {/* 1. My Grievance Stats */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>My Grievance Overview</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Total Filed</span>
                <span className="text-lg font-extrabold text-teal-900 mt-0.5 block">4</span>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Active</span>
                <span className="text-lg font-extrabold text-amber-900 mt-0.5 block">1</span>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Resolved</span>
                <span className="text-lg font-extrabold text-emerald-900 mt-0.5 block">3</span>
              </div>
            </div>
          </div>

          {/* 2. Citizen Services Suite */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Citizen Services
            </h3>

            <div className="space-y-3">
              {/* 🤖 AI Civic Copilot (Autonomous GovTech AI) */}
              {onOpenGeminiCopilot && (
                <button
                  id="profile-gemini-copilot-btn"
                  onClick={onOpenGeminiCopilot}
                  className="w-full p-3.5 rounded-xl bg-teal-50/80 hover:bg-teal-100/70 border border-teal-200 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-teal-950">
                        🤖 AI Civic Copilot (Autonomous GovTech AI)
                      </h4>
                      <p className="text-[11px] text-teal-700 mt-0.5">
                        Instant statutory SLAs, grievance assistance & municipal guidance
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* 📱 Install App (PWA) */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>Install Mobile App (PWA)</span>
                      {isInstalled && (
                        <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40">
                          Installed
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                      {isInstalled
                        ? 'CivicPulse installed on this device'
                        : 'Add to Home Screen for 1-tap fast mobile access'}
                    </p>
                  </div>
                </div>
                {!isInstalled && (
                  <button
                    onClick={triggerInstall}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition shrink-0 cursor-pointer shadow-xs border border-teal-400/30 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install</span>
                  </button>
                )}
              </div>

              {/* 🌐 App Language Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-teal-700" />
                    <span>App Language / भाषा / భాష</span>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isActive = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        id={`profile-lang-${lang.code}`}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
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

              {/* 🔔 Notification Preferences */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900">Notification Preferences</h4>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">Push Notifications</p>
                      <p className="text-[11px] text-slate-500">Real-time alerts on grievance status changes</p>
                    </div>
                    <button
                      type="button"
                      onClick={togglePush}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                        pushEnabled ? 'bg-teal-700' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                          pushEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                    <div>
                      <p className="font-semibold text-slate-800">SMS Updates</p>
                      <p className="text-[11px] text-slate-500">Critical ticket dispatch & resolution notices</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleSms}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                        smsEnabled ? 'bg-teal-700' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                          smsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 🚪 Sign Out Button */}
              <button
                id="profile-signout-btn"
                onClick={onSignOut}
                className="w-full p-3.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition shadow-xs text-xs"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 3. ADMINISTRATIVE COMMAND SUITE (OFFICERS & SUPER ADMINS ONLY) */}
      {!isCitizen && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Municipal Command & Staff Suite</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onSwitchToTacticalDesk && (
              <button
                id="profile-switch-tactical-desk-btn"
                onClick={onSwitchToTacticalDesk}
                className="p-3.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-900 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div>
                  <h4 className="font-bold text-xs">Switch to Tactical Desk</h4>
                  <p className="text-[10px] text-teal-700 mt-0.5">Municipal command view</p>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {onOpenStaffManagement && isOfficerOrAdmin && (
              <button
                id="profile-manage-staff-btn"
                onClick={onOpenStaffManagement}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div>
                  <h4 className="font-bold text-xs">Staff Management</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ward team & assignments</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {onOpenSettingsModal && (
            <button
              id="profile-open-full-settings-btn"
              onClick={onOpenSettingsModal}
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-600" />
                <span>Advanced System Configuration</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {onOpenAuthModal && (
            <button
              id="profile-switch-account-btn"
              onClick={onOpenAuthModal}
              className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-600" />
              <span>Switch Administrative Account</span>
            </button>
          )}

          <button
            id="profile-officer-signout-btn"
            onClick={onSignOut}
            className="w-full p-3.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition shadow-xs text-xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out Administrative Session</span>
          </button>
        </div>
      )}

      {/* Privacy & Terms Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative z-[9999] bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Privacy & Citizen Charter</span>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              <p>
                <strong>1. Data Protection:</strong> Citizen reports and geo-locations are used strictly for municipal grievance redressal under the Swachh Bharat Mission (Urban).
              </p>
              <p>
                <strong>2. Automated Processing:</strong> Photographic submissions are processed by AI models to determine category and priority. You may review and edit suggestions prior to submission.
              </p>
              <p>
                <strong>3. SLA Guarantees:</strong> Emergency civic hazards are routed to zonal field response teams with real-time status updates provided in your dashboard.
              </p>
            </div>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
