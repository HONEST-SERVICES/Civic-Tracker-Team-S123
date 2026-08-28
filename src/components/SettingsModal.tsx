import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Bell,
  Map,
  Compass,
  Volume2,
  Radio,
  Languages,
  Sun
} from 'lucide-react';
import { pingFirestoreHealthCheck } from '../services/firebase';
import { 
  getCurrentLanguage, 
  setLanguage, 
  SUPPORTED_LANGUAGES, 
  LanguageCode, 
  t 
} from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export interface AppPreferences {
  pushNotifications: boolean;
  mapTheme: 'light' | 'satellite';
  locationPrecision: 'high' | 'standard';
  soundAlerts: boolean;
  language: LanguageCode;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  pushNotifications: true,
  mapTheme: 'light',
  locationPrecision: 'high',
  soundAlerts: true,
  language: 'en'
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    try {
      const saved = localStorage.getItem('swachhata_user_preferences');
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setTestStatus('IDLE');
      setTestMessage('');
      try {
        const saved = localStorage.getItem('swachhata_user_preferences');
        if (saved) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) });
        }
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
      setCurrentLang(getCurrentLanguage());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: LanguageCode) => {
    const updated: AppPreferences = { ...preferences, language: lang };
    setPreferences(updated);
    setLanguage(lang);
    setCurrentLang(lang);
    try {
      localStorage.setItem('swachhata_user_preferences', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist language preference:', e);
    }
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const handleSave = () => {
    // Ensure dark class is removed
    document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem('swachhata_user_preferences', JSON.stringify(preferences));
    } catch (e) {
      console.warn('Could not persist preferences:', e);
    }
    setSavedSuccess(true);
    if (onConfigUpdated) {
      onConfigUpdated();
    }
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestMessage('Checking Municipal Cloud Grid connectivity...');
    try {
      const result = await pingFirestoreHealthCheck();
      if (result.ok) {
        setTestStatus('SUCCESS');
        setTestMessage(`Connected to Municipal Grid ✓ (${result.latencyMs}ms latency)`);
      } else {
        setTestStatus('ERROR');
        setTestMessage('Sync Offline ⚠️');
      }
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage('Sync Offline ⚠️');
    }
  };

  const togglePref = (key: keyof AppPreferences) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
      };
      try {
        localStorage.setItem('swachhata_user_preferences', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist toggle:', e);
      }
      return updated;
    });
  };

  return (
    <div 
      id="settings-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="settings-modal-dialog"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] font-sans"
      >
        {/* Header */}
        <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">{t('settings', currentLang)}</h2>
              <p className="text-xs text-slate-300">GovTech Display, GIS & Multilingual Settings</p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-sm">
          
          {/* Municipal Grid Status Card */}
          <div className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Municipal Cloud Grid</p>
                <p className="text-[11px] text-slate-500">Live Scoped Redressal Active</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'TESTING'}
              className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2.5 py-1 rounded-full border border-emerald-300 transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${testStatus === 'TESTING' ? 'animate-spin' : ''}`} />
              <span>{testStatus === 'SUCCESS' ? 'Verified ✓' : 'Online ✓'}</span>
            </button>
          </div>

          {/* Test Status Banner */}
          {testStatus !== 'IDLE' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              testStatus === 'TESTING' 
                ? 'bg-blue-50 border-blue-200 text-blue-900' 
                : testStatus === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {testStatus === 'TESTING' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
              {testStatus === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {testStatus === 'ERROR' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-semibold">{testMessage}</span>
            </div>
          )}

          {/* User Preferences Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              System Preferences
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              
              {/* 1. App Language (English / Hindi / Telugu) */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#115e59] flex items-center justify-center shrink-0">
                    <Languages className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{t('language', currentLang)}</p>
                    <p className="text-[11px] text-slate-500">
                      {currentLang === 'hi' ? 'हिन्दी (Hindi)' : currentLang === 'te' ? 'తెలుగు (Telugu)' : 'English (Default)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        currentLang === lang.code
                          ? 'bg-[#0f172a] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      {lang.nativeLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Display Theme (GovTech Light Standard) */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Display Theme</p>
                    <p className="text-[11px] text-slate-500">
                      Standard GovTech Clean Light Mode
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200">
                  Clean Light (Active)
                </span>
              </div>

              {/* 3. Map GIS Style */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Map className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Map GIS Style</p>
                    <p className="text-[11px] text-slate-500">
                      Using <strong className="text-slate-700 capitalize">{preferences.mapTheme}</strong> GIS map view
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences(prev => {
                    const next = { ...prev, mapTheme: prev.mapTheme === 'light' ? 'satellite' as const : 'light' as const };
                    try { localStorage.setItem('swachhata_user_preferences', JSON.stringify(next)); } catch {}
                    return next;
                  })}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                >
                  {preferences.mapTheme === 'light' ? 'Street Light' : 'Satellite'}
                </button>
              </div>

              {/* 4. High Precision GPS */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">High Precision GPS</p>
                    <p className="text-[11px] text-slate-500">
                      {preferences.locationPrecision === 'high' ? 'High accuracy satellite coordinates' : 'Standard sector snapping'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences(prev => {
                    const next = { ...prev, locationPrecision: prev.locationPrecision === 'high' ? 'standard' as const : 'high' as const };
                    try { localStorage.setItem('swachhata_user_preferences', JSON.stringify(next)); } catch {}
                    return next;
                  })}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                >
                  {preferences.locationPrecision === 'high' ? 'High Accuracy' : 'Standard'}
                </button>
              </div>

              {/* 5. Notification Alerts */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#115e59] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Notification Alerts</p>
                    <p className="text-[11px] text-slate-500">Receive real-time updates on repair progress</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref('pushNotifications')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    preferences.pushNotifications ? 'bg-[#0f172a]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      preferences.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 6. Sound Alerts */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Audio Alerts</p>
                    <p className="text-[11px] text-slate-500">Play confirmation chime on status changes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref('soundAlerts')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    preferences.soundAlerts ? 'bg-[#0f172a]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      preferences.soundAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Preferences saved and applied successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
          <button
            id="save-settings-btn"
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-[#0f172a] hover:bg-[#1e293b] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
