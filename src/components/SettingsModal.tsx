import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Sparkles, 
  Trash2,
  Bell,
  Map,
  Compass,
  Volume2,
  Radio,
  Sun,
  Moon
} from 'lucide-react';
import { 
  getGeminiApiKey, 
  setGeminiApiKey, 
  clearCustomApiKeys, 
  hasGeminiApiKey 
} from '../config/keys';
import { pingFirestoreHealthCheck } from '../services/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export interface AppPreferences {
  theme: 'light' | 'dark';
  pushNotifications: boolean;
  mapTheme: 'light' | 'dark';
  locationPrecision: 'high' | 'standard';
  soundAlerts: boolean;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'light',
  pushNotifications: true,
  mapTheme: 'light',
  locationPrecision: 'high',
  soundAlerts: true
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    try {
      const saved = localStorage.getItem('swachhata_user_preferences');
      return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(getGeminiApiKey());
      setSavedSuccess(false);
      setTestStatus('IDLE');
      setTestMessage('');
      try {
        const saved = localStorage.getItem('swachhata_user_preferences');
        if (saved) setPreferences(JSON.parse(saved));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    const updated = { ...preferences, theme: newTheme, mapTheme: newTheme };
    setPreferences(updated);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    try {
      localStorage.setItem('swachhata_user_preferences', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist preferences:', e);
    }
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const handleSave = () => {
    setGeminiApiKey(geminiKey.trim());
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
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
    }, 2500);
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestMessage('Pinging Municipal Cloud Grid...');
    try {
      const result = await pingFirestoreHealthCheck();
      if (result.ok) {
        setTestStatus('SUCCESS');
        setTestMessage(`Connected to Municipal Grid ✓ (${result.latencyMs}ms)`);
      } else {
        setTestStatus('ERROR');
        setTestMessage('Sync Offline ⚠️');
      }
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage('Sync Offline ⚠️');
    }
  };

  const handleResetDefaults = () => {
    clearCustomApiKeys();
    setGeminiKey('');
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem('swachhata_user_preferences');
    } catch {}
    setSavedSuccess(true);
    setTestStatus('IDLE');
    setTestMessage('Reset to system defaults.');
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const togglePref = (key: keyof AppPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
    }));
  };

  const hasKey = Boolean(geminiKey.trim() || hasGeminiApiKey());

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
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#2d7a70] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Sliders className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Application Preferences & Settings</h2>
              <p className="text-xs text-teal-100/90">Configure UI preferences, notifications, and AI vision key</p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          
          {/* Real-time Connection Status Card */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Municipal Grid Status</p>
                <p className="text-[11px] text-slate-500">Live Scoped Synchronization Active</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
              Online ✓
            </span>
          </div>

          {/* Section 1: User Preferences Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              App Preferences
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {/* Interface Theme Mode (Light / Dark) */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4 dark:hidden" />
                    <Moon className="w-4 h-4 hidden dark:block" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Interface Theme</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Currently using <strong className="capitalize">{preferences.theme} Mode</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      preferences.theme === 'light'
                        ? 'bg-white text-[#0d5c52] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      preferences.theme === 'dark'
                        ? 'bg-slate-900 text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* Push Notifications Toggle */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#2d7a70] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Push Notifications</p>
                    <p className="text-[11px] text-slate-500">Receive alerts on hazard triage & remediation progress</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref('pushNotifications')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    preferences.pushNotifications ? 'bg-[#2d7a70]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      preferences.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Map Theme Toggle */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Map className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Dark / Light Map Default</p>
                    <p className="text-[11px] text-slate-500">
                      Currently using <strong className="text-slate-700 capitalize">{preferences.mapTheme}</strong> style GIS map
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences(prev => ({ ...prev, mapTheme: prev.mapTheme === 'light' ? 'dark' : 'light' }))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                >
                  {preferences.mapTheme === 'light' ? 'Light Standard' : 'Dark Tactical'}
                </button>
              </div>

              {/* Location Precision Toggle */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Location Precision</p>
                    <p className="text-[11px] text-slate-500">
                      {preferences.locationPrecision === 'high' ? 'High Precision GPS coordinates' : 'Standard sector snapping'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences(prev => ({ ...prev, locationPrecision: prev.locationPrecision === 'high' ? 'standard' : 'high' }))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                >
                  {preferences.locationPrecision === 'high' ? 'High Accuracy' : 'Standard'}
                </button>
              </div>

              {/* Sound Alerts */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Sound Notifications</p>
                    <p className="text-[11px] text-slate-500">Play audio chime on high-priority dispatches</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref('soundAlerts')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    preferences.soundAlerts ? 'bg-[#2d7a70]' : 'bg-slate-300'
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

          {/* Section 2: Optional Custom Automated Vision Service Key */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Automated Vision Triage Service Key (Optional)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {hasKey ? 'Configured ✓' : 'Default Server Engine'}
              </span>
            </div>
            
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use server environment default)"
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Provides automated image classification and anomaly detection for citizen road hazard grievances.
            </p>
          </div>

          {/* Test Connection Diagnostic Banner */}
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
              <span className="font-bold">{testMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Preferences saved and applied successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'TESTING'}
              className="px-3 py-2 text-xs text-teal-800 hover:bg-teal-50 border border-teal-200 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'TESTING' ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>

          <div className="flex items-center gap-2">
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
              className="px-5 py-2 text-xs font-bold text-white bg-[#2d7a70] hover:bg-[#24625a] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
